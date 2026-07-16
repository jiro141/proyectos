from django.test import TransactionTestCase
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from apps.accounts.models import User
from apps.menu.models import Category, MenuItem
from apps.tables.models import Table
from apps.orders.models import Order, OrderItem
from apps.billing.models import Bill


class FlowTestBaseMixin:
    def _login(self, role, username=None):
        if username is None:
            username = f'{role}_test'
        password = 'testpass123'
        user, created = User.objects.get_or_create(
            username=username,
            defaults={'role': role, 'first_name': 'Test', 'last_name': role.capitalize()}
        )
        if created:
            user.set_password(password)
            user.save()
        response = self.client.post('/api/auth/login/', {
            'username': username, 'password': password
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return user, response.data

    def _create_category(self, name, sort_order=0):
        return self.client.post('/api/menu/categories/', {
            'name': name, 'description': '', 'sort_order': sort_order
        }, format='json')

    def _create_menu_item(self, name, price, category_id, available=True):
        return self.client.post('/api/menu/items/', {
            'name': name, 'price': str(price), 'category': category_id,
            'description': '', 'available': available
        }, format='json')

    def _create_table(self, number, capacity=4):
        return self.client.post('/api/tables/', {
            'number': number, 'capacity': capacity, 'location': 'Sala principal'
        }, format='json')

    def _occupy_table(self, table_id):
        return self.client.post(f'/api/tables/{table_id}/occupy/', format='json')

    def _free_table(self, table_id):
        return self.client.post(f'/api/tables/{table_id}/free/', format='json')

    def _create_order(self, table_id, items_data=None):
        data = {'table': table_id}
        if items_data:
            data['items'] = items_data
        return self.client.post('/api/orders/', data, format='json')

    def _add_item(self, order_id, menu_item_id, quantity=1):
        return self.client.post(f'/api/orders/{order_id}/add_item/', {
            'menu_item': menu_item_id, 'quantity': quantity
        }, format='json')

    def _update_item_status(self, item_id, status_value):
        return self.client.patch(f'/api/orders/items/{item_id}/update_status/', {
            'status': status_value
        }, format='json')

    def _update_order_status(self, order_id, status_value):
        return self.client.patch(f'/api/orders/{order_id}/update_status/', {
            'status': status_value
        }, format='json')

    def _generate_bill(self, order_id):
        return self.client.post('/api/bills/generate/', {'order': order_id}, format='json')

    def _pay_bill(self, bill_id, method='cash', cash_amount=None):
        data = {'payment_method': method}
        if cash_amount is not None:
            data['cash_amount'] = str(cash_amount)
        return self.client.post(f'/api/bills/{bill_id}/pay/', data, format='json')


class FullAdminFlowTest(FlowTestBaseMixin, APITestCase):
    def test_admin_creates_full_catalog(self):
        self._login('admin')

        cat_resp = self._create_category('Pizzas', 0)
        self.assertEqual(cat_resp.status_code, 201)
        pizzas_id = cat_resp.data['id']
        self.assertTrue(Category.objects.filter(name='Pizzas').exists())

        cat2_resp = self._create_category('Bebidas', 1)
        self.assertEqual(cat2_resp.status_code, 201)

        item_resp = self._create_menu_item('Muzzarella', '2500.00', pizzas_id)
        self.assertEqual(item_resp.status_code, 201)

        item2_resp = self._create_menu_item('Coca-Cola', '1500.00', cat2_resp.data['id'])
        self.assertEqual(item2_resp.status_code, 201)

        items_resp = self.client.get('/api/menu/items/', format='json')
        self.assertEqual(items_resp.status_code, 200)
        self.assertEqual(len(items_resp.data['results']), 2)

        table_resp = self._create_table(1, 4)
        self.assertEqual(table_resp.status_code, 201)

        table2_resp = self._create_table(2, 6)
        self.assertEqual(table2_resp.status_code, 201)

        tables_resp = self.client.get('/api/tables/', format='json')
        self.assertEqual(tables_resp.status_code, 200)
        self.assertEqual(len(tables_resp.data['results']), 2)


class FullWaiterFlowTest(FlowTestBaseMixin, APITestCase):
    def test_waiter_occupies_table_creates_order(self):
        self._login('admin')
        cat_resp = self._create_category('Pizzas', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Muzzarella', '2500.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(1, 4)
        table_id = table_resp.data['id']

        self._login('waiter')

        occupy_resp = self._occupy_table(table_id)
        self.assertEqual(occupy_resp.status_code, 200)
        self.assertEqual(occupy_resp.data['status'], 'occupied')

        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 2}])
        self.assertEqual(order_resp.status_code, 201)
        self.assertEqual(order_resp.data['waiter_name'], 'Test Waiter')
        self.assertEqual(order_resp.data['status'], 'pending')
        self.assertEqual(order_resp.data['table_number'], 1)

        orders_resp = self.client.get('/api/orders/', format='json')
        self.assertEqual(orders_resp.status_code, 200)
        self.assertGreaterEqual(len(orders_resp.data['results']), 1)

        add_resp = self._add_item(order_resp.data['id'], menu_item_id, 1)
        self.assertEqual(add_resp.status_code, 201)


class FullKitchenFlowTest(FlowTestBaseMixin, APITestCase):
    def test_kitchen_updates_items_auto_advances_order(self):
        self._login('admin')
        cat_resp = self._create_category('Pizzas', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Muzzarella', '2500.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(1, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 1}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')

        items_resp = self.client.get('/api/orders/items/', format='json')
        self.assertEqual(items_resp.status_code, 200)
        self.assertGreaterEqual(len(items_resp.data['results']), 1)
        self.assertEqual(items_resp.data['results'][0]['status'], 'pending')

        update_resp = self._update_item_status(item_id, 'preparing')
        self.assertEqual(update_resp.status_code, 200)

        order_resp = self.client.get(f'/api/orders/{order_id}/', format='json')
        self.assertEqual(order_resp.data['status'], 'preparing')

        self._update_item_status(item_id, 'ready')

        order_resp = self.client.get(f'/api/orders/{order_id}/', format='json')
        self.assertEqual(order_resp.data['status'], 'ready')

        self._login('waiter')
        deliver_resp = self._update_order_status(order_id, 'delivered')
        self.assertEqual(deliver_resp.status_code, 200)


class FullCashierFlowTest(FlowTestBaseMixin, APITestCase):
    def test_cashier_generates_bill_and_processes_cash_payment(self):
        self._login('admin')
        cat_resp = self._create_category('Pizzas', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Muzzarella', '1500.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(1, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 2}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')
        self._update_item_status(item_id, 'preparing')
        self._update_item_status(item_id, 'ready')

        self._login('waiter')
        self._update_order_status(order_id, 'delivered')

        order_resp = self.client.get(f'/api/orders/{order_id}/', format='json')
        self.assertEqual(order_resp.data['status'], 'delivered')

        self._login('cashier')

        bill_resp = self._generate_bill(order_id)
        self.assertEqual(bill_resp.status_code, 201)
        self.assertEqual(Decimal(str(bill_resp.data['subtotal'])), Decimal('3000.00'))
        self.assertEqual(Decimal(str(bill_resp.data['tax'])), Decimal('300.00'))
        self.assertEqual(Decimal(str(bill_resp.data['total'])), Decimal('3300.00'))
        bill_id = bill_resp.data['id']

        pay_resp = self._pay_bill(bill_id, 'cash', Decimal('5000.00'))
        self.assertEqual(pay_resp.status_code, 200)
        self.assertEqual(pay_resp.data['status'], 'paid')
        self.assertEqual(Decimal(str(pay_resp.data['change'])), Decimal('1700.00'))
        self.assertEqual(pay_resp.data['payment_method'], 'cash')
        self.assertEqual(pay_resp.data['cash_amount'], '5000.00')

        self.client.get(f'/api/tables/{table_id}/', format='json')
        table = Table.objects.get(id=table_id)
        self.assertEqual(table.status, 'free')

    def test_cashier_processes_card_payment(self):
        self._login('admin')
        cat_resp = self._create_category('Pizzas', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Napolitana', '2000.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(2, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 1}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')
        self._update_item_status(item_id, 'preparing')
        self._update_item_status(item_id, 'ready')

        self._login('waiter')
        self._update_order_status(order_id, 'delivered')

        self._login('cashier')

        bill_resp = self._generate_bill(order_id)
        self.assertEqual(bill_resp.status_code, 201)
        bill_id = bill_resp.data['id']

        pay_resp = self._pay_bill(bill_id, 'card')
        self.assertEqual(pay_resp.status_code, 200)
        self.assertEqual(pay_resp.data['status'], 'paid')
        self.assertEqual(pay_resp.data['payment_method'], 'card')
        self.assertIsNone(pay_resp.data['change'])

        table = Table.objects.get(id=table_id)
        self.assertEqual(table.status, 'free')


class ErrorHandlingFlowTest(FlowTestBaseMixin, APITestCase):
    def test_waiter_cannot_create_menu_item(self):
        self._login('waiter')
        resp = self.client.post('/api/menu/items/', {
            'name': 'Pizza', 'price': '1000.00'
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_kitchen_cannot_create_menu_item(self):
        self._login('kitchen')
        resp = self.client.post('/api/menu/items/', {
            'name': 'Pizza', 'price': '1000.00'
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_invalid_order_transition(self):
        self._login('admin')
        cat_resp = self._create_category('Test', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Item', '1000.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(5, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 1}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')
        self._update_item_status(item_id, 'preparing')
        self._update_item_status(item_id, 'ready')

        self._login('waiter')
        self._update_order_status(order_id, 'delivered')

        resp = self._update_order_status(order_id, 'preparing')
        self.assertEqual(resp.status_code, 400)

    def test_insufficient_cash_payment(self):
        self._login('admin')
        cat_resp = self._create_category('Test', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Item', '1500.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(6, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 2}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')
        self._update_item_status(item_id, 'preparing')
        self._update_item_status(item_id, 'ready')

        self._login('waiter')
        self._update_order_status(order_id, 'delivered')

        self._login('cashier')
        bill_resp = self._generate_bill(order_id)
        bill_id = bill_resp.data['id']

        pay_resp = self._pay_bill(bill_id, 'cash', Decimal('100.00'))
        self.assertEqual(pay_resp.status_code, 400)

    def test_duplicate_bill_generation(self):
        self._login('admin')
        cat_resp = self._create_category('Test', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Item', '1500.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(7, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 1}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')
        self._update_item_status(item_id, 'preparing')
        self._update_item_status(item_id, 'ready')

        self._login('waiter')
        self._update_order_status(order_id, 'delivered')

        self._login('cashier')
        self._generate_bill(order_id)
        second_resp = self._generate_bill(order_id)
        self.assertEqual(second_resp.status_code, 400)

    def test_generate_bill_for_non_delivered_order(self):
        self._login('admin')
        cat_resp = self._create_category('Test', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Item', '1000.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(8, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 1}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')
        self._update_item_status(item_id, 'preparing')
        self._update_item_status(item_id, 'ready')

        self._login('cashier')
        bill_resp = self._generate_bill(order_id)
        self.assertEqual(bill_resp.status_code, 400)

    def test_pay_already_paid_bill(self):
        self._login('admin')
        cat_resp = self._create_category('Test', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Item', '1500.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(9, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 1}])
        order_id = order_resp.data['id']
        item_id = order_resp.data['items'][0]['id']

        self._login('kitchen')
        self._update_item_status(item_id, 'preparing')
        self._update_item_status(item_id, 'ready')

        self._login('waiter')
        self._update_order_status(order_id, 'delivered')

        self._login('cashier')
        bill_resp = self._generate_bill(order_id)
        bill_id = bill_resp.data['id']
        self._pay_bill(bill_id, 'cash', Decimal('5000.00'))

        second_resp = self._pay_bill(bill_id, 'cash', Decimal('5000.00'))
        self.assertEqual(second_resp.status_code, 400)

    def test_occupy_occupied_table(self):
        self._login('admin')
        table_resp = self._create_table(10, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        second_resp = self._occupy_table(table_id)
        self.assertEqual(second_resp.status_code, 400)

    def test_add_item_to_non_pending_order(self):
        self._login('admin')
        cat_resp = self._create_category('Test', 0)
        cat_id = cat_resp.data['id']
        item_resp = self._create_menu_item('Item', '1000.00', cat_id)
        menu_item_id = item_resp.data['id']
        table_resp = self._create_table(11, 4)
        table_id = table_resp.data['id']

        self._login('waiter')
        self._occupy_table(table_id)
        order_resp = self._create_order(table_id, [{'menu_item': menu_item_id, 'quantity': 1}])
        order_id = order_resp.data['id']

        self._update_order_status(order_id, 'preparing')

        add_resp = self._add_item(order_id, menu_item_id, 1)
        self.assertEqual(add_resp.status_code, 400)


class WebSocketFlowTest(FlowTestBaseMixin, TransactionTestCase):
    databases = '__all__'

    async def test_order_created_notifies_kitchen(self):
        from channels.db import database_sync_to_async
        from channels.testing import WebsocketCommunicator
        from config.asgi import application
        from rest_framework_simplejwt.tokens import AccessToken

        admin = await database_sync_to_async(User.objects.create_user)(
            username='admin_ws', password='testpass123', role='admin',
            first_name='Admin', last_name='WS'
        )
        category = await database_sync_to_async(Category.objects.create)(
            name='TestCat', sort_order=0
        )
        menu_item = await database_sync_to_async(MenuItem.objects.create)(
            name='TestItem', price=Decimal('1500.00'), category=category
        )
        table = await database_sync_to_async(Table.objects.create)(
            number=99, capacity=4
        )

        kitchen_user = await database_sync_to_async(User.objects.create_user)(
            username='kitchen_ws', password='testpass123', role='kitchen',
            first_name='Kitchen', last_name='WS'
        )
        token = str(AccessToken.for_user(kitchen_user))

        communicator = WebsocketCommunicator(application, f'/ws/orders/?token={token}')
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        waiter = await database_sync_to_async(User.objects.create_user)(
            username='waiter_ws', password='testpass123', role='waiter',
            first_name='Waiter', last_name='WS'
        )
        order = await database_sync_to_async(Order.objects.create)(
            table=table, waiter=waiter
        )
        await database_sync_to_async(OrderItem.objects.create)(
            order=order, menu_item=menu_item, quantity=2, unit_price=menu_item.price
        )

        response_data = await communicator.receive_json_from(timeout=5)
        self.assertEqual(response_data['type'], 'order.created')
        self.assertEqual(response_data['order_id'], order.id)

        await communicator.disconnect()

    async def test_item_ready_notifies_waiter(self):
        from channels.db import database_sync_to_async
        from channels.testing import WebsocketCommunicator
        from config.asgi import application
        from rest_framework_simplejwt.tokens import AccessToken

        category = await database_sync_to_async(Category.objects.create)(
            name='TestCat2', sort_order=0
        )
        menu_item = await database_sync_to_async(MenuItem.objects.create)(
            name='TestItem2', price=Decimal('1500.00'), category=category
        )
        table = await database_sync_to_async(Table.objects.create)(
            number=98, capacity=4
        )

        waiter_user = await database_sync_to_async(User.objects.create_user)(
            username='waiter_ws2', password='testpass123', role='waiter',
            first_name='Waiter', last_name='WS'
        )
        waiter_token = str(AccessToken.for_user(waiter_user))

        communicator = WebsocketCommunicator(application, f'/ws/orders/?token={waiter_token}')
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        order = await database_sync_to_async(Order.objects.create)(
            table=table, waiter=waiter_user
        )
        order_item = await database_sync_to_async(OrderItem.objects.create)(
            order=order, menu_item=menu_item, quantity=2, unit_price=menu_item.price
        )

        # Update item status to 'ready' via DB — triggers signal -> item.ready to waiters
        order_item.status = 'ready'
        await database_sync_to_async(order_item.save)()

        response_data = await communicator.receive_json_from(timeout=5)
        self.assertEqual(response_data['type'], 'item.ready')
        self.assertEqual(response_data['item_id'], order_item.id)

        await communicator.disconnect()

    async def test_bill_created_notifies_cashier(self):
        from channels.db import database_sync_to_async
        from channels.testing import WebsocketCommunicator
        from config.asgi import application
        from rest_framework_simplejwt.tokens import AccessToken

        category = await database_sync_to_async(Category.objects.create)(
            name='TestCat3', sort_order=0
        )
        menu_item = await database_sync_to_async(MenuItem.objects.create)(
            name='TestItem3', price=Decimal('2000.00'), category=category
        )
        table = await database_sync_to_async(Table.objects.create)(
            number=97, capacity=4
        )

        waiter_user = await database_sync_to_async(User.objects.create_user)(
            username='waiter_ws3', password='testpass123', role='waiter',
            first_name='Waiter', last_name='WS'
        )

        cashier_user = await database_sync_to_async(User.objects.create_user)(
            username='cashier_ws', password='testpass123', role='cashier',
            first_name='Cashier', last_name='WS'
        )
        cashier_token = str(AccessToken.for_user(cashier_user))

        communicator = WebsocketCommunicator(application, f'/ws/orders/?token={cashier_token}')
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        order = await database_sync_to_async(Order.objects.create)(
            table=table, waiter=waiter_user, status='delivered'
        )
        await database_sync_to_async(OrderItem.objects.create)(
            order=order, menu_item=menu_item, quantity=1, unit_price=menu_item.price
        )

        # Create bill via DB — triggers signal -> bill.created to cashiers
        bill = await database_sync_to_async(Bill.objects.create)(
            order=order, subtotal=Decimal('2000.00'), tax=Decimal('200.00'),
            total=Decimal('2200.00'), cashier=cashier_user
        )

        response_data = await communicator.receive_json_from(timeout=5)
        self.assertEqual(response_data['type'], 'bill.created')
        self.assertEqual(response_data['bill_id'], bill.id)

        await communicator.disconnect()
