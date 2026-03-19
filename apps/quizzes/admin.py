from django.contrib import admin
from .models import Quiz, Question

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'topic', 'difficulty', 'question_count', 'created_by', 'is_active', 'created_at')
    list_filter = ('difficulty', 'is_active', 'topic')
    search_fields = ('title', 'topic')
    actions = ['activate_quizzes', 'deactivate_quizzes']

    def activate_quizzes(self, request, queryset):
        queryset.update(is_active=True)
    activate_quizzes.short_description = "Mark selected quizzes as active"

    def deactivate_quizzes(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_quizzes.short_description = "Mark selected quizzes as inactive"

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'quiz', 'correct_option', 'order')
    list_filter = ('quiz',)
    search_fields = ('question_text',)
