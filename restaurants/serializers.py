from .models import Restaurant, RestaurantSettings, BusinessHours
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator


class RestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = '__all__'


class RestaurantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantSettings
        fields = '__all__'


class BusinessHoursSerializer(serializers.ModelSerializer):

    class Meta:
        model = BusinessHours
        fields = '__all__'

        validators = [
            UniqueTogetherValidator(
                queryset=BusinessHours.objects.all(),
                fields=['restaurant', 'day_of_week'],
                message='Este restaurante já possui horário cadastrado para este dia.'
            )
        ]

    def validate(self, attrs):
        restaurant = attrs.get('restaurant')
        day_of_week = attrs.get('day_of_week')

        qs = BusinessHours.objects.filter(
            restaurant=restaurant,
            day_of_week=day_of_week
        )

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError({
                'day_of_week': 'Este restaurante já possui horário cadastrado para este dia.'
            })

        return attrs