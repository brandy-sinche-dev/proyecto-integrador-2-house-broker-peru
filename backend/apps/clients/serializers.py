"""Serializadores de la ficha y el historial del cliente (HU-CRM-03).

La ficha se serializa desde el diccionario que arma `services.build_client_profile`
para que los agregados no vuelvan a tocar la base. Los campos de la cuenta y del
perfil comercial son anulables donde el contrato lo permite: una cuenta sin
`client_profile` no es un error, es un cliente al que todavía no se le captaron
preferencias.
"""

from decimal import Decimal

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
from apps.properties.problems import ProblemError
from apps.properties.serializers import StrictFieldsSerializer

from .models import (
    INTEREST_LEVEL_MAX,
    INTEREST_LEVEL_MIN,
    NOTE_BODY_MAX_LENGTH,
    ClientNote,
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


class ClientNoteSerializer(serializers.ModelSerializer):
    """`ClientNote`: observación de atención de lectura."""

    client_id = serializers.UUIDField(read_only=True)
    author = AppointmentPersonRefSerializer(read_only=True)
    appointment_id = serializers.UUIDField(
        read_only=True, allow_null=True
    )
    body = serializers.CharField(max_length=NOTE_BODY_MAX_LENGTH)
    created_at = UtcDateTimeField()
    followup_at = UtcDateTimeField(allow_null=True)
    counteroffer_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )
    counteroffer_currency = serializers.ChoiceField(
        choices=Currency.choices, allow_null=True
    )

    class Meta:
        model = ClientNote
        fields = (
            "id",
            "client_id",
            "author",
            "appointment_id",
            "body",
            "interest_level",
            "client_showed_up",
            "counteroffer_amount",
            "counteroffer_currency",
            "followup_at",
            "created_at",
        )
        read_only_fields = fields


class ClientNoteCreateInputSerializer(StrictFieldsSerializer):
    """Cuerpo de `POST /api/v1/clients/{id}/notes`.

    Solo `body` es obligatorio. El autor, el cliente y la fecha los fija el
    servidor. La contraoferta se valida como pareja: monto sin moneda (o al
    revés) no significa nada.
    """

    body = serializers.CharField(
        max_length=NOTE_BODY_MAX_LENGTH,
        trim_whitespace=True,
    )
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    interest_level = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=INTEREST_LEVEL_MIN,
        max_value=INTEREST_LEVEL_MAX,
    )
    client_showed_up = serializers.BooleanField(
        required=False, allow_null=True
    )
    counteroffer_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal("0.01"),
    )
    counteroffer_currency = serializers.ChoiceField(
        choices=Currency.choices, required=False, allow_null=True
    )
    followup_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        amount = attrs.get("counteroffer_amount")
        currency = attrs.get("counteroffer_currency")
        if (amount is None) != (currency is None):
            missing = (
                "counteroffer_amount" if amount is None else "counteroffer_currency"
            )
            raise ProblemError(
                code="invalid_counteroffer",
                detail=(
                    "'counteroffer_amount' y 'counteroffer_currency' deben "
                    "enviarse juntos o ambos omitirse."
                ),
                errors=[
                    {
                        "parameter": missing,
                        "message": (
                            "Falta el monto de la contraoferta."
                            if missing == "counteroffer_amount"
                            else "Falta la moneda que acompaña al monto de la contraoferta."
                        ),
                    }
                ],
            )
        return attrs
