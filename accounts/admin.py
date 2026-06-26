from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


class CustomUserAdmin(UserAdmin):
    ordering = ['email']

    list_display = [
        'email', 'is_active', 'restaurant',
        'is_staff', 'is_superuser',
        ]

    fieldsets = (
        (None, {'fields': ('password', 'restaurant')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)
