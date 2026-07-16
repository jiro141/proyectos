from django.contrib import admin
from .models import Category, MenuItem

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'sort_order', 'created_at')
    list_editable = ('sort_order',)

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'available', 'created_at')
    list_filter = ('category', 'available')
    list_editable = ('available',)
    search_fields = ('name',)
