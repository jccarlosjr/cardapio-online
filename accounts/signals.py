from django.db.models.signals import post_migrate

def create_default_roles(sender, **kwargs):
    from .models import Role
    roles = ['administrador', 'gerente', 'atendente']
    for role_name in roles:
        Role.objects.get_or_create(name=role_name)
