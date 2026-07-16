from django.contrib import admin
from .models import Table

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('number', 'capacity', 'location', 'status', 'updated_at')
    list_editable = ('status',)
    list_filter = ('status',)
