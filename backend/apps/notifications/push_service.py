import json
import os
from pathlib import Path

from django.conf import settings

# ─── Firebase Admin SDK (inicialización lazy) ──────────────────────────────
_firebase_app = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    # Buscar el service account key en varias ubicaciones
    possible_paths = [
        settings.BASE_DIR / 'firebase-credentials.json',
        settings.BASE_DIR.parent / 'firebase-credentials.json',
        Path('/etc/firebase-credentials.json'),
    ]

    cred_path = None
    for p in possible_paths:
        if p.exists():
            cred_path = p
            break

    if not cred_path:
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(str(cred_path))
        _firebase_app = firebase_admin.initialize_app(cred)
        return _firebase_app
    except Exception:
        return None


# ─── Envío de push notifications ──────────────────────────────────────────

def send_push_notification(user, title, body, data=None):
    """
    Envía una push notification a todos los dispositivos activos de un usuario.
    Si Firebase Admin no está configurado, falla silenciosamente.
    """
    firebase_app = get_firebase_app()
    if not firebase_app:
        return 0

    from firebase_admin import messaging
    from .models import DeviceToken

    tokens = list(
        DeviceToken.objects.filter(user=user, is_active=True)
        .values_list('token', flat=True)
    )

    if not tokens:
        return 0

    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={k: str(v) for k, v in (data or {}).items()},
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                channel_id='orders',
                priority='high',
                sound='default',
            ),
        ),
    )

    response = messaging.send_each_for_multicast(message)
    sent_count = response.success_count

    # Desactivar tokens que ya no son válidos
    if response.failure_count > 0:
        for idx, result in enumerate(response.responses):
            if not result.success and idx < len(tokens):
                DeviceToken.objects.filter(token=tokens[idx]).update(is_active=False)

    return sent_count


def broadcast_to_role(role, title, body, data=None):
    """
    Envía push a todos los usuarios con un rol específico.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    users = User.objects.filter(role=role, is_active=True)
    total = 0
    for user in users:
        total += send_push_notification(user, title, body, data)
    return total
