import os
from django.core.asgi import get_asgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from apps.notifications.auth import TokenAuthMiddlewareStack
from apps.notifications import routing as notifications_routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': TokenAuthMiddlewareStack(
        URLRouter(
            notifications_routing.websocket_urlpatterns
        )
    ),
})
