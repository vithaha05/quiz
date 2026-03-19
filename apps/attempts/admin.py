from django.contrib import admin
from .models import QuizAttempt, AttemptAnswer

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz', 'score', 'status', 'started_at', 'completed_at')
    list_filter = ('status', 'quiz')
    search_fields = ('user__email', 'quiz__title')

@admin.register(AttemptAnswer)
class AttemptAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question', 'selected_option', 'is_correct', 'answered_at')
    list_filter = ('is_correct',)
