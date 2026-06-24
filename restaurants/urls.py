from restaurants import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/restaurants', views.RestaurantViewSet)
router.register(r'api/settings', views.RestaurantSettingsViewSet)
router.register(r'api/business-hours', views.BusinessHoursSettingsViewSet)

urlpatterns = router.urls
