import json
from channels.generic.websocket import AsyncWebsocketConsumer

class OrderConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        restaurant_id = self.scope['url_route']['kwargs']['restaurant_id']
        
        if restaurant_id == 'all':
            self.group_name = 'dashboard_orders_all'
        else:
            self.group_name = f'dashboard_orders_{restaurant_id}'
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def new_order(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'new_order',
            'order_id': event['order_id'],
            'restaurant_id': event['restaurant_id'],
            'status': event['status']
        }))
