from django.db import models
from django.conf import settings

class UserAnalytics(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='analytics')
    total_attempts = models.PositiveIntegerField(default=0)
    total_quizzes_completed = models.PositiveIntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    best_score = models.FloatField(default=0.0)
    total_questions_answered = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Analytics for {self.user.username}"
