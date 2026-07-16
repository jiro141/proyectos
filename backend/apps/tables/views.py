from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Table
from .serializers import TableSerializer
from apps.accounts.permissions import IsAdminOrReadOnly

class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all()
    serializer_class = TableSerializer

    def get_permissions(self):
        if self.action in ('occupy', 'free', 'start_cleaning'):
            return [permissions.IsAuthenticated()]
        return [IsAdminOrReadOnly()]

    @action(detail=True, methods=['post'])
    def occupy(self, request, pk=None):
        table = self.get_object()
        if table.status != 'free':
            return Response({'error': 'La mesa no está libre'}, status=status.HTTP_400_BAD_REQUEST)
        table.status = 'occupied'
        table.save()
        return Response(TableSerializer(table).data)

    @action(detail=True, methods=['post'])
    def free(self, request, pk=None):
        table = self.get_object()
        table.status = 'free'
        table.save()
        return Response(TableSerializer(table).data)

    @action(detail=True, methods=['post'])
    def start_cleaning(self, request, pk=None):
        table = self.get_object()
        if table.status not in ('occupied', 'free'):
            return Response({'error': 'La mesa no puede pasar a limpieza desde su estado actual'},
                            status=status.HTTP_400_BAD_REQUEST)
        table.status = 'cleaning'
        table.save()
        return Response(TableSerializer(table).data)
