"""Rutas de RF-CRM-01 (TASK-BACK-CRM-01), siempre sin barra final.

El contrato (`docs/api/openapi_spec.yaml`) publica `/api/v1/appointments`
sin barra, igual que el resto de rutas del spec: en OpenAPI la variante con
barra es un recurso distinto y registrarla crearía una operación duplicada.

`APPEND_SLASH` de Django no sirve para esto: solo *añade* una barra cuando
la URL sin ella no resuelve, nunca la quita. Así que `POST
/api/v1/appointments/` responde `301` a la URL canónica explícitamente, que
es lo que pide `docs/api/README.md`, en vez de caer en un `404` de Django
sin el sobre `application/problem+json`.
"""

from django.http import HttpResponsePermanentRedirect
from django.urls import path, re_path, reverse
from rest_framework.routers import SimpleRouter

from .views import AppointmentViewSet, AvailableSlotsView

router = SimpleRouter(trailing_slash=False)
router.register("appointments", AppointmentViewSet, basename="appointment")


def appointment_list_slash(request, *args, **kwargs):
    """`/api/v1/appointments/` -> `301` -> `/api/v1/appointments`."""
    return HttpResponsePermanentRedirect(reverse("appointment-list"))


urlpatterns = [
    # Mismo `lookup_value_regex` que `properties.PropertyViewSet`, para que un
    # identificador mal formado falle igual en las dos apps.
    re_path(
        r"^properties/(?P<id>[0-9a-f-]{36})/available-slots$",
        AvailableSlotsView.as_view(),
        name="property-available-slots",
    ),
    path("appointments/", appointment_list_slash, name="appointment-list-slash"),
    *router.urls,
]
