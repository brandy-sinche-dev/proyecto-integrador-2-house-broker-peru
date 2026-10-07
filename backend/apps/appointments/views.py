"""Endpoints de RF-CRM-01 (TASK-BACK-CRM-01).

Dos operaciones con dos niveles de acceso distintos:

- `GET /api/v1/properties/{id}/available-slots` es **pública**: solo devuelve
  horas libres del inmueble, nunca datos de las citas que las ocupan, y es lo
  que permite pintar el calendario en la ficha sin sesión previa.
- `POST /api/v1/appointments` exige sesión: la cita siempre queda a nombre de
  alguien.

Las dos rutas viven en esta app porque las reglas que las sostienen
(`materialize_day`, `create_appointment`) también; `properties` no necesita
saber que existen las citas.
"""

from django.urls import reverse
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.properties.permissions import IsAuthenticatedUser
from apps.properties.problems import ProblemResponseMixin

from . import emails, services
from .models import Appointment
from .serializers import (
    AppointmentCreateInputSerializer,
    AppointmentSerializer,
)

APPOINTMENTS_PATH = "/api/v1/appointments"


class AvailableSlotsView(ProblemResponseMixin, APIView):
    """`GET .../available-slots` — horarios libres de un inmueble en una fecha.

    `date` es obligatorio y representa un día local de Lima; la respuesta
    trae los `start_at` en UTC. Un día sin atención no es un error: devuelve
    `200` con `slots: []`, igual que `GET .../schedules`.
    """

    permission_classes = [AllowAny]

    def get(self, request, id):
        day = services.parse_date(request.query_params.get("date"))
        services.validate_horizon(
            day,
            parameter="date",
            past_detail="No se puede consultar disponibilidad de una fecha pasada.",
        )
        prop = services.property_or_404(id)
        return Response(services.available_slots_payload(prop, day))


class AppointmentViewSet(ProblemResponseMixin, viewsets.GenericViewSet):
    """`POST /api/v1/appointments` — alta de una solicitud de visita.

    Solo `create`: el listado y los cambios de estado son `TASK-BACK-CRM-02`
    (#97), que extiende este mismo viewset. Con `SimpleRouter` eso también
    fija el `405` del `GET` sobre la colección, que todavía no existe.
    """

    permission_classes = [IsAuthenticatedUser]
    serializer_class = AppointmentSerializer
    queryset = Appointment.objects.select_related(
        "property__district", "client", "agent"
    )

    def create(self, request, *args, **kwargs):
        payload = AppointmentCreateInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        validated = payload.validated_data

        appointment = services.create_appointment(
            property_id=validated["property_id"],
            scheduled_at=validated["scheduled_at"],
            client_id=validated.get("client_id"),
            actor=request.user,
        )

        # Los correos van después de que la cita ya está confirmada en base:
        # su fallo es logueado y no puede revocar la reserva (RF-SEC-05).
        emails.send_appointment_emails(appointment)

        location = request.build_absolute_uri(
            f"{reverse('appointment-list')}/{appointment.id}"
        )
        return Response(
            AppointmentSerializer(appointment).data,
            status=http_status.HTTP_201_CREATED,
            headers={"Location": location},
        )
