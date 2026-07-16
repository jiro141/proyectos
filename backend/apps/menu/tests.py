from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Category, MenuItem

User = get_user_model()

class CategoryModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name='Pizzas',
            description='Pizzas tradicionales',
            sort_order=1
        )

    def test_category_creation(self):
        self.assertEqual(str(self.category), 'Pizzas')
        self.assertEqual(self.category.sort_order, 1)

    def test_category_default_sort_order(self):
        cat = Category.objects.create(name='Bebidas')
        self.assertEqual(cat.sort_order, 0)


class MenuItemModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Bebidas', sort_order=1)
        self.item = MenuItem.objects.create(
            name='Coca-Cola',
            price=Decimal('1500.00'),
            category=self.category,
            available=True
        )

    def test_menu_item_creation(self):
        self.assertEqual(str(self.item), 'Coca-Cola - $1500.00')
        self.assertTrue(self.item.available)

    def test_menu_item_default_available(self):
        item = MenuItem.objects.create(
            name='Pizza',
            price=Decimal('5000.00'),
            category=self.category
        )
        self.assertTrue(item.available)

    def test_menu_item_category_relation(self):
        self.assertEqual(self.item.category.name, 'Bebidas')


class CategoryAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='test123', role='admin'
        )
        self.waiter = User.objects.create_user(
            username='waiter', password='test123', role='waiter'
        )
        self.category = Category.objects.create(
            name='Pizzas', description='Pizzas tradicionales', sort_order=1
        )
        self.list_url = reverse('category-list')

    def test_list_categories_authenticated(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_create_category_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.list_url, {
            'name': 'Bebidas',
            'sort_order': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 2)

    def test_create_category_as_waiter_returns_403(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.post(self.list_url, {
            'name': 'Bebidas',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_category_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('category-detail', args=[self.category.id])
        response = self.client.patch(url, {'name': 'Pizzas Actualizadas'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Pizzas Actualizadas')

    def test_delete_category_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('category-detail', args=[self.category.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Category.objects.count(), 0)


class MenuItemAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='test123', role='admin'
        )
        self.waiter = User.objects.create_user(
            username='waiter', password='test123', role='waiter'
        )
        self.category = Category.objects.create(name='Pizzas', sort_order=1)
        self.item = MenuItem.objects.create(
            name='Muzzarella', price=5000, category=self.category, available=True
        )
        self.item2 = MenuItem.objects.create(
            name='Napolitana', price=5500, category=self.category, available=False
        )
        self.list_url = reverse('menuitem-list')

    def test_list_items_authenticated(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_items_by_available(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url, {'available': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Muzzarella')

    def test_filter_items_by_category(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url, {'category': self.category.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_available_endpoint(self):
        self.client.force_authenticate(user=self.waiter)
        url = reverse('menuitem-available')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Muzzarella')

    def test_create_item_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.list_url, {
            'name': 'Fugazzeta',
            'price': 6000,
            'category': self.category.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MenuItem.objects.count(), 3)

    def test_create_item_as_waiter_returns_403(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.post(self.list_url, {
            'name': 'Fugazzeta',
            'price': 6000,
            'category': self.category.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_item_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('menuitem-detail', args=[self.item.id])
        response = self.client.patch(url, {'price': 5500})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(float(self.item.price), 5500.00)

    def test_delete_item_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('menuitem-detail', args=[self.item.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(MenuItem.objects.count(), 1)
