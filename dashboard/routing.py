from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/dashboard/orders/(?P<restaurant_id>\w+)/$', consumers.OrderConsumer.as_asgi()),
]
