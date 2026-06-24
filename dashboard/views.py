from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView


class DashboardTemplateView(LoginRequiredMixin, TemplateView):
    template_name = 'dashboard.html'


class RestaurantTemplateView(LoginRequiredMixin, TemplateView):
    template_name = 'restaurantes.html'


class ProductTemplateView(LoginRequiredMixin, TemplateView):
    template_name = 'produtos.html'


class OrdersTemplateView(LoginRequiredMixin, TemplateView):
    template_name = 'pedidos.html'
