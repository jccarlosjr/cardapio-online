from django.contrib.auth.views import LoginView
from .forms import CustomAuthenticationForm
from rest_framework import viewsets
from .models import CustomUser, Role
from .serializers import CustomUserSerializer, RoleSerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView


def _return_same_restaurant_queryset(request, queryset):
    if request.user.is_superuser and not request.user.restaurant:
        restaurant_id = request.query_params.get('restaurant_id')
        if restaurant_id is not None:
            return queryset.filter(restaurant_id=restaurant_id)
    return queryset.filter(restaurant_id=request.user.restaurant.id)


class CustomLoginView(LoginView):
    template_name = 'login.html'
    form_class = CustomAuthenticationForm

    def form_valid(self, form):
        remember_me = self.request.POST.get("remember_me")
        if not remember_me:
            self.request.session.set_expiry(0)
        else:
            self.request.session.set_expiry(60 * 60 * 24 * 15)
        return super().form_valid(form)


class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated,]

    def get_queryset(self):
        return _return_same_restaurant_queryset(
            self.request,
            self.queryset
        )

    def perform_create(self, serializer):
        serializer.save(
            restaurant=self.request.user.restaurant
        )


class CustomUserTemplate(LoginRequiredMixin, TemplateView):
    template_name = 'users.html'


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
