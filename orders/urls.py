from orders import views
from rest_framework import routers

router = routers.DefaultRouter()
router.register(r'api/order', views.OrderViewSet)
router.register(r'api/orderitem', views.OrderItemViewSet)
router.register(r'api/orderstatus', views.OrderStatusHistoryViewSet)

urlpatterns = router.urls