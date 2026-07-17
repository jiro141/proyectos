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
        include_closed = self.request.query_params.get('include_closed') == 'true'
        if not include_closed:
            qs = qs.filter(closed=False)
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

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def public(self, request, pk=None):
        bill = self.get_object()
        return Response(BillSerializer(bill).data)

    def _active_bills(self):
        """Bills no cerrados (para dashboard y operaciones diarias)."""
        return Bill.objects.filter(closed=False)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        active = self._active_bills()
        total_billed = active.aggregate(total=Sum('total'))['total'] or 0
        paid = active.filter(status='paid')
        total_paid = paid.aggregate(total=Sum('total'))['total'] or 0
        total_pending = active.filter(status='pending').aggregate(total=Sum('total'))['total'] or 0
        recent_payments = paid.order_by('-paid_at')[:10]

        data = {
            'total_billed': total_billed,
            'total_paid': total_paid,
            'total_pending': total_pending,
            'recent_payments': BillSerializer(recent_payments, many=True).data,
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def report(self, request):
        include_closed = request.query_params.get('include_closed') == 'true'
        base = Bill.objects.all() if include_closed else self._active_bills()

        # Filtro por fechas (solo admin)
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        has_date_filter = from_date is not None or to_date is not None
        if has_date_filter:
            is_admin = request.user.is_superuser or request.user.role == 'admin'
            if not is_admin:
                return Response(
                    {'error': 'Solo el administrador puede filtrar reportes por fecha'},
                    status=403,
                )
            # Reportes históricos: incluir bills cerrados también
            base = Bill.objects.all()
            if from_date:
                base = base.filter(paid_at__date__gte=from_date)
            if to_date:
                base = base.filter(paid_at__date__lte=to_date)

        paid = base.filter(status='paid').select_related(
            'order__table', 'cashier'
        ).order_by('-paid_at')

        total_sales = paid.aggregate(total=Sum('total'))['total'] or 0
        total_transactions = paid.count()
        average_ticket = total_sales / total_transactions if total_transactions > 0 else 0

        by_method = (
            paid.values('payment_method')
            .annotate(total=Sum('total'), count=Count('id'))
            .order_by('payment_method')
        )
        by_payment_method = {}
        for entry in by_method:
            method_key = entry['payment_method'] or 'sin_metodo'
            by_payment_method[method_key] = {
                'total': entry['total'],
                'count': entry['count'],
            }

        sales = []
        for bill in paid:
            sales.append({
                'bill_id': bill.id,
                'order_id': bill.order.id,
                'table_number': bill.order.table.number,
                'payment_method': bill.payment_method,
                'payment_method_display': bill.get_payment_method_display(),
                'total': bill.total,
                'cashier_name': bill.cashier.get_full_name() or bill.cashier.username if bill.cashier else '—',
                'paid_at': bill.paid_at,
            })

        data = {
            'summary': {
                'total_sales': total_sales,
                'total_transactions': total_transactions,
                'average_ticket': average_ticket,
            },
            'by_payment_method': by_payment_method,
            'sales': sales,
        }
        return Response(data)

    @action(detail=False, methods=['post'])
    def close_day(self, request):
        """Cierra el día: marca todas las cuentas pagadas como cerradas."""
        closed_count = Bill.objects.filter(status='paid', closed=False).update(
            closed=True,
        )
        return Response({
            'closed_count': closed_count,
            'message': f'Cierre del día completado. {closed_count} cuentas cerradas.',
        })
