from django.urls import path
from .views import UserAnalyticsMeView, quiz_analytics, admin_user_list, admin_quiz_list

urlpatterns = [
    path('me/', UserAnalyticsMeView.as_view(), name='analytics-me'),
    path('quizzes/<int:pk>/', quiz_analytics, name='quiz-analytics'),
]
