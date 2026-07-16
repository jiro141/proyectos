from django.test import TransactionTestCase
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.contrib.auth import get_user_model
from .auth import TokenAuthMiddlewareStack
from .routing import websocket_urlpatterns
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

class NotificationConsumerTest(TransactionTestCase):
    async def test_connect_without_token(self):
        application = TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
        communicator = WebsocketCommunicator(application, '/ws/notifications/')
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_connect_with_valid_token(self):
        user = await self._create_user()
        token = AccessToken.for_user(user)
        application = TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
        communicator = WebsocketCommunicator(
            application,
            f'/ws/notifications/?token={str(token)}'
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_connect_order_consumer_as_waiter(self):
        user = await User.objects.acreate(
            username='waiter_ws', role='waiter'
        )
        token = AccessToken.for_user(user)
        application = TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
        communicator = WebsocketCommunicator(
            application,
            f'/ws/orders/?token={str(token)}'
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_connect_order_consumer_as_kitchen(self):
        user = await User.objects.acreate(
            username='chef_ws', role='kitchen'
        )
        token = AccessToken.for_user(user)
        application = TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
        communicator = WebsocketCommunicator(
            application,
            f'/ws/orders/?token={str(token)}'
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_connect_invalid_token(self):
        application = TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
        communicator = WebsocketCommunicator(
            application,
            '/ws/notifications/?token=invalid_jwt_token'
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_connect_both_consumers_independently(self):
        user = await self._create_user()
        token = AccessToken.for_user(user)
        token_str = str(token)

        notif_app = TokenAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        order_app = TokenAuthMiddlewareStack(URLRouter(websocket_urlpatterns))

        notif_comm = WebsocketCommunicator(
            notif_app, f'/ws/notifications/?token={token_str}'
        )
        order_comm = WebsocketCommunicator(
            order_app, f'/ws/orders/?token={token_str}'
        )

        notif_connected, _ = await notif_comm.connect()
        order_connected, _ = await order_comm.connect()

        self.assertTrue(notif_connected)
        self.assertTrue(order_connected)

        await notif_comm.disconnect()
        await order_comm.disconnect()

    @staticmethod
    async def _create_user():
        return await User.objects.acreate(
            username='testuser',
            role='waiter',
        )
