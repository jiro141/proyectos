from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.OrderViewSet, basename='order')
router.register(r'items', views.OrderItemViewSet, basename='order-item')

urlpatterns = [
    path('', include(router.urls)),
]
