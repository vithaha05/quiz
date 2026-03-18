from django.db.models import Avg, Max
from .models import UserAnalytics
from apps.attempts.models import QuizAttempt, AttemptAnswer

class AnalyticsService:
    @staticmethod
    def update_user_analytics(user):
        analytics, created = UserAnalytics.objects.get_or_create(user=user)
        
        attempts = QuizAttempt.objects.filter(user=user, status='completed')
        
        analytics.total_attempts = QuizAttempt.objects.filter(user=user).count()
        analytics.total_quizzes_completed = attempts.count()
        
        if analytics.total_quizzes_completed > 0:
            analytics.average_score = attempts.aggregate(Avg('score'))['score__avg'] or 0.0
            analytics.best_score = attempts.aggregate(Max('score'))['score__max'] or 0.0
        
        all_answers = AttemptAnswer.objects.filter(attempt__user=user)
        analytics.total_questions_answered = all_answers.count()
        analytics.correct_answers = all_answers.filter(is_correct=True).count()
        
        analytics.save()
        return analytics
