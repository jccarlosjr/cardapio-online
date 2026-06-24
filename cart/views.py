from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer
from rest_framework import viewsets
from rest_framework.permissions import AllowAny


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        session_key = self.request.query_params.get('session_key') or self.request.headers.get('X-Session-Key')
        if session_key:
            return self.queryset.filter(session_key=session_key)
        if self.request.user.is_authenticated:
            return self.queryset
        return self.queryset.none()


class CartItemViewSet(viewsets.ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        session_key = self.request.query_params.get('session_key') or self.request.headers.get('X-Session-Key')
        if session_key:
            return self.queryset.filter(cart__session_key=session_key)
        if self.request.user.is_authenticated:
            return self.queryset
        return self.queryset.none()

