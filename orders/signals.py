from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Order

@receiver(post_save, sender=Order)
def order_post_save(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        
        event_data = {
            'type': 'new_order',
            'order_id': instance.id,
            'restaurant_id': instance.restaurant.id if instance.restaurant else None,
            'status': instance.status
        }
        
        # Enviar para o dashboard de todos os restaurantes
        async_to_sync(channel_layer.group_send)(
            'dashboard_orders_all',
            event_data
        )
        
        # Enviar para o dashboard do restaurante específico
        if instance.restaurant:
            async_to_sync(channel_layer.group_send)(
                f'dashboard_orders_{instance.restaurant.id}',
                event_data
            )
