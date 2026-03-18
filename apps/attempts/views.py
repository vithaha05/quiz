from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.utils import timezone
from .models import QuizAttempt, AttemptAnswer
from .serializers import QuizAttemptSerializer, AttemptAnswerSerializer
from apps.quizzes.models import Quiz, Question
from apps.analytics.services import AnalyticsService

class AttemptViewSet(viewsets.ModelViewSet):
    serializer_class = QuizAttemptSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return QuizAttempt.objects.filter(user=self.request.user).prefetch_related('answers')

    @decorators.action(detail=False, methods=['post'], url_path='start/(?P<quiz_id>\d+)')
    def start(self, request, quiz_id=None):
        try:
            quiz = Quiz.objects.get(id=quiz_id, is_active=True)
            attempt = QuizAttempt.objects.create(user=request.user, quiz=quiz)
            return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)
        except Quiz.DoesNotExist:
            return Response({"error": True, "message": "Quiz not found"}, status=status.HTTP_404_NOT_FOUND)

    @decorators.action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        attempt = self.get_object()
        if attempt.status != 'in_progress':
            return Response({"error": True, "message": "Attempt already closed"}, status=status.HTTP_400_BAD_REQUEST)
        
        question_id = request.data.get('question_id')
        selected_option = request.data.get('selected_option')
        
        try:
            question = Question.objects.get(id=question_id, quiz=attempt.quiz)
            is_correct = (selected_option == question.correct_option)
            
            answer, created = AttemptAnswer.objects.update_or_create(
                attempt=attempt, question=question,
                defaults={'selected_option': selected_option, 'is_correct': is_correct}
            )
            
            return Response(AttemptAnswerSerializer(answer).data)
        except Question.DoesNotExist:
            return Response({"error": True, "message": "Question not found in this quiz"}, status=status.HTTP_404_NOT_FOUND)

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        attempt = self.get_object()
        if attempt.status != 'in_progress':
            return Response({"error": True, "message": "Attempt already closed"}, status=status.HTTP_400_BAD_REQUEST)
        
        total_questions = attempt.quiz.question_count
        correct_answers = attempt.answers.filter(is_correct=True).count()
        
        attempt.score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        attempt.status = 'completed'
        attempt.completed_at = timezone.now()
        attempt.save()
        
        # Update Analytics
        AnalyticsService.update_user_analytics(request.user)
        
        return Response(QuizAttemptSerializer(attempt).data)
