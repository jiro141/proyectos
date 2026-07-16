import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_authenticated:
            self.group_name = f'user_{self.user.id}'
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass  # Clients only receive, not send

    async def notification(self, event):
        await self.send(text_data=json.dumps(event['data']))


class OrderConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_authenticated:
            # Kitchen staff joins the kitchen group
            if self.user.role == 'kitchen':
                await self.channel_layer.group_add('kitchen', self.channel_name)
            # Waiters join waiter group
            if self.user.role == 'waiter':
                await self.channel_layer.group_add('waiters', self.channel_name)
            # Cashiers join cashier group
            if self.user.role == 'cashier':
                await self.channel_layer.group_add('cashiers', self.channel_name)
            # Admins join all groups
            if self.user.role == 'admin':
                for group in ['kitchen', 'waiters', 'cashiers']:
                    await self.channel_layer.group_add(group, self.channel_name)

            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            for group in ['kitchen', 'waiters', 'cashiers']:
                await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data):
        pass  # Clients only receive, not send

    async def order_update(self, event):
        await self.send(text_data=json.dumps(event['data']))
