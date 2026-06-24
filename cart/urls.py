from django.urls import path
from cart import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/cart', views.CartViewSet)
router.register(r'api/cart-item', views.CartItemViewSet)

urlpatterns = router.urls