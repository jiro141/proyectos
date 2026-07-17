from django.db import models
from django.conf import settings

class Bill(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = 'cash', 'Efectivo'
        CARD = 'card', 'Tarjeta'
        TRANSFER = 'transfer', 'Transferencia'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        PAID = 'paid', 'Pagado'
        CANCELLED = 'cancelled', 'Cancelado'

    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='bill',
        verbose_name='Pedido'
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Subtotal')
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Impuesto')
    total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Total')
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        blank=True,
        verbose_name='Metodo de pago'
    )
    cash_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Monto en efectivo')
    change = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Vuelto')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Estado'
    )
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        related_name='bills',
        verbose_name='Cajero'
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='Pagado en')
    closed = models.BooleanField(default=False, verbose_name='Cerrado')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Cuenta'
        verbose_name_plural = 'Cuentas'
        ordering = ['-created_at']

    def __str__(self):
        return f'Cuenta #{self.id} - Mesa {self.order.table.number} - ${self.total}'
