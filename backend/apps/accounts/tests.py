from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

class UserModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testwaiter',
            password='testpass123',
            role='waiter',
            first_name='Test',
            last_name='Waiter'
        )

    def test_create_user_with_role(self):
        self.assertEqual(self.user.role, 'waiter')
        self.assertEqual(str(self.user), 'Test Waiter (Mesonero)')

    def test_user_roles_choices(self):
        for role, label in User.Role.choices:
            user = User.objects.create_user(
                username=role,
                password='testpass123',
                role=role
            )
            self.assertEqual(user.role, role)

    def test_user_str_method(self):
        user = User.objects.create_user(
            username='chef',
            password='testpass123',
            role='kitchen',
            first_name='Chef',
            last_name='Master'
        )
        self.assertIn('Chef Master', str(user))
        self.assertIn('Cocina', str(user))

    def test_user_phone_blank_by_default(self):
        self.assertEqual(self.user.phone, '')

    def test_user_role_default_waiter(self):
        user = User.objects.create_user(username='default', password='test123')
        self.assertEqual(user.role, 'waiter')


class AuthEndpointTest(APITestCase):
    def setUp(self):
        self.password = 'testpass123'
        self.waiter = User.objects.create_user(
            username='waiter1',
            password=self.password,
            role='waiter',
            first_name='Test',
            last_name='Waiter'
        )
        self.admin = User.objects.create_user(
            username='admin1',
            password=self.password,
            role='admin',
        )
        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')

    def test_login_success(self):
        response = self.client.post(self.login_url, {
            'username': 'waiter1',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_password(self):
        response = self.client.post(self.login_url, {
            'username': 'waiter1',
            'password': 'wrongpass',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        response = self.client.post(self.login_url, {
            'username': 'nobody',
            'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields(self):
        response = self.client.post(self.login_url, {
            'username': 'waiter1',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_refresh_success(self):
        login_resp = self.client.post(self.login_url, {
            'username': 'waiter1',
            'password': self.password,
        })
        refresh_token = login_resp.data['refresh']
        response = self.client.post(self.refresh_url, {
            'refresh': refresh_token,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_token_refresh_invalid(self):
        response = self.client.post(self.refresh_url, {
            'refresh': 'invalidtoken',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_access_returns_401(self):
        response = self.client.get(reverse('me'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_user(self):
        response = self.client.post(reverse('register'), {
            'username': 'newuser',
            'password': 'newpass123',
            'role': 'waiter',
            'first_name': 'New',
            'last_name': 'User',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_me_endpoint(self):
        login_resp = self.client.post(self.login_url, {
            'username': 'waiter1',
            'password': self.password,
        })
        token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'waiter1')
        self.assertEqual(response.data['role'], 'waiter')

    def test_role_based_403_on_admin_create(self):
        login_resp = self.client.post(self.login_url, {
            'username': 'waiter1',
            'password': self.password,
        })
        token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.post(reverse('menuitem-list'), {
            'name': 'Pizza',
            'price': 5000.00,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_menu_item(self):
        from apps.menu.models import Category
        category = Category.objects.create(name='Test Cat')

        login_resp = self.client.post(self.login_url, {
            'username': 'admin1',
            'password': self.password,
        })
        token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.post(reverse('menuitem-list'), {
            'name': 'Admin Pizza',
            'price': 5000.00,
            'category': category.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
