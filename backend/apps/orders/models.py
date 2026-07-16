from django.db import models
from django.conf import settings

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        PREPARING = 'preparing', 'Preparando'
        READY = 'ready', 'Listo'
        DELIVERED = 'delivered', 'Entregado'
        BILLED = 'billed', 'Facturado'

    table = models.ForeignKey(
        'tables.Table',
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='Mesa'
    )
    waiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='Mesonero'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Estado'
    )
    notes = models.TextField(blank=True, verbose_name='Notas')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pedido #{self.id} - Mesa {self.table.number}'

class OrderItem(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        PREPARING = 'preparing', 'Preparando'
        READY = 'ready', 'Listo'
        DELIVERED = 'delivered', 'Entregado'
        CANCELLED = 'cancelled', 'Cancelado'

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Pedido'
    )
    menu_item = models.ForeignKey(
        'menu.MenuItem',
        on_delete=models.PROTECT,
        verbose_name='Item'
    )
    quantity = models.IntegerField(default=1, verbose_name='Cantidad')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio Unitario')
    notes = models.TextField(blank=True, verbose_name='Notas')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Estado'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Item del Pedido'
        verbose_name_plural = 'Items del Pedido'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.quantity}x {self.menu_item.name}'
