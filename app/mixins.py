from django.contrib.auth.mixins import AccessMixin
from django.core.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


# ==========================================
# PERMISSÕES BASE DRF (APIViews / ViewSets)
# ==========================================

class RolePermission(BasePermission):
    """
    Classe base para verificar se o usuário possui a role informada.
    """
    allowed_roles = []

    def __init__(self, allowed_roles=None):
        if allowed_roles is not None:
            self.allowed_roles = allowed_roles

    from rest_framework.exceptions import NotAuthenticated

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated
            raise NotAuthenticated("O usuário não está autenticado.")
        
        if request.user.is_superuser:
            return True

        if not hasattr(request.user, 'role') or not request.user.role:
            return False
            
        return request.user.role.name in self.allowed_roles


class IsAdministrador(RolePermission):
    allowed_roles = ['administrador']


class IsGerente(RolePermission):
    allowed_roles = ['gerente']


class IsAtendente(RolePermission):
    allowed_roles = ['atendente']


class IsAdministradorOrGerente(RolePermission):
    allowed_roles = ['administrador', 'gerente']


from rest_framework import permissions

class RolePermissionOrReadOnly(RolePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return super().has_permission(request, view)


class IsAdministradorOrGerenteOrReadOnly(RolePermissionOrReadOnly):
    allowed_roles = ['administrador', 'gerente']


# ==========================================
# MIXINS DJANGO VIEWS (TemplateViews etc)
# ==========================================

class RoleRequiredMixin(AccessMixin):
    allowed_roles = []

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()

        if request.user.is_superuser:
            return super().dispatch(request, *args, **kwargs)

        if not hasattr(request.user, 'role') or not request.user.role or request.user.role.name not in self.allowed_roles:
            raise PermissionDenied("Você não tem permissão para acessar esta página.")
            
        return super().dispatch(request, *args, **kwargs)


class AdministradorRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['administrador']


class GerenteRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['gerente']


class AtendenteRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['atendente']


class AdministradorOrGerenteRequiredMixin(RoleRequiredMixin):
    allowed_roles = ['administrador', 'gerente']


# ==========================================
# LEGADO (Mantido para compatibilidade)
# ==========================================

class IsAdminUserCustom(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff


class IsStaffPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff


class AdminRequiredMixin(AccessMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()

        if not request.user.is_superuser:
            raise PermissionDenied("Você não tem permissão para acessar esta página.")
        return super().dispatch(request, *args, **kwargs)


class StaffRequiredMixin(AccessMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()

        if not request.user.is_staff:
            raise PermissionDenied("Você não tem permissão para acessar esta página.")
        return super().dispatch(request, *args, **kwargs)
