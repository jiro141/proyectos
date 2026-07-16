from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.tables.models import Table
from apps.menu.models import Category, MenuItem
from .models import Order, OrderItem

User = get_user_model()

class OrderModelTest(TestCase):
    def setUp(self):
        self.waiter = User.objects.create_user(
            username='waiter1', password='test123', role='waiter'
        )
        self.table = Table.objects.create(number=5, capacity=4)
        self.order = Order.objects.create(
            table=self.table,
            waiter=self.waiter
        )

    def test_order_creation(self):
        self.assertEqual(str(self.order), f'Pedido #{self.order.id} - Mesa 5')
        self.assertEqual(self.order.status, 'pending')

    def test_order_status_transitions(self):
        valid_transitions = {
            'pending': 'preparing',
            'preparing': 'ready',
            'ready': 'delivered',
            'delivered': 'billed',
        }
        for old_status, new_status in valid_transitions.items():
            self.order.status = old_status
            self.order.save()
            self.order.refresh_from_db()
            self.assertEqual(self.order.status, old_status)

    def test_order_notes_blank(self):
        self.assertEqual(self.order.notes, '')

    def test_order_table_occupies_on_create(self):
        order = Order.objects.create(table=self.table, waiter=self.waiter)
        self.assertEqual(self.table.status, 'free')


class OrderItemModelTest(TestCase):
    def setUp(self):
        self.waiter = User.objects.create_user(
            username='waiter2', password='test123', role='waiter'
        )
        self.table = Table.objects.create(number=6, capacity=2)
        self.category = Category.objects.create(name='TestCat')
        self.menu_item = MenuItem.objects.create(
            name='Test Item', price=1000, category=self.category
        )
        self.order = Order.objects.create(table=self.table, waiter=self.waiter)
        self.item = OrderItem.objects.create(
            order=self.order,
            menu_item=self.menu_item,
            quantity=2,
            unit_price=1000
        )

    def test_order_item_str(self):
        self.assertEqual(str(self.item), '2x Test Item')


class OrderAPITest(APITestCase):
    def setUp(self):
        self.waiter = User.objects.create_user(
            username='waiter', password='test123', role='waiter',
            first_name='Test', last_name='Waiter'
        )
        self.kitchen = User.objects.create_user(
            username='chef', password='test123', role='kitchen'
        )
        self.table = Table.objects.create(number=10, capacity=4)
        self.table2 = Table.objects.create(number=11, capacity=2)
        self.category = Category.objects.create(name='Pizzas')
        self.menu_item = MenuItem.objects.create(
            name='Muzzarella', price=5000, category=self.category
        )
        self.menu_item2 = MenuItem.objects.create(
            name='Fugazzeta', price=6000, category=self.category
        )
        self.order = Order.objects.create(table=self.table, waiter=self.waiter)
        self.list_url = reverse('order-list')

    def test_create_order(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.post(self.list_url, {
            'table': self.table2.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 2)
        self.assertEqual(response.data['waiter_name'], 'Test Waiter')

    def test_list_orders_authenticated(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_orders_by_status(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url, {'status': 'pending'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

        response = self.client.get(self.list_url, {'status': 'ready'})
        self.assertEqual(len(response.data['results']), 0)

    def test_filter_orders_by_table(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url, {'table': self.table.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_add_item_to_order(self):
        self.client.force_authenticate(user=self.waiter)
        url = reverse('order-add-item', args=[self.order.id])
        response = self.client.post(url, {
            'menu_item': self.menu_item.id,
            'quantity': 2,
            'unit_price': 5000,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OrderItem.objects.count(), 1)
        self.assertEqual(response.data['quantity'], 2)

    def test_add_item_to_non_pending_order_returns_400(self):
        self.client.force_authenticate(user=self.waiter)
        self.order.status = 'preparing'
        self.order.save()
        url = reverse('order-add-item', args=[self.order.id])
        response = self.client.post(url, {
            'menu_item': self.menu_item.id,
            'quantity': 1,
            'unit_price': 5000,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_order_status_valid_transition(self):
        self.client.force_authenticate(user=self.waiter)
        url = reverse('order-update-status', args=[self.order.id])
        response = self.client.patch(url, {'status': 'preparing'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'preparing')

    def test_update_order_status_invalid_transition_returns_400(self):
        self.client.force_authenticate(user=self.waiter)
        url = reverse('order-update-status', args=[self.order.id])
        response = self.client.patch(url, {'status': 'delivered'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_full_order_lifecycle(self):
        self.client.force_authenticate(user=self.waiter)

        add_url = reverse('order-add-item', args=[self.order.id])
        self.client.post(add_url, {
            'menu_item': self.menu_item.id,
            'quantity': 2,
            'unit_price': 5000,
        })

        status_url = reverse('order-update-status', args=[self.order.id])
        transitions = ['preparing', 'ready', 'delivered']
        for new_status in transitions:
            response = self.client.patch(status_url, {'status': new_status})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.order.refresh_from_db()
            self.assertEqual(self.order.status, new_status)

    def test_items_endpoint(self):
        self.client.force_authenticate(user=self.waiter)
        OrderItem.objects.create(
            order=self.order, menu_item=self.menu_item,
            quantity=2, unit_price=5000
        )
        url = reverse('order-item-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_items_by_order(self):
        self.client.force_authenticate(user=self.waiter)
        OrderItem.objects.create(
            order=self.order, menu_item=self.menu_item,
            quantity=2, unit_price=5000
        )
        url = reverse('order-item-list')
        response = self.client.get(url, {'order': self.order.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
