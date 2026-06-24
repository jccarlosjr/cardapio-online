from rest_framework import viewsets
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from .models import Category, Product, ProductImage, ProductOptionGroup, ProductOption
from .serializers import CategorySerializer, ProductSerializer, ProductImageSerializer, ProductOptionGroupSerializer, ProductOptionSerializer
from rest_framework.permissions import IsAuthenticated
from app.mixins import IsAdministradorOrGerenteOrReadOnly


def _return_same_restaurant_queryset(request, queryset):
    if request.user.is_superuser and not request.user.restaurant:
        restaurant_id = request.query_params.get('restaurant_id')
        if restaurant_id is not None:
            return queryset.filter(restaurant_id=restaurant_id)
    return queryset.filter(restaurant_id=request.user.restaurant.id)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdministradorOrGerenteOrReadOnly]

    def get_queryset(self):
        return _return_same_restaurant_queryset(
            self.request,
            self.queryset
        )

    def perform_create(self, serializer):
        serializer.save(
            restaurant=self.request.user.restaurant
        )


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdministradorOrGerenteOrReadOnly]

    def get_queryset(self):
        queryset = _return_same_restaurant_queryset(
            self.request,
            self.queryset
        )
        category_id = self.request.query_params.get('category_id')
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(
            restaurant=self.request.user.restaurant
        )


class ProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdministradorOrGerenteOrReadOnly]


class ProductOptionGroupViewSet(viewsets.ModelViewSet):
    queryset = ProductOptionGroup.objects.all()
    serializer_class = ProductOptionGroupSerializer
    permission_classes = [IsAdministradorOrGerenteOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_superuser and not hasattr(self.request.user, 'restaurant'):
            return self.queryset
        return self.queryset.filter(product__restaurant=self.request.user.restaurant)


class ProductOptionViewSet(viewsets.ModelViewSet):
    queryset = ProductOption.objects.all()
    serializer_class = ProductOptionSerializer
    permission_classes = [IsAdministradorOrGerenteOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_superuser and not hasattr(self.request.user, 'restaurant'):
            return self.queryset
        return self.queryset.filter(group__product__restaurant=self.request.user.restaurant)


from django.shortcuts import get_object_or_404
from restaurants.models import Restaurant
from datetime import datetime

class RestaurantMenuView(TemplateView):
    template_name = 'catalog/menu.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        restaurant_slug = self.kwargs.get('restaurant_slug')
        restaurant = get_object_or_404(Restaurant, slug=restaurant_slug, is_active=True)
        
        categories = restaurant.categories.all().order_by('order')
        for category in categories:
            category.active_products = category.products.filter(is_active=True).prefetch_related('images', 'option_groups__options')

        # Calculate if open
        python_weekday = datetime.now().weekday()
        django_weekday = (python_weekday + 1) % 7
        
        now_time = datetime.now().time()
        business_hour = restaurant.business_hours.filter(day_of_week=django_weekday).first()
        
        is_open = False
        if business_hour and not business_hour.is_closed:
            if business_hour.open_time and business_hour.close_time:
                if business_hour.open_time <= business_hour.close_time:
                    is_open = business_hour.open_time <= now_time <= business_hour.close_time
                else: # Overnight
                    is_open = now_time >= business_hour.open_time or now_time <= business_hour.close_time

        context['restaurant'] = restaurant
        context['categories'] = categories
        context['is_open'] = is_open
        context['settings'] = getattr(restaurant, 'settings', None)
        return context
