from dashboard import views
from django.urls import path

urlpatterns = [
    path('', views.DashboardTemplateView.as_view(), name='home'),
    path('restaurants/', views.RestaurantTemplateView.as_view(), name='restaurants'),
    path('products/', views.ProductTemplateView.as_view(), name='products'),
    path('orders/', views.OrdersTemplateView.as_view(), name='orders'),
]
