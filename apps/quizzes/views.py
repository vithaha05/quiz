from rest_framework import viewsets, permissions, status, filters, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.cache import cache
from django.db import transaction
from .models import Quiz, Question
from .serializers import QuizSerializer, QuestionSerializer, QuizCreateSerializer
from .services.ai_service import AIService

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.filter(is_active=True).select_related('created_by').prefetch_related('questions')
    serializer_class = QuizSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'topic']
    ordering_fields = ['created_at', 'difficulty']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        # Cache for 5 minutes
        cache_key = f"quiz_list_page_{request.query_params.get('page', 1)}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 300)
        return response

    def perform_create(self, serializer):
        quiz = serializer.save(created_by=self.request.user, ai_provider=getattr(AIService(), 'provider', 'None'))
        
        # Trigger AI Generation
        ai_service = AIService()
        try:
            with transaction.atomic():
                questions_data = ai_service.generate_questions(
                    quiz.topic, quiz.difficulty, quiz.question_count
                )
                questions = [
                    Question(
                        quiz=quiz,
                        question_text=q['question_text'],
                        option_a=q['option_a'],
                        option_b=q['option_b'],
                        option_c=q['option_c'],
                        option_d=q['option_d'],
                        correct_option=q['correct_option'],
                        explanation=q.get('explanation', ''),
                        order=q.get('order', i)
                    ) for i, q in enumerate(questions_data, start=1)
                ]
                Question.objects.bulk_create(questions)
            # Invalidate cache
            if hasattr(cache, 'delete_pattern'):
                cache.delete_pattern("quiz_list_page_*")
            else:
                cache.clear()  # Fallback for LocMemCache in dev
        except Exception as e:
            # Cleanup quiz if generation fails
            quiz.delete()
            raise serializers.ValidationError({
                "error": True,
                "message": f"AI Question Generation failed: {str(e)}",
            })

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern("quiz_list_page_*")
        else:
            cache.clear()

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        quiz = self.get_object()
        questions = quiz.questions.all()
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)
