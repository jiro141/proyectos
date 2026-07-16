from django.contrib import admin
from .models import Bill

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'total', 'status', 'payment_method', 'paid_at')
    list_filter = ('status', 'payment_method', 'paid_at')
