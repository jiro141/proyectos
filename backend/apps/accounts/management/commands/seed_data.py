from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.menu.models import Category, MenuItem
from apps.tables.models import Table
from apps.orders.models import Order, OrderItem
from apps.billing.models import Bill

User = get_user_model()


class Command(BaseCommand):
    help = 'Carga datos de prueba para Pizzeria El Patio'

    def handle(self, *args, **options):
        self.stdout.write('Cargando datos de prueba...\n')

        self._create_users()
        self._create_menu()
        self._create_tables()
        self._create_orders()
        self._create_bills()

        self.stdout.write(self.style.SUCCESS('Datos cargados correctamente!'))

    def _create_users(self):
        self.stdout.write('  Creando usuarios...')

        users_data = [
            {
                'username': 'admin',
                'password': 'admin123',
                'email': 'admin@elpatio.com',
                'first_name': 'Admin',
                'last_name': 'Principal',
                'role': User.Role.ADMIN,
                'phone': '123456789',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'waiter1',
                'password': 'waiter123',
                'email': 'carlos@elpatio.com',
                'first_name': 'Carlos',
                'last_name': 'Gonzalez',
                'role': User.Role.WAITER,
                'phone': '987654321',
            },
            {
                'username': 'waiter2',
                'password': 'waiter123',
                'email': 'maria@elpatio.com',
                'first_name': 'Maria',
                'last_name': 'Lopez',
                'role': User.Role.WAITER,
                'phone': '555111222',
            },
            {
                'username': 'kitchen',
                'password': 'kitchen123',
                'email': 'jose@elpatio.com',
                'first_name': 'Jose',
                'last_name': 'Ramirez',
                'role': User.Role.KITCHEN,
                'phone': '555333444',
            },
            {
                'username': 'cashier',
                'password': 'cashier123',
                'email': 'ana@elpatio.com',
                'first_name': 'Ana',
                'last_name': 'Martinez',
                'role': User.Role.CASHIER,
                'phone': '555555666',
            },
        ]

        for data in users_data:
            password = data.pop('password')
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults=data,
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f'    - {user.username} creado')
            else:
                self.stdout.write(f'    - {user.username} ya existe')

    def _create_menu(self):
        self.stdout.write('  Creando menu...')

        categories_data = [
            # Ordenado como aparece en el menu
            {'name': 'Pizzas', 'description': 'Pizzas artesanales horneadas en horno de barro', 'sort_order': 1},
            {'name': 'Tapas', 'description': 'Entradas para compartir', 'sort_order': 2},
            {'name': 'Pizzas de Carnes', 'description': 'Base salsa y queso, elegi tu carne y extras', 'sort_order': 3},
            {'name': 'Pizzas Barbacoa', 'description': 'Pizzas estilo BBQ', 'sort_order': 4},
            {'name': 'Ensaladas', 'description': 'Ensaladas Cesar', 'sort_order': 5},
            {'name': 'Alas Crispy', 'description': 'Alitas empanizadas', 'sort_order': 6},
            {'name': 'Brochetas', 'description': 'Brochetas a la parrilla', 'sort_order': 7},
            {'name': 'Alas', 'description': 'Alitas de pollo', 'sort_order': 8},
            {'name': 'Hamburguesas Clasicas', 'description': 'Hamburguesas clasicas con jamon, queso, lechuga y tomate', 'sort_order': 9},
            {'name': 'Hamburguesa Pollo Crispy', 'description': 'Hamburguesa de pollo crispy', 'sort_order': 10},
            {'name': 'Hamburguesas a las Brasas', 'description': 'Hamburguesas a la parrilla', 'sort_order': 11},
            {'name': 'Platos', 'description': 'Platos principales', 'sort_order': 12},
            {'name': 'Tablas', 'description': 'Tablas para compartir', 'sort_order': 13},
            {'name': 'Salchipapa a las Brasas', 'description': 'Salchipapa con proteina a las brasas', 'sort_order': 14},
            {'name': 'Salchipapas', 'description': 'Salchipapas clasicas', 'sort_order': 15},
            {'name': 'Pasticho', 'description': 'Pasticho clasico', 'sort_order': 16},
            {'name': 'Pastas', 'description': 'Pastas caseras', 'sort_order': 17},
        ]

        categories = {}
        for cat_data in categories_data:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data,
            )
            categories[cat.name] = cat
            if created:
                self.stdout.write(f'    - Categoria "{cat.name}" creada')

        items_data = [
            # ── Pizzas ──
            {'name': 'La Patio', 'price': 18.00, 'category': 'Pizzas', 'description': 'Salsa, queso, champiñones, maiz, pimenton, jamon, tocineta, cebolla'},
            {'name': 'Vegetariana', 'price': 16.00, 'category': 'Pizzas', 'description': 'Salsa, queso, champiñones, maiz, pimenton, aceitunas, cebolla'},
            {'name': 'Napolitana', 'price': 14.00, 'category': 'Pizzas', 'description': 'Salsa, queso, jamon'},
            {'name': 'Capresa', 'price': 14.00, 'category': 'Pizzas', 'description': 'Salsa, queso, oregano, tomate'},
            {'name': 'Margarita', 'price': 12.00, 'category': 'Pizzas', 'description': 'Salsa, queso'},
            {'name': 'Hawaiana', 'price': 15.00, 'category': 'Pizzas', 'description': 'Jamon, queso, piña caramelizada'},
            {'name': 'Carbonara', 'price': 18.00, 'category': 'Pizzas', 'description': 'Salsa blanca, queso, pollo, tocineta, maiz, champiñones'},
            {'name': 'Marinera', 'price': 19.00, 'category': 'Pizzas', 'description': 'Salsa, queso, camarones, cebolla, pimenton'},
            {'name': 'Chorizo', 'price': 16.00, 'category': 'Pizzas', 'description': 'Salsa, queso, chorizo, pimenton, cebolla'},
            {'name': '3 Quesos', 'price': 15.00, 'category': 'Pizzas', 'description': 'Salsa, queso mozzarella, parmesano, queso amarillo'},
            {'name': 'De la Casa', 'price': 17.00, 'category': 'Pizzas', 'description': 'Salsa, queso, carne molida, cebolla, pimenton, anchoas'},
            {'name': 'Pepperoni', 'price': 15.00, 'category': 'Pizzas', 'description': 'Salsa, queso, pepperoni, pimenton, cebolla'},
            {'name': 'Especial', 'price': 17.00, 'category': 'Pizzas', 'description': 'Jamon, queso, salami, anchoas, cebolla, pimenton'},
            {'name': 'Embutido', 'price': 18.00, 'category': 'Pizzas', 'description': 'Jamon, queso, pepperoni, salami, tocineta, chorizo'},
            {'name': 'Criolla', 'price': 16.00, 'category': 'Pizzas', 'description': 'Queso, pollo, maiz, cebolla, pimenton'},
            {'name': 'Tropical', 'price': 15.00, 'category': 'Pizzas', 'description': 'Tocineta, queso, piña caramelizada'},
            # ── Tapas ──
            {'name': 'Dedos de Pollo', 'price': 8.00, 'category': 'Tapas', 'description': ''},
            {'name': 'Mini Croqueta de Pollo', 'price': 7.00, 'category': 'Tapas', 'description': ''},
            {'name': 'Tequeños', 'price': 7.00, 'category': 'Tapas', 'description': ''},
            # ── Pizzas de Carnes ──
            {'name': 'Pizza Carne Mechada', 'price': 17.00, 'category': 'Pizzas de Carnes', 'description': 'Base salsa y queso con carne mechada. Extra: champiñones, maiz, aceitunas, anchoas, cebolla, jamon, pimenton'},
            {'name': 'Pizza Pollo', 'price': 17.00, 'category': 'Pizzas de Carnes', 'description': 'Base salsa y queso con pollo. Extra: champiñones, maiz, aceitunas, anchoas, cebolla, jamon, pimenton'},
            {'name': 'Pizza Pernil', 'price': 18.00, 'category': 'Pizzas de Carnes', 'description': 'Base salsa y queso con pernil. Extra: champiñones, maiz, aceitunas, anchoas, cebolla, jamon, pimenton'},
            {'name': 'Pizza Carne Molida', 'price': 16.00, 'category': 'Pizzas de Carnes', 'description': 'Base salsa y queso con carne molida. Extra: champiñones, maiz, aceitunas, anchoas, cebolla, jamon, pimenton'},
            # ── Pizzas Barbacoa ──
            {'name': 'Pizza Barbacoa de Cerdo', 'price': 19.00, 'category': 'Pizzas Barbacoa', 'description': 'Salsa, queso, cebolla, pimenton, mozzarella, parmesano, asado de cerdo'},
            {'name': 'Pizza Barbacoa de Lomo', 'price': 20.00, 'category': 'Pizzas Barbacoa', 'description': 'Salsa, queso, cebolla, pimenton, mozzarella, parmesano, asado de lomo'},
            {'name': 'Pizza Barbacoa de Pollo', 'price': 19.00, 'category': 'Pizzas Barbacoa', 'description': 'Salsa, queso, cebolla, pimenton, mozzarella, parmesano, asado de pollo'},
            # ── Ensaladas ──
            {'name': 'Ensalada Cesar con Pollo', 'price': 12.00, 'category': 'Ensaladas', 'description': ''},
            {'name': 'Ensalada Cesar con Lomo', 'price': 14.00, 'category': 'Ensaladas', 'description': ''},
            {'name': 'Ensalada Cesar con Cerdo', 'price': 13.00, 'category': 'Ensaladas', 'description': ''},
            {'name': 'Ensalada Cesar', 'price': 10.00, 'category': 'Ensaladas', 'description': ''},
            # ── Alas Crispy ──
            {'name': 'Alas Crispy', 'price': 14.00, 'category': 'Alas Crispy', 'description': 'Alas crispy, ensalada Cesar, papas a la francesa'},
            # ── Brochetas ──
            {'name': 'Brocheta de Pollo', 'price': 14.00, 'category': 'Brochetas', 'description': 'Acompañada de ensalada Cesar y papas a la francesa'},
            {'name': 'Brocheta de Carne', 'price': 15.00, 'category': 'Brochetas', 'description': 'Acompañada de ensalada Cesar y papas a la francesa'},
            {'name': 'Brocheta Mixta', 'price': 16.00, 'category': 'Brochetas', 'description': 'Acompañada de ensalada Cesar y papas a la francesa'},
            {'name': 'Brocheta de Cerdo Agridulce', 'price': 15.00, 'category': 'Brochetas', 'description': 'Acompañada de ensalada Cesar y papas a la francesa'},
            # ── Alas ──
            {'name': 'Alitas Bufalo', 'price': 13.00, 'category': 'Alas', 'description': 'Acompañadas de ensalada Cesar y papas a la francesa'},
            {'name': 'Alitas Bufalo Horneadas', 'price': 13.00, 'category': 'Alas', 'description': 'Acompañadas de ensalada Cesar y papas a la francesa'},
            # ── Hamburguesas Clasicas ──
            {'name': 'Hamburguesa Pollo Mechado', 'price': 11.00, 'category': 'Hamburguesas Clasicas', 'description': 'Jamon, queso, lechuga, tomate. Adicional: papas a la francesa'},
            {'name': 'Hamburguesa Carne Mechada', 'price': 11.00, 'category': 'Hamburguesas Clasicas', 'description': 'Jamon, queso, lechuga, tomate. Adicional: papas a la francesa'},
            {'name': 'Hamburguesa Croqueta', 'price': 10.00, 'category': 'Hamburguesas Clasicas', 'description': 'Jamon, queso, lechuga, tomate. Adicional: papas a la francesa'},
            {'name': 'Hamburguesa Pernil', 'price': 12.00, 'category': 'Hamburguesas Clasicas', 'description': 'Jamon, queso, lechuga, tomate. Adicional: papas a la francesa'},
            # ── Hamburguesa Pollo Crispy ──
            {'name': 'Hamburguesa Pollo Crispy', 'price': 13.00, 'category': 'Hamburguesa Pollo Crispy', 'description': 'Pechuga empanizada, ensalada Cesar, queso amarillo, tocineta'},
            # ── Hamburguesas a las Brasas ──
            {'name': 'Hamburguesa a las Brasas Pollo', 'price': 14.00, 'category': 'Hamburguesas a las Brasas', 'description': 'Tocineta, queso fundido, lechuga, tomate, cebolla caramelizada, huevo frito'},
            {'name': 'Hamburguesa a las Brasas Cerdo', 'price': 14.00, 'category': 'Hamburguesas a las Brasas', 'description': 'Tocineta, queso fundido, lechuga, tomate, cebolla caramelizada, huevo frito'},
            {'name': 'Hamburguesa a las Brasas Lomo', 'price': 15.00, 'category': 'Hamburguesas a las Brasas', 'description': 'Tocineta, queso fundido, lechuga, tomate, cebolla caramelizada, huevo frito'},
            {'name': 'Hamburguesa a las Brasas Croqueta', 'price': 13.00, 'category': 'Hamburguesas a las Brasas', 'description': 'Tocineta, queso fundido, lechuga, tomate, cebolla caramelizada, huevo frito'},
            # ── Platos ──
            {'name': 'Lomo Plato', 'price': 18.00, 'category': 'Platos', 'description': 'Solomo, ensalada Cesar, papas francesas'},
            {'name': 'Pollo Plato', 'price': 15.00, 'category': 'Platos', 'description': 'Pechuga de pollo, ensalada Cesar, papas francesas'},
            {'name': 'Cerdo Plato', 'price': 16.00, 'category': 'Platos', 'description': 'Cerdo, ensalada Cesar, papas francesas'},
            {'name': 'Plato Mixto', 'price': 20.00, 'category': 'Platos', 'description': 'Solomo, pollo, lomo de cerdo, ensalada Cesar, papas a la francesa'},
            {'name': 'Plato Crispy', 'price': 16.00, 'category': 'Platos', 'description': 'Pollo crispy, ensalada Cesar, papas a la francesa'},
            # ── Tablas ──
            {'name': 'Tabla Crispy', 'price': 22.00, 'category': 'Tablas', 'description': 'Alas, croqueta de pollo, nuggets de pollo, dedos de pollo, papas a la francesa, ensalada Cesar'},
            {'name': 'Tabla Asada', 'price': 24.00, 'category': 'Tablas', 'description': 'Pollo asado, lomo de cerdo, solomo, chorizo, ensalada Cesar, papas'},
            # ── Salchipapa a las Brasas ──
            {'name': 'Salchipapa Brasas Lomo Cerdo', 'price': 13.00, 'category': 'Salchipapa a las Brasas', 'description': 'Papas francesas, queso, salchicha, tocineta, maiz, lomo de cerdo'},
            {'name': 'Salchipapa Brasas Pollo Brasa', 'price': 12.00, 'category': 'Salchipapa a las Brasas', 'description': 'Papas francesas, queso, salchicha, tocineta, maiz, pollo a la brasa'},
            {'name': 'Salchipapa Brasas Lomo Res', 'price': 14.00, 'category': 'Salchipapa a las Brasas', 'description': 'Papas francesas, queso, salchicha, tocineta, maiz, lomo de res'},
            {'name': 'Salchipapa Brasas Pollo Crispy', 'price': 12.00, 'category': 'Salchipapa a las Brasas', 'description': 'Papas francesas, queso, salchicha, tocineta, maiz, pollo crispy'},
            # ── Salchipapas ──
            {'name': 'Salchipapa Normal', 'price': 8.00, 'category': 'Salchipapas', 'description': 'Papas a la francesa, salchicha'},
            {'name': 'Salchipapa con Pernil', 'price': 11.00, 'category': 'Salchipapas', 'description': 'Papas francesas, salchicha, pernil'},
            {'name': 'Salchipapa con Carne Mechada', 'price': 11.00, 'category': 'Salchipapas', 'description': 'Papas francesas, salchicha, carne mechada'},
            {'name': 'Salchipapa con Pollo', 'price': 11.00, 'category': 'Salchipapas', 'description': 'Papas francesas, salchicha, pollo'},
            # ── Pasticho ──
            {'name': 'Pasticho', 'price': 14.00, 'category': 'Pasticho', 'description': ''},
            # ── Pastas ──
            {'name': 'Pastas', 'price': 12.00, 'category': 'Pastas', 'description': 'Consultar ingredientes disponibles'},
        ]

        for item_data in items_data:
            category_name = item_data.pop('category')
            item, created = MenuItem.objects.get_or_create(
                name=item_data['name'],
                defaults={**item_data, 'category': categories[category_name]},
            )
            if created:
                self.stdout.write(f'    - Item "{item.name}" creado ($ {item.price})')

    def _create_tables(self):
        self.stdout.write('  Creando mesas...')

        tables_data = [
            {'number': 1, 'capacity': 2, 'location': 'Salon principal'},
            {'number': 2, 'capacity': 2, 'location': 'Salon principal'},
            {'number': 3, 'capacity': 4, 'location': 'Salon principal'},
            {'number': 4, 'capacity': 4, 'location': 'Salon principal'},
            {'number': 5, 'capacity': 4, 'location': 'Salon principal'},
            {'number': 6, 'capacity': 6, 'location': 'Salon principal'},
            {'number': 7, 'capacity': 4, 'location': 'Salon principal'},
            {'number': 8, 'capacity': 6, 'location': 'Salon principal'},
            {'number': 9, 'capacity': 2, 'location': 'Terraza'},
            {'number': 10, 'capacity': 4, 'location': 'Terraza'},
            {'number': 11, 'capacity': 6, 'location': 'Terraza'},
            {'number': 12, 'capacity': 8, 'location': 'Salon principal'},
        ]

        for table_data in tables_data:
            table, created = Table.objects.get_or_create(
                number=table_data['number'],
                defaults=table_data,
            )
            if created:
                self.stdout.write(f'    - Mesa {table.number} creada ({table.capacity} pers.)')
            else:
                self.stdout.write(f'    - Mesa {table.number} ya existe')

    def _create_orders(self):
        self.stdout.write('  Creando pedidos de ejemplo...')

        try:
            waiter1 = User.objects.get(username='waiter1')
            waiter2 = User.objects.get(username='waiter2')
        except User.DoesNotExist:
            self.stdout.write('    - Usuarios no encontrados, salteando pedidos')
            return

        tables = {t.number: t for t in Table.objects.all()}
        items = {i.name: i for i in MenuItem.objects.all()}

        if not tables:
            self.stdout.write('    - No hay mesas, salteando pedidos')
            return

        orders_data = [
            {
                'table': tables.get(1),
                'waiter': waiter1,
                'status': Order.Status.PENDING,
                'notes': 'Cliente alergico al oregano',
                'items': [
                    {'menu_item': items.get('La Patio'), 'quantity': 1, 'status': OrderItem.Status.PENDING},
                    {'menu_item': items.get('Tequeños'), 'quantity': 1, 'status': OrderItem.Status.PENDING},
                ],
            },
            {
                'table': tables.get(3),
                'waiter': waiter2,
                'status': Order.Status.PREPARING,
                'notes': '',
                'items': [
                    {'menu_item': items.get('Carbonara'), 'quantity': 1, 'status': OrderItem.Status.PREPARING},
                    {'menu_item': items.get('Hawaiana'), 'quantity': 1, 'status': OrderItem.Status.PREPARING},
                    {'menu_item': items.get('Dedos de Pollo'), 'quantity': 1, 'status': OrderItem.Status.PREPARING},
                ],
            },
            {
                'table': tables.get(5),
                'waiter': waiter1,
                'status': Order.Status.READY,
                'notes': 'Sin cebolla',
                'items': [
                    {'menu_item': items.get('Ensalada Cesar con Pollo'), 'quantity': 1, 'status': OrderItem.Status.READY},
                    {'menu_item': items.get('Brocheta de Carne'), 'quantity': 1, 'status': OrderItem.Status.READY},
                    {'menu_item': items.get('3 Quesos'), 'quantity': 1, 'status': OrderItem.Status.READY},
                ],
            },
            {
                'table': tables.get(7),
                'waiter': waiter2,
                'status': Order.Status.PREPARING,
                'notes': '',
                'items': [
                    {'menu_item': items.get('Pasticho'), 'quantity': 1, 'status': OrderItem.Status.READY},
                    {'menu_item': items.get('Ensalada Cesar'), 'quantity': 1, 'status': OrderItem.Status.PREPARING},
                    {'menu_item': items.get('Tequeños'), 'quantity': 2, 'status': OrderItem.Status.PREPARING},
                ],
            },
            {
                'table': tables.get(9),
                'waiter': waiter1,
                'status': Order.Status.PENDING,
                'notes': 'Mesa en terraza',
                'items': [
                    {'menu_item': items.get('Alitas Bufalo'), 'quantity': 1, 'status': OrderItem.Status.PENDING},
                    {'menu_item': items.get('Pepperoni'), 'quantity': 1, 'status': OrderItem.Status.PENDING},
                    {'menu_item': items.get('Salchipapa Normal'), 'quantity': 1, 'status': OrderItem.Status.PENDING},
                    {'menu_item': items.get('Pastas'), 'quantity': 1, 'status': OrderItem.Status.PENDING},
                ],
            },
        ]

        # Saltar si ya hay pedidos de prueba (idempotencia)
        existing_sample = Order.objects.filter(
            table__in=[t.get('table') for t in orders_data if t.get('table')]
        )
        if existing_sample.exists():
            self.stdout.write('    - Pedidos ya existen, salteando')
            return

        for order_data in orders_data:
            items_list = order_data.pop('items')
            table = order_data['table']
            if not table:
                continue

            order = Order.objects.create(
                table=table,
                waiter=order_data['waiter'],
                status=order_data['status'],
                notes=order_data['notes'],
                created_at=timezone.now() - timezone.timedelta(minutes=15),
            )

            for item_data in items_list:
                menu_item = item_data['menu_item']
                if not menu_item:
                    continue
                OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    quantity=item_data['quantity'],
                    unit_price=menu_item.price,
                    status=item_data['status'],
                )
            self.stdout.write(f'    - Pedido #{order.id} creado (Mesa {table.number}, {order.status})')

        # Marcar mesas ocupadas como occupied
        for order_data in orders_data:
            table = order_data.get('table')
            if table and table.status == Table.Status.FREE:
                table.status = Table.Status.OCCUPIED
                table.save()

    def _create_bills(self):
        self.stdout.write('  Creando cuentas de ejemplo...')

        try:
            cashier = User.objects.get(username='cashier')
        except User.DoesNotExist:
            self.stdout.write('    - Cajero no encontrado, salteando cuentas')
            return

        if Bill.objects.exists():
            self.stdout.write('    - Cuentas ya existen, salteando')
            return

        ready_orders = Order.objects.filter(status=Order.Status.READY)
        for order in ready_orders:
            total = sum(
                item.unit_price * item.quantity for item in order.items.all()
            )
            bill = Bill.objects.create(
                order=order,
                subtotal=total,
                tax=0,
                total=total,
                status=Bill.Status.PENDING,
            )
            self.stdout.write(f'    - Cuenta #{bill.id} creada (Mesa {order.table.number})')
