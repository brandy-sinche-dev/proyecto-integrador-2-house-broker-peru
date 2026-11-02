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
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.properties.pagination import PropertyPagination
from apps.properties.permissions import IsAuthenticatedUser
from apps.properties.problems import ProblemError, ProblemResponseMixin

from . import emails, services
from .filters import (
    apply_appointment_filters,
    check_role_scope,
    default_role,
    parse_appointment_filters,
)
from .models import Appointment
from .permissions import CanChangeAppointmentStatus
from .serializers import (
    AppointmentCreateInputSerializer,
    AppointmentSerializer,
    AppointmentStatusInputSerializer,
    AppointmentStatusResultSerializer,
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
    """`POST` y `GET /api/v1/appointments` (RF-CRM-01 y RF-CRM-02).

    El listado (RF-CRM-02) hace de devolución al `405` de la colección: la
    agenda que se le muestra al usuario depende de su rol, y `role` permite
    elegir explícitamente una de las perspectivas que ese rol cubre. El
    `PATCH .../status` es la máquina de estados de RF-CRM-02.
    """

    permission_classes = [IsAuthenticatedUser]
    serializer_class = AppointmentSerializer
    pagination_class = PropertyPagination
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"
    queryset = Appointment.objects.select_related(
        "property__district", "client", "agent"
    )

    def list(self, request, *args, **kwargs):
        filters = parse_appointment_filters(request.query_params)
        role = filters.role or default_role(request.user)
        check_role_scope(default_role(request.user), role)

        queryset = apply_appointment_filters(
            self.get_queryset(), role=role, user=request.user, filters=filters
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            if getattr(self.paginator, "page", None) is not None:
                response["X-Total-Count"] = self.paginator.page.paginator.count
            return response
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

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

    @action(
        detail=True,
        methods=["patch"],
        url_path="status",
        permission_classes=[CanChangeAppointmentStatus],
    )
    def update_status(self, request, *args, **kwargs):
        """`PATCH .../status` — aceptar, rechazar, reprogramar o cerrar.

        El objeto se resuelve antes que el cuerpo a propósito: un `CLIENTE` que
        intenta cambiar una cita ajena recibe `403` sin que su payload llegue a
        validarse, y una cita inexistente responde `404` con el sobre del
        contrato.
        """
        # `get_object()` levantaría un `Http404` que el manejador global deja
        # con el sobre por defecto de DRF; el contrato pide
        # `application/problem+json` también en el `404`.
        appointment = self.get_queryset().filter(pk=self.kwargs["id"]).first()
        if appointment is None:
            raise ProblemError(
                code="resource_not_found",
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="No existe una cita con el identificador indicado.",
            )
        self.check_object_permissions(request, appointment)

        payload = AppointmentStatusInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        validated = payload.validated_data

        result = services.change_appointment_status(
            appointment,
            validated["status"],
            scheduled_at=validated.get("scheduled_at"),
            reason=validated.get("reason"),
            actor=request.user,
        )

        # Igual que en el alta: el correo va después del cambio ya persistido.
        # La repetición idempotente no genera un aviso nuevo.
        if result.changed:
            emails.send_status_change_emails(
                appointment,
                previous_status=result.previous_status,
                previous_scheduled_at=result.previous_scheduled_at,
                reason=result.reason,
            )

        return Response(
            AppointmentStatusResultSerializer(result).data,
            status=http_status.HTTP_200_OK,
        )
