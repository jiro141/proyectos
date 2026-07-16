from django.db import models

class Table(models.Model):
    class Status(models.TextChoices):
        FREE = 'free', 'Libre'
        OCCUPIED = 'occupied', 'Ocupada'
        RESERVED = 'reserved', 'Reservada'
        CLEANING = 'cleaning', 'Limpieza'

    number = models.IntegerField(unique=True, verbose_name='Numero')
    capacity = models.IntegerField(verbose_name='Capacidad')
    location = models.CharField(max_length=100, blank=True, verbose_name='Ubicacion')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.FREE,
        verbose_name='Estado'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Mesa'
        verbose_name_plural = 'Mesas'
        ordering = ['number']

    def __str__(self):
        return f'Mesa {self.number} ({self.capacity} pers.)'
