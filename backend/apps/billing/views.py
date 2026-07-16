from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from decimal import Decimal
from .models import Bill
from .serializers import BillSerializer
from apps.orders.models import Order

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer

    def get_queryset(self):
        qs = Bill.objects.all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=False, methods=['post'])
    def generate(self, request):
        order_id = request.data.get('order')
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Pedido no encontrado'}, status=404)

        if order.status != 'delivered':
            return Response({'error': 'El pedido debe estar entregado para generar la cuenta'}, status=400)

        if hasattr(order, 'bill'):
            return Response({'error': 'La cuenta ya fue generada'}, status=400)

        subtotal = sum(item.quantity * item.unit_price for item in order.items.all())
        tax = subtotal * Decimal('0.10')
        total = subtotal + tax

        bill = Bill.objects.create(
            order=order,
            subtotal=subtotal,
            tax=tax,
            total=total,
            cashier=request.user,
        )

        order.status = 'billed'
        order.save()

        return Response(BillSerializer(bill).data, status=201)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        bill = self.get_object()
        if bill.status != 'pending':
            return Response({'error': 'La cuenta ya fue pagada o cancelada'}, status=400)

        payment_method = request.data.get('payment_method', 'cash')
        cash_amount = request.data.get('cash_amount')

        change = None
        if payment_method == 'cash':
            cash_amount = Decimal(str(cash_amount or 0))
            if cash_amount < bill.total:
                return Response({'error': 'Monto insuficiente'}, status=400)
            change = cash_amount - bill.total

        bill.payment_method = payment_method
        bill.cash_amount = cash_amount
        bill.change = change
        bill.status = 'paid'
        bill.cashier = request.user
        bill.paid_at = timezone.now()
        bill.save()

        table = bill.order.table
        table.status = 'cleaning'
        table.save()

        return Response(BillSerializer(bill).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_billed = Bill.objects.aggregate(total=Sum('total'))['total'] or 0
        paid = Bill.objects.filter(status='paid')
        total_paid = paid.aggregate(total=Sum('total'))['total'] or 0
        total_pending = Bill.objects.filter(status='pending').aggregate(total=Sum('total'))['total'] or 0
        recent_payments = paid.order_by('-paid_at')[:10]

        data = {
            'total_billed': total_billed,
            'total_paid': total_paid,
            'total_pending': total_pending,
            'recent_payments': BillSerializer(recent_payments, many=True).data,
        }
        return Response(data)
