from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractUser
from restaurants.models import Restaurant


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email: raise ValueError("Email required")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password); user.save(); return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.update({'is_staff': True, 'is_superuser': True})
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.SET_NULL, null=True, blank=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = CustomUserManager()
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'


class UserSession(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=100)
    login_time = models.DateTimeField(auto_now_add=True)
    logout_time = models.DateTimeField(null=True, blank=True)
