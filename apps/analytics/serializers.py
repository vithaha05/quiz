from rest_framework import serializers
from .models import UserAnalytics

class UserAnalyticsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserAnalytics
        fields = '__all__'
