from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderItemSerializer
from apps.menu.models import MenuItem
from apps.tables.models import Table

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    lookup_value_regex = '[0-9]+'

    def get_queryset(self):
        qs = Order.objects.all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        table_filter = self.request.query_params.get('table')
        if table_filter:
            qs = qs.filter(table_id=table_filter)
        # Ocultar pedidos facturados/entregados cuyo bill está cerrado (cierre del día)
        qs = qs.exclude(
            bill__closed=True,
            status__in=['delivered', 'billed'],
        )
        return qs

    def perform_create(self, serializer):
        order = serializer.save(waiter=self.request.user)

        # Crear los items del pedido a partir de request.data
        items_data = self.request.data.get('items', [])
        for item_data in items_data:
            menu_item_id = item_data.get('menu_item')
            if not menu_item_id:
                continue
            menu_item = MenuItem.objects.get(id=menu_item_id)
            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=item_data.get('quantity', 1),
                unit_price=menu_item.price,
                notes=item_data.get('notes', ''),
            )

        table = order.table
        if table.status == 'free':
            table.status = 'occupied'
            table.save()

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        order = self.get_object()
        if order.status != 'pending':
            return Response({'error': 'Solo se pueden agregar items a pedidos pendientes'}, status=400)
        serializer = OrderItemSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(order=order)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        valid_transitions = {
            'pending': ['preparing'],
            'preparing': ['ready'],
            'ready': ['delivered'],
            'delivered': ['billed'],
        }
        if new_status not in valid_transitions.get(order.status, []):
            return Response({'error': f'Transición inválida de {order.status} a {new_status}'}, status=400)
        order.status = new_status
        order.save()
        return Response(OrderSerializer(order).data)

class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        qs = OrderItem.objects.all()
        order = self.request.query_params.get('order')
        if order:
            qs = qs.filter(order_id=order)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        item = self.get_object()
        new_status = request.data.get('status')
        valid_transitions = {
            'pending': ['preparing', 'cancelled'],
            'preparing': ['ready'],
            'ready': ['delivered'],
        }
        if new_status not in valid_transitions.get(item.status, []):
            return Response({'error': f'Transición inválida de {item.status} a {new_status}'}, status=400)
        item.status = new_status
        item.save()

        order = item.order
        all_items = order.items.all()
        if all(i.status in ('delivered', 'cancelled') for i in all_items):
            order.status = 'delivered'
            order.save()
        elif all(i.status == 'ready' for i in all_items):
            order.status = 'ready'
            order.save()
        elif any(i.status == 'preparing' for i in all_items):
            order.status = 'preparing'
            order.save()

        return Response(OrderItemSerializer(item).data)
