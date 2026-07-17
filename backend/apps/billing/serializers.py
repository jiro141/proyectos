from rest_framework import serializers
from .models import Bill
from apps.orders.models import OrderItem

class BillItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='menu_item.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'item_name', 'quantity', 'unit_price', 'notes']

class BillSerializer(serializers.ModelSerializer):
    table_number = serializers.IntegerField(source='order.table.number', read_only=True)
    waiter_name = serializers.CharField(source='order.waiter.get_full_name', read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = '__all__'
        read_only_fields = ('created_at', 'paid_at')

    def get_items(self, obj):
        order_items = obj.order.items.all()
        return BillItemSerializer(order_items, many=True).data
