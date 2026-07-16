from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Table

User = get_user_model()

class TableModelTest(TestCase):
    def setUp(self):
        self.table = Table.objects.create(
            number=1,
            capacity=4,
            location='Salón principal'
        )

    def test_table_creation(self):
        self.assertEqual(str(self.table), 'Mesa 1 (4 pers.)')
        self.assertEqual(self.table.status, 'free')

    def test_table_unique_number(self):
        with self.assertRaises(Exception):
            Table.objects.create(number=1, capacity=2)

    def test_table_status_choices(self):
        for status_val, _ in Table.Status.choices:
            self.table.status = status_val
            self.table.save()
            self.table.refresh_from_db()
            self.assertEqual(self.table.status, status_val)


class TableAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='test123', role='admin'
        )
        self.waiter = User.objects.create_user(
            username='waiter', password='test123', role='waiter'
        )
        self.table = Table.objects.create(number=1, capacity=4, location='Salón')
        self.table2 = Table.objects.create(number=2, capacity=6, location='Terraza')
        self.list_url = reverse('table-list')

    def test_list_tables_authenticated(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_create_table_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.list_url, {
            'number': 3,
            'capacity': 2,
            'location': 'Barra',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Table.objects.count(), 3)

    def test_create_table_as_waiter_returns_403(self):
        self.client.force_authenticate(user=self.waiter)
        response = self.client.post(self.list_url, {
            'number': 3,
            'capacity': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_table_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('table-detail', args=[self.table.id])
        response = self.client.patch(url, {'capacity': 6})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.table.refresh_from_db()
        self.assertEqual(self.table.capacity, 6)

    def test_delete_table_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('table-detail', args=[self.table.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Table.objects.count(), 1)

    def test_occupy_table(self):
        self.client.force_authenticate(user=self.waiter)
        url = reverse('table-occupy', args=[self.table.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'occupied')

    def test_occupy_already_occupied_table_returns_400(self):
        self.client.force_authenticate(user=self.waiter)
        self.table.status = 'occupied'
        self.table.save()
        url = reverse('table-occupy', args=[self.table.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_free_table(self):
        self.client.force_authenticate(user=self.waiter)
        self.table.status = 'occupied'
        self.table.save()
        url = reverse('table-free', args=[self.table.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'free')

    def test_occupy_and_free_cycle(self):
        self.client.force_authenticate(user=self.waiter)
        occupy_url = reverse('table-occupy', args=[self.table.id])
        free_url = reverse('table-free', args=[self.table.id])

        self.client.post(occupy_url)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'occupied')

        self.client.post(free_url)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'free')
