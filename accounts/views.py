from django.contrib.auth.views import LoginView
from .forms import CustomAuthenticationForm
from rest_framework import viewsets
from django.contrib.auth.models import Group
from .models import CustomUser
from .serializers import CustomUserSerializer, GroupSerializer
from rest_framework.permissions import IsAuthenticated
from app.permissions import GlobalDefaultPermission, return_same_restaurant_queryset
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView



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
    permission_classes = (IsAuthenticated, GlobalDefaultPermission)

    def get_queryset(self):
        return return_same_restaurant_queryset(
            self.request,
            self.queryset
        )

    def perform_create(self, serializer):
        serializer.save(
            restaurant=self.request.user.restaurant
        )


class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = (IsAuthenticated,)


class CustomUserTemplate(LoginRequiredMixin, TemplateView):
    template_name = 'users.html'
