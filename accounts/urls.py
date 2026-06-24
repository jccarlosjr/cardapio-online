from . import views
from django.urls import path
from django.contrib.auth import views as auth_views
from django.urls import path
from rest_framework import routers

router = routers.DefaultRouter()
router.register(r'api/accounts', views.CustomUserViewSet)
router.register(r'api/roles', views.RoleViewSet)

urlpatterns = [
    path('login/', views.CustomLoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('users/', views.CustomUserTemplate.as_view(), name='users'),
]

urlpatterns += router.urls