from rest_framework import serializers
from .models import UserAnalytics

class UserAnalyticsSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserAnalytics
        fields = '__all__'
