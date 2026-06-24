from rest_framework import viewsets
from .models import Restaurant, RestaurantSettings, BusinessHours
from .serializers import RestaurantSerializer, RestaurantSettingsSerializer, BusinessHoursSerializer
from rest_framework.permissions import IsAuthenticated
from app.mixins import IsAdministrador, IsAdministradorOrGerente


def _return_same_restaurant_queryset(request):
    if request.user.is_superuser and not request.user.restaurant:
        return Restaurant.objects.all()
    return Restaurant.objects.filter(id=request.user.restaurant.id)


class RestaurantViewSet(viewsets.ModelViewSet):
    queryset = Restaurant.objects.all()
    serializer_class = RestaurantSerializer
    permission_classes = [IsAdministrador]

    def get_queryset(self):
        return _return_same_restaurant_queryset(self.request)


class RestaurantSettingsViewSet(viewsets.ModelViewSet):
    queryset = RestaurantSettings.objects.all()
    serializer_class = RestaurantSettingsSerializer
    permission_classes = [IsAdministrador]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_superuser and not self.request.user.restaurant:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if restaurant_id is not None:
                return queryset.filter(restaurant_id=restaurant_id)
        return queryset.filter(restaurant_id=self.request.user.restaurant.id)


class BusinessHoursSettingsViewSet(viewsets.ModelViewSet):
    queryset = BusinessHours.objects.all()
    serializer_class = BusinessHoursSerializer
    permission_classes = [IsAdministradorOrGerente]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_superuser and not self.request.user.restaurant:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if restaurant_id is not None:
                return queryset.filter(restaurant_id=restaurant_id)
        return queryset.filter(restaurant_id=self.request.user.restaurant.id)
