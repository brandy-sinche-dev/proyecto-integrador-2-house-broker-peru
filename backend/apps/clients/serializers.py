"""Serializadores de la ficha y el historial del cliente (HU-CRM-03).

La ficha se serializa desde el diccionario que arma `services.build_client_profile`
para que los agregados no vuelvan a tocar la base. Los campos de la cuenta y del
perfil comercial son anulables donde el contrato lo permite: una cuenta sin
`client_profile` no es un error, es un cliente al que todavía no se le captaron
preferencias.
"""

from rest_framework import serializers

from apps.appointments.models import AppointmentStatus
from apps.appointments.serializers import (
    AppointmentPersonRefSerializer,
    AppointmentSerializer,
    UtcDateTimeField,
)
from apps.properties.models import (
    Currency,
    PropertyStatus,
    PropertyType,
)

from .services import HISTORY_TYPES


class ClientProfileSummarySerializer(serializers.Serializer):
    """`ClientProfileSummary`: agregados de citas e inmuebles."""

    appointments_total = serializers.IntegerField()
    appointments_upcoming = serializers.IntegerField()
    appointments_completed = serializers.IntegerField()
    appointments_cancelled = serializers.IntegerField()
    appointments_no_show = serializers.IntegerField()
    properties_total = serializers.IntegerField()
    favorite_properties_total = serializers.IntegerField()
    last_appointment_at = UtcDateTimeField(allow_null=True)
    next_appointment_at = UtcDateTimeField(allow_null=True)


class ClientPropertySerializer(serializers.Serializer):
    """`ClientProperty`: inmueble asociado a las citas del cliente."""

    id = serializers.CharField()
    title = serializers.CharField()
    district = serializers.CharField(allow_null=True, required=False)
    address = serializers.CharField(required=False)
    price = serializers.FloatField(required=False)
    currency = serializers.ChoiceField(choices=Currency.choices, required=False)
    property_type = serializers.ChoiceField(
        choices=PropertyType.choices, required=False
    )
    status = serializers.ChoiceField(
        choices=PropertyStatus.choices, required=False
    )
    is_active = serializers.BooleanField(required=False)
    appointments_count = serializers.IntegerField()
    last_appointment_at = UtcDateTimeField(allow_null=True, required=False)
    next_appointment_at = UtcDateTimeField(allow_null=True, required=False)


class ClientProfileSerializer(serializers.Serializer):
    """`ClientProfile`: ficha consolidada de la cuenta cliente."""

    id = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField(allow_null=True)
    phone = serializers.CharField(allow_null=True)
    is_active = serializers.BooleanField()
    created_at = UtcDateTimeField()
    updated_at = UtcDateTimeField()
    budget_min = serializers.FloatField(allow_null=True, required=False)
    budget_max = serializers.FloatField(allow_null=True, required=False)
    budget_currency = serializers.ChoiceField(choices=Currency.choices)
    preferred_district = serializers.CharField(
        allow_null=True, required=False
    )
    # `ClientPreferences` declara `additionalProperties: true` porque la base
    # guarda jsonb sin validar la forma: `JSONField` conserva tanto las claves
    # conocidas como las que agregue el asistente en el futuro.
    preferences = serializers.JSONField(allow_null=True, required=False)
    interest_level = serializers.IntegerField(
        allow_null=True, required=False
    )
    summary = ClientProfileSummarySerializer()
    associated_properties = ClientPropertySerializer(many=True)


class ClientHistoryEntrySerializer(serializers.Serializer):
    """`ClientHistoryEntry`: un hecho de la línea de tiempo del cliente."""

    id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=HISTORY_TYPES)
    occurred_at = UtcDateTimeField()
    appointment = AppointmentSerializer()
    previous_status = serializers.ChoiceField(
        choices=AppointmentStatus.choices, allow_null=True, required=False
    )
    status = serializers.ChoiceField(choices=AppointmentStatus.choices)
    scheduled_at = UtcDateTimeField()
    previous_scheduled_at = UtcDateTimeField(allow_null=True, required=False)
    reason = serializers.CharField(allow_null=True, required=False)
    changed_by = AppointmentPersonRefSerializer(
        allow_null=True, required=False
    )
