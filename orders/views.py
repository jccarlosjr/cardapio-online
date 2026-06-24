from rest_framework import viewsets
from .models import Order, OrderItem, OrderStatusHistory
from .serializers import OrderSerializer, OrderItemSerializer, OrderStatusHistorySerializer
from rest_framework.permissions import IsAuthenticated


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset

        if self.request.user.is_superuser and not self.request.user.restaurant:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if restaurant_id is not None:
                queryset = queryset.filter(restaurant_id=restaurant_id)
        else:
            queryset = queryset.filter(restaurant=self.request.user.restaurant)
            
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset.order_by('-created_at')


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset
        if self.request.user.is_superuser and not self.request.user.restaurant:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if restaurant_id is not None:
                queryset = queryset.filter(order__restaurant_id=restaurant_id)
        else:
            queryset = queryset.filter(order__restaurant=self.request.user.restaurant)
        return queryset


class OrderStatusHistoryViewSet(viewsets.ModelViewSet):
    queryset = OrderStatusHistory.objects.all()
    serializer_class = OrderStatusHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset
        if self.request.user.is_superuser and not self.request.user.restaurant:
            restaurant_id = self.request.query_params.get('restaurant_id')
            if restaurant_id is not None:
                queryset = queryset.filter(order__restaurant_id=restaurant_id)
        else:
            queryset = queryset.filter(order__restaurant=self.request.user.restaurant)
        return queryset

