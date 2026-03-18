from rest_framework import serializers
from .models import QuizAttempt, AttemptAnswer
from apps.quizzes.models import Question

class AttemptAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttemptAnswer
        fields = ('id', 'question', 'selected_option', 'is_correct', 'answered_at')
        read_only_fields = ('id', 'is_correct', 'answered_at')

class QuizAttemptSerializer(serializers.ModelSerializer):
    answers = AttemptAnswerSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ('id', 'quiz', 'quiz_title', 'started_at', 'completed_at', 'score', 'status', 'answers')
        read_only_fields = ('id', 'started_at', 'completed_at', 'score', 'status')
