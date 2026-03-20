from rest_framework import serializers
from .models import Quiz, Question

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = Quiz
        fields = ('id', 'title', 'topic', 'difficulty', 'question_count', 'created_by_email', 'is_active', 'ai_provider', 'created_at', 'updated_at', 'questions')
        read_only_fields = ('id', 'created_by', 'ai_provider', 'created_at', 'updated_at')

class QuizCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ('title', 'topic', 'difficulty', 'question_count')
