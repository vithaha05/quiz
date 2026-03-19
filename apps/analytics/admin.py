from django.contrib import admin
from .models import UserAnalytics

@admin.register(UserAnalytics)
class UserAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_attempts', 'avg_score', 'best_score', 'total_questions_answered')
    search_fields = ('user__email',)
