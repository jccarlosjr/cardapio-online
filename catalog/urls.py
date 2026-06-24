from django.urls import path
from catalog import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/categories', views.CategoryViewSet)
router.register(r'api/products', views.ProductViewSet)
router.register(r'api/product-images', views.ProductImageViewSet)
router.register(r'api/product-option-groups', views.ProductOptionGroupViewSet)
router.register(r'api/product-options', views.ProductOptionViewSet)

urlpatterns = [
    path('menu/<slug:restaurant_slug>/', views.RestaurantMenuView.as_view(), name='restaurant_menu'),
] + router.urls

