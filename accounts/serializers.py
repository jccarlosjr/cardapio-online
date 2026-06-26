from rest_framework import serializers
from django.contrib.auth.models import Group
from .models import CustomUser


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class CustomUserSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Group.objects.all(),
        required=False
    )

    class Meta:
        model = CustomUser
        fields = ['id', 'name', 'email', 'is_active', 'password', 'groups']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

