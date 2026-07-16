from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='menu_item.name', read_only=True)
    item_price = serializers.DecimalField(source='menu_item.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'order', 'unit_price')

    def create(self, validated_data):
        menu_item = validated_data.get('menu_item')
        if menu_item:
            validated_data['unit_price'] = menu_item.price
        return super().create(validated_data)

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    table_number = serializers.IntegerField(source='table.number', read_only=True)
    waiter_name = serializers.CharField(source='waiter.get_full_name', read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'waiter')
