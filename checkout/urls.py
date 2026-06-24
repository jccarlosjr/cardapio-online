from checkout import views
from rest_framework import routers
from django.urls import path

router = routers.DefaultRouter()
router.register(r'api/customers', views.CustomerViewSet)
router.register(r'api/addresses', views.AdressViewSet)

urlpatterns = [
    path('api/public/checkout/', views.PublicCheckoutView.as_view(), name='public_checkout'),
] + router.urls