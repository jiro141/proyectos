from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name='Nombre')
    description = models.TextField(blank=True, verbose_name='Descripcion')
    sort_order = models.IntegerField(default=0, verbose_name='Orden')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

class MenuItem(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nombre')
    description = models.TextField(blank=True, verbose_name='Descripcion')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='items', verbose_name='Categoria')
    available = models.BooleanField(default=True, verbose_name='Disponible')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Item del Menu'
        verbose_name_plural = 'Items del Menu'
        ordering = ['category__sort_order', 'name']

    def __str__(self):
        return f'{self.name} - ${self.price}'
