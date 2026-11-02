"""Rutas de la ficha y el historial del cliente (HU-CRM-03), sin barra final."""

from django.urls import path

from .views import ClientHistoryView, ClientProfileView

urlpatterns = [
    path(
        "clients/<str:id>/profile",
        ClientProfileView.as_view(),
        name="client-profile",
    ),
    path(
        "clients/<str:id>/history",
        ClientHistoryView.as_view(),
        name="client-history",
    ),
]
