"""Serializadores de las citas de visita (RF-CRM-01, TASK-BACK-CRM-01).

El contrato separa la entrada de la salida:

- `AppointmentCreateInput` es estricto (`additionalProperties: false`): un
  campo que el cliente creyó guardar y que la base ignoró es peor que un
  `400`.
- `Appointment` devuelve dos referencias ligeras, no el inmueble entero ni el
  perfil completo de los participantes, porque el listado de citas las solo
  necesita identificar (`docs/api/README.md`, notas al schema `Appointment`).
"""

import uuid

from rest_framework import serializers

from apps.properties.serializers import StrictFieldsSerializer

from .models import Appointment
from .services import format_iso_utc


class UtcDateTimeField(serializers.DateTimeField):
    """`date-time` en UTC con sufijo `Z`, el formato que fija el contrato.

    DRF formatea en `settings.TIME_ZONE` (`America/Lima`) y con offset local
    (`2026-10-08T11:00:00-05:00`); el spec escribe todos los instantes con
    `Z` y es el mismo formato que ya usa `available-slots`, así que una cita
    y una franja se pueden comparar como texto.
    """

    def to_representation(self, value):
        return format_iso_utc(value)


class UserIdField(serializers.Field):
    """Identificador de usuario tal como sale en la API, no como lo guarda la pk.

    El contrato escribe `client_id` con `format: uuid`, que es como se
    serializa a cada participante (`AppointmentPersonRef.id`), pero el modelo
    activo manda: con `django.contrib.auth.User` la pk es un `AutoField`, así
    que un `"5"` tiene que llegar al servicio en vez de reventar en un `400`
    de formato. El campo acepta las dos formas y `services._resolve_client`
    traduce cada una al tipo de pk que el modelo espera, de modo que un id que
    no encaja responde `404 resource_not_found`, como documenta el `404`.
    """

    default_error_messages = {
        "invalid": "Debe ser un identificador de usuario valido.",
    }

    def to_internal_value(self, data):
        if isinstance(data, bool) or not isinstance(data, (int, str)):
            self.fail("invalid")
        raw = str(data).strip()
        if raw.isdecimal():
            return int(raw)
        try:
            return uuid.UUID(raw)
        except ValueError:
            self.fail("invalid")


class AppointmentCreateInputSerializer(StrictFieldsSerializer):
    """Cuerpo del `POST /api/v1/appointments` (`AppointmentCreateInput`).

    `client_id` es opcional porque solo lo envía un agente o un administrador;
    que un `CLIENTE` lo envía igual no lo rechaza el serializer sino el
    servicio, que responde `403 forbidden` con el detalle documentado.
    """

    property_id = serializers.UUIDField()
    scheduled_at = serializers.DateTimeField()
    client_id = UserIdField(required=False, allow_null=True)


class AppointmentPropertyRefSerializer(serializers.Serializer):
    """`AppointmentPropertyRef`: identifica el inmueble, no lo replica."""

    id = serializers.UUIDField()
    title = serializers.CharField()
    district = serializers.SerializerMethodField()
    address = serializers.CharField()

    def get_district(self, obj):
        return obj.district.name if obj.district_id else None


class AppointmentPersonRefSerializer(serializers.Serializer):
    """`AppointmentPersonRef`: cliente y agente comparten la misma forma."""

    id = serializers.UUIDField()
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        # Mismo criterio que `properties.SellerSerializer`: el usuario propio
        # todavía no tiene columna `full_name`, y un usuario sin nombre real
        # no debe salir con un string vacío.
        return (
            getattr(obj, "full_name", "")
            or obj.get_full_name()
            or obj.get_username()
        )

    def get_email(self, obj):
        return obj.email or None

    def get_phone(self, obj):
        # `django.contrib.auth.User` no tiene `phone` todavía; el getattr lo
        # devuelve en cuanto `TASK-BACK-SEC-01` agregue el perfil.
        return getattr(obj, "phone", None) or None


class AppointmentSerializer(serializers.ModelSerializer):
    """`Appointment`, la representación de lectura del `201` y de CRM."""

    scheduled_at = UtcDateTimeField()
    created_at = UtcDateTimeField()
    updated_at = UtcDateTimeField()
    property = AppointmentPropertyRefSerializer()
    client = AppointmentPersonRefSerializer()
    agent = AppointmentPersonRefSerializer()

    class Meta:
        model = Appointment
        fields = (
            "id",
            "status",
            "scheduled_at",
            "duration_minutes",
            "reason",
            "property",
            "client",
            "agent",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
