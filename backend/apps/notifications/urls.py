from django.urls import path
from . import views

urlpatterns = [
    path('devices/register/', views.RegisterDeviceView.as_view(), name='register-device'),
]
