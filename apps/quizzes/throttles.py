from rest_framework.throttling import UserRateThrottle


class AIQuizCreationThrottle(UserRateThrottle):
    """
    Limits how many quizzes a user can create per day
    to prevent excessive AI API usage.
    Rate: 5 quiz creations per hour per user.
    """
    scope = 'ai_quiz_creation'
