from rest_framework import serializers
from .models import Bill

class BillSerializer(serializers.ModelSerializer):
    table_number = serializers.IntegerField(source='order.table.number', read_only=True)
    waiter_name = serializers.CharField(source='order.waiter.get_full_name', read_only=True)

    class Meta:
        model = Bill
        fields = '__all__'
        read_only_fields = ('created_at', 'paid_at')
