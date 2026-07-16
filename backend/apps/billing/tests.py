from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.tables.models import Table
from apps.menu.models import Category, MenuItem
from apps.orders.models import Order, OrderItem
from .models import Bill

User = get_user_model()

class BillModelTest(TestCase):
    def setUp(self):
        self.cashier = User.objects.create_user(
            username='cashier1', password='test123', role='cashier'
        )
        self.waiter = User.objects.create_user(
            username='waiter3', password='test123', role='waiter'
        )
        self.table = Table.objects.create(number=10, capacity=4)
        self.category = Category.objects.create(name='TestCat')
        self.menu_item = MenuItem.objects.create(
            name='Pizza', price=5000, category=self.category
        )
        self.order = Order.objects.create(table=self.table, waiter=self.waiter)
        OrderItem.objects.create(
            order=self.order, menu_item=self.menu_item,
            quantity=2, unit_price=5000
        )
        self.bill = Bill.objects.create(
            order=self.order,
            subtotal=10000,
            tax=1000,
            total=11000,
            cashier=self.cashier
        )

    def test_bill_creation(self):
        self.assertIn('Cuenta', str(self.bill))
        self.assertEqual(self.bill.status, 'pending')

    def test_bill_payment(self):
        self.bill.status = 'paid'
        self.bill.payment_method = 'cash'
        self.bill.cash_amount = 15000
        self.bill.change = 4000
        self.bill.save()
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, 'paid')
        self.assertEqual(self.bill.change, 4000)


class BillAPITest(APITestCase):
    def setUp(self):
        self.cashier = User.objects.create_user(
            username='cashier', password='test123', role='cashier'
        )
        self.waiter = User.objects.create_user(
            username='waiter', password='test123', role='waiter'
        )
        self.table = Table.objects.create(number=20, capacity=4)
        self.category = Category.objects.create(name='Pizzas')
        self.menu_item = MenuItem.objects.create(
            name='Muzzarella', price=5000, category=self.category
        )
        self.order = Order.objects.create(
            table=self.table, waiter=self.waiter, status='delivered'
        )
        OrderItem.objects.create(
            order=self.order, menu_item=self.menu_item,
            quantity=2, unit_price=5000
        )
        self.bill = Bill.objects.create(
            order=self.order, subtotal=10000, tax=1000,
            total=11000, cashier=self.cashier
        )
        self.list_url = reverse('bill-list')

    def test_list_bills_authenticated(self):
        self.client.force_authenticate(user=self.cashier)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_bills_by_status(self):
        self.client.force_authenticate(user=self.cashier)
        response = self.client.get(self.list_url, {'status': 'pending'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_generate_bill(self):
        self.client.force_authenticate(user=self.cashier)
        new_order = Order.objects.create(
            table=self.table, waiter=self.waiter, status='delivered'
        )
        OrderItem.objects.create(
            order=new_order, menu_item=self.menu_item,
            quantity=1, unit_price=5000
        )
        url = reverse('bill-generate')
        response = self.client.post(url, {'order': new_order.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['subtotal']), 5000.00)
        self.assertEqual(float(response.data['total']), 5500.00)

    def test_generate_bill_for_non_delivered_order_returns_400(self):
        self.client.force_authenticate(user=self.cashier)
        pending_order = Order.objects.create(
            table=self.table, waiter=self.waiter, status='pending'
        )
        url = reverse('bill-generate')
        response = self.client.post(url, {'order': pending_order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_duplicate_bill_returns_400(self):
        self.client.force_authenticate(user=self.cashier)
        url = reverse('bill-generate')
        response = self.client.post(url, {'order': self.order.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_pay_bill_cash(self):
        self.client.force_authenticate(user=self.cashier)
        url = reverse('bill-pay', args=[self.bill.id])
        response = self.client.post(url, {
            'payment_method': 'cash',
            'cash_amount': 15000,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, 'paid')
        self.assertEqual(float(self.bill.change), 4000.00)

    def test_pay_bill_insufficient_cash_returns_400(self):
        self.client.force_authenticate(user=self.cashier)
        url = reverse('bill-pay', args=[self.bill.id])
        response = self.client.post(url, {
            'payment_method': 'cash',
            'cash_amount': 5000,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pay_bill_card(self):
        self.client.force_authenticate(user=self.cashier)
        url = reverse('bill-pay', args=[self.bill.id])
        response = self.client.post(url, {
            'payment_method': 'card',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, 'paid')
        self.assertEqual(self.bill.payment_method, 'card')

    def test_pay_already_paid_bill_returns_400(self):
        self.client.force_authenticate(user=self.cashier)
        self.bill.status = 'paid'
        self.bill.save()
        url = reverse('bill-pay', args=[self.bill.id])
        response = self.client.post(url, {
            'payment_method': 'cash',
            'cash_amount': 15000,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pay_bill_frees_table(self):
        self.client.force_authenticate(user=self.cashier)
        self.table.status = 'occupied'
        self.table.save()
        url = reverse('bill-pay', args=[self.bill.id])
        self.client.post(url, {
            'payment_method': 'cash',
            'cash_amount': 15000,
        })
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'free')
