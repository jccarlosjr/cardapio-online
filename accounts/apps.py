from django.apps import AppConfig
from accounts.signals import create_default_roles
from django.db.models.signals import post_migrate


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        post_migrate.connect(create_default_roles, sender=self)
