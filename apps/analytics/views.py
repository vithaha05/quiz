from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Avg, Count
from .models import UserAnalytics
from .serializers import UserAnalyticsSerializer
from apps.attempts.models import QuizAttempt
from apps.quizzes.models import Quiz
from django.contrib.auth import get_user_model

User = get_user_model()

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class UserAnalyticsMeView(generics.RetrieveAPIView):
    serializer_class = UserAnalyticsSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        obj, created = UserAnalytics.objects.get_or_create(user=self.request.user)
        return obj

@api_view(['GET'])
@permission_classes([IsAdminUser])
def quiz_analytics(request, pk):
    try:
        quiz = Quiz.objects.get(id=pk)
        attempts = QuizAttempt.objects.filter(quiz=quiz, status='completed')
        
        data = {
            "quiz_id": quiz.id,
            "title": quiz.title,
            "total_attempts": QuizAttempt.objects.filter(quiz=quiz).count(),
            "completed_attempts": attempts.count(),
            "average_score": attempts.aggregate(Avg('score'))['score__avg'] or 0.0,
            "highest_score": attempts.aggregate(Avg('score'))['score__avg'] or 0.0, # aggregate bug, should be Max
        }
        # Correcting the bug
        from django.db.models import Max
        data["highest_score"] = attempts.aggregate(Max('score'))['score__max'] or 0.0
        
        return Response(data)
    except Quiz.DoesNotExist:
        return Response({"error": True, "message": "Quiz not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_list(request):
    users = User.objects.all()
    # Simple list for demo
    from apps.users.serializers import UserSerializer
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_quiz_list(request):
    quizzes = Quiz.objects.all()
    from apps.quizzes.serializers import QuizSerializer
    serializer = QuizSerializer(quizzes, many=True)
    return Response(serializer.data)
