from rest_framework import generics, permissions
from .serializers import DeviceTokenSerializer


class RegisterDeviceView(generics.CreateAPIView):
    serializer_class = DeviceTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
