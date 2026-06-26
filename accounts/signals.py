from django.db.models.signals import post_migrate

def create_default_roles(sender, **kwargs):
    from django.contrib.auth.models import Group, Permission
    
    all_models = [
        'customuser', 'usersession', 'restaurant', 'restaurantsettings', 
        'businesshours', 'category', 'product', 'productimage', 'productoptiongroup', 
        'productoption', 'customer', 'address', 'order', 'orderitem', 
        'orderstatushistory', 'cart', 'cartitem'
    ]

    roles_perms = {
        'atendente': {
            'view': all_models,
            'add': [
                'category', 'product', 'productimage', 'productoptiongroup',
                'productoption', 'customer', 'address', 'order',
                'orderitem', 'orderstatushistory'
            ],
            'change': [
                'category', 'product', 'productimage', 'productoptiongroup',
                'productoption', 'customer', 'address', 'order',
                'orderitem', 'orderstatushistory'
            ],
            'delete': []
        },
        'gerente': {
            'view': all_models,
            'add': [
                'customuser', 'restaurantsettings', 'businesshours', 'category', 'product',
                'productimage', 'productoptiongroup', 'productoption', 'customer', 'address',
                'order', 'orderitem', 'orderstatushistory'
            ],
            'change': [
                'customuser', 'restaurantsettings', 'businesshours', 'category', 'product',
                'productimage', 'productoptiongroup', 'productoption', 'customer', 'address',
                'order', 'orderitem', 'orderstatushistory'
            ],
            'delete': [
                'businesshours', 'category', 'product', 'productimage',
                'productoptiongroup', 'productoption'
            ]
        },
        'administrador': {
            'view': all_models,
            'add': [
                'customuser', 'restaurantsettings', 'businesshours', 'category', 'product',
                'productimage', 'productoptiongroup', 'productoption', 'customer', 'address',
                'order', 'orderitem', 'orderstatushistory'
            ],
            'change': [
                'customuser', 'restaurant', 'restaurantsettings', 'businesshours', 'category', 'product',
                'productimage', 'productoptiongroup', 'productoption', 'customer', 'address',
                'order', 'orderitem', 'orderstatushistory'
            ],
            'delete': [
                'customuser', 'businesshours', 'category', 'product', 'productimage',
                'productoptiongroup', 'productoption'
            ]
        }
    }

    for role_name, perms in roles_perms.items():
        group, _ = Group.objects.get_or_create(name=role_name)

        codenames = []
        for action, models in perms.items():
            for model in models:
                codenames.append(f"{action}_{model}")

        permissions = Permission.objects.filter(codename__in=codenames)
        if permissions.exists():
            group.permissions.set(permissions)

