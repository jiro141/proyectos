from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.orders.models import Order, OrderItem
from apps.billing.models import Bill
from .push_service import send_push_notification, broadcast_to_role


def send_order_event(group, event_type, data):
    """Envía evento WebSocket si Channels está disponible. Fallo silencioso si no."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group,
            {
                'type': 'order_update',
                'data': {
                    'type': event_type,
                    **data,
                }
            }
        )
    except Exception:
        # Channels no instalado o no disponible (PythonAnywhere)
        pass


def role_for_group(group):
    """Mapea grupos de WebSocket a roles de usuario."""
    mapping = {
        'kitchen': 'kitchen',
        'waiters': 'waiter',
        'cashiers': 'cashier',
    }
    return mapping.get(group)


@receiver(post_save, sender=Order)
def on_order_saved(sender, instance, created, **kwargs):
    event_type = 'order.created' if created else 'order.updated'
    table_number = instance.table.number
    waiter_name = instance.waiter.get_full_name()

    data = {
        'order_id': instance.id,
        'table_number': table_number,
        'waiter_name': waiter_name,
        'status': instance.status,
        'created_at': instance.created_at.isoformat(),
    }

    if created:
        send_order_event('kitchen', 'order.created', data)
        if instance.waiter:
            send_push_notification(
                instance.waiter,
                'Pedido creado',
                f'Mesa {table_number} — pedido #{instance.id} creado',
                data,
            )
    else:
        if instance.status == 'ready':
            send_order_event('waiters', 'order.ready', data)
            broadcast_to_role(
                'waiter',
                'Pedido listo 🍕',
                f'Mesa {table_number} — listo para entregar',
                data,
            )
        elif instance.status == 'delivered':
            send_order_event('cashiers', 'order.delivered', data)
            broadcast_to_role(
                'cashier',
                'Pedido entregado',
                f'Mesa {table_number} — pedido entregado',
                data,
            )


@receiver(post_save, sender=OrderItem)
def on_order_item_saved(sender, instance, created, **kwargs):
    if created:
        return

    data = {
        'order_id': instance.order_id,
        'item_id': instance.id,
        'item_name': instance.menu_item.name,
        'quantity': instance.quantity,
        'status': instance.status,
    }

    if instance.status == 'ready':
        send_order_event('waiters', 'item.ready', data)
    elif instance.status == 'preparing':
        send_order_event('kitchen', 'item.preparing', data)


@receiver(post_save, sender=Bill)
def on_bill_saved(sender, instance, created, **kwargs):
    if created:
        table_number = instance.order.table.number
        data = {
            'bill_id': instance.id,
            'order_id': instance.order_id,
            'table_number': table_number,
            'total': str(instance.total),
        }
        send_order_event('cashiers', 'bill.created', data)
        broadcast_to_role(
            'cashier',
            'Cuenta generada 💰',
            f'Mesa {table_number} — total ${float(instance.total):.2f}',
            data,
        )
