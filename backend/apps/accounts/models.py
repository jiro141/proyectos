from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        WAITER = 'waiter', 'Mesonero'
        KITCHEN = 'kitchen', 'Cocina'
        CASHIER = 'cashier', 'Caja'
        ADMIN = 'admin', 'Administrador'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.WAITER,
        verbose_name='Rol'
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.get_full_name()} ({self.get_role_display()})'
