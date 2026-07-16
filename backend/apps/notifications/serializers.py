from rest_framework import serializers
from .models import DeviceToken


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['token', 'platform']

    def create(self, validated_data):
        user = self.context['request'].user
        token, created = DeviceToken.objects.update_or_create(
            user=user,
            token=validated_data['token'],
            defaults={
                'platform': validated_data.get('platform', 'android'),
                'is_active': True,
            },
        )
        return token
