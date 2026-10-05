from rest_framework import serializers

from . import services
from .models import Property, PropertyImage, PropertySchedule, PropertyStatus, Weekday
from .problems import ProblemError


class StrictFieldsSerializer(serializers.Serializer):
    """Rechaza campos desconocidos, como el `additionalProperties: false`.

    Ignorarlos en silencio sería peor que rechazarlos: el clienteCreería que
    guardó algo que la base nunca guardó, que es exactamente la clase de bug
    que un `PATCH` de estado no puede permitirse.
    """

    def to_internal_value(self, data):
        if isinstance(data, dict):
            unknown = sorted(set(data) - set(self.fields))
            if unknown:
                raise ProblemError(
                    code="invalid_query_parameter",
                    detail=(
                        f"El cuerpo trae campos no previstos: {', '.join(unknown)}."
                    ),
                    errors=[
                        {"parameter": name, "message": "Campo no reconocido."}
                        for name in unknown
                    ],
                )
        return super().to_internal_value(data)


class PropertyImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = ("id", "url", "sort_order", "is_cover", "alt_text", "width", "height")

    def get_url(self, obj):
        return obj.get_url()


class SellerSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.CharField(read_only=True)
    phone = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return (
            getattr(obj, "full_name", "")
            or obj.get_full_name()
            or obj.get_username()
        )

    def get_phone(self, obj):
        return getattr(obj, "phone", None)


class PropertySerializer(serializers.ModelSerializer):
    moneda = serializers.CharField(source="currency")
    area_construida = serializers.DecimalField(
        source="area_built", max_digits=10, decimal_places=2, allow_null=True
    )
    dormitorios = serializers.IntegerField(source="bedrooms", allow_null=True)
    banos = serializers.IntegerField(source="bathrooms", allow_null=True)
    estacionamientos = serializers.IntegerField(source="parking_spaces")
    link_galeria = serializers.CharField(source="exterior_url", allow_null=True)
    link_planos = serializers.CharField(source="floorplan_url", allow_null=True)
    negociable = serializers.BooleanField(source="is_negotiable", allow_null=True)
    destacado = serializers.BooleanField(source="is_featured")
    mantenimiento = serializers.DecimalField(
        source="maintenance_fee", max_digits=10, decimal_places=2, allow_null=True
    )
    images = PropertyImageSerializer(many=True, read_only=True)
    seller = SellerSerializer(source="agent", read_only=True)
    # Cascada del catálogo (RF-PROP-04): `status` y `is_bookable` son lo que
    # permite a la ficha pública ocultar la botonera de reserva cuando el
    # inmueble deja de estar disponible. Son campos aditivos: el schema
    # `Property` del spec no los declara, y sin ellos la cascada no tiene por
    # dónde viajar hasta el cliente.
    status = serializers.CharField(read_only=True)
    is_bookable = serializers.BooleanField(read_only=True)

    class Meta:
        model = Property
        fields = (
            "id",
            "title",
            "price",
            "moneda",
            "mode",
            "address",
            "property_type",
            "is_active",
            "status",
            "is_bookable",
            "created_at",
            "area_total",
            "area_construida",
            "dormitorios",
            "banos",
            "estacionamientos",
            "link_galeria",
            "link_planos",
            "negociable",
            "destacado",
            "mantenimiento",
            "images",
            "seller",
        )
        read_only_fields = fields


# -------------------------------------------------------------
# Estado operativo
# -------------------------------------------------------------


class PropertyStatusInputSerializer(StrictFieldsSerializer):
    """Cuerpo del `PATCH .../status`."""

    status = serializers.ChoiceField(choices=PropertyStatus.choices)
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        min_length=services.REASON_MIN_LENGTH,
        max_length=services.REASON_MAX_LENGTH,
    )


class PropertyStatusResultSerializer(serializers.Serializer):
    """Lectura del resultado, con la trazabilidad del cambio."""

    id = serializers.UUIDField()
    status = serializers.CharField()
    previous_status = serializers.CharField()
    is_active = serializers.BooleanField()
    reason = serializers.CharField(allow_null=True, required=False)
    changed_by = serializers.SerializerMethodField()
    changed_at = serializers.DateTimeField()

    def get_changed_by(self, obj) -> str | None:
        # El contrato lo tipa como uuid, que es lo que será la pk del usuario
        # propio. Con `django.contrib.auth.User` la pk sigue siendo un entero, y
        # un `UUIDField` en `to_representation` reventaría con ella, así que se
        # convierte a texto sin asumir el tipo.
        return None if obj.changed_by is None else str(obj.changed_by)


# -------------------------------------------------------------
# Agenda semanal
# -------------------------------------------------------------


class TimeSlotInputSerializer(StrictFieldsSerializer):
    """Franja pedida: `HH:MM` en 24 horas, sin zona."""

    start_time = serializers.CharField()
    end_time = serializers.CharField()

    @staticmethod
    def to_slot(data: dict, path: str) -> services.SlotInput:
        """Convierte un dict ya validado en `SlotInput`.

        Recibe el dict y no `self` porque, con `many=True`, DRF entrega
        `validated_data` como una lista de dicts y no de instancias hijas: el
        método tiene que poder invocarse sobre el dato, no sobre el serializer.
        """
        return services.SlotInput(
            start_time=services.parse_hhmm(data["start_time"], f"{path}.start_time"),
            end_time=services.parse_hhmm(data["end_time"], f"{path}.end_time"),
        )


class WeekdayScheduleInputSerializer(StrictFieldsSerializer):
    """Día con sus franjas."""

    weekday = serializers.ChoiceField(
        choices=[choice.name for choice in Weekday],
        error_messages={"invalid_choice": "El día '{input}' no existe."},
    )
    slots = TimeSlotInputSerializer(many=True, allow_empty=False)

    @staticmethod
    def to_days_entry(data: dict, path: str) -> tuple[str, list[services.SlotInput]]:
        slots = [
            TimeSlotInputSerializer.to_slot(slot, f"{path}.slots[{index}]")
            for index, slot in enumerate(data["slots"])
        ]
        return data["weekday"], slots


class PropertySchedulesInputSerializer(StrictFieldsSerializer):
    """Configuración semanal completa que reemplaza a la anterior."""

    days = WeekdayScheduleInputSerializer(many=True, required=True)

    def to_week(self) -> list[tuple[str, list[services.SlotInput]]]:
        days = self.validated_data["days"]
        if len(days) > 7:
            raise serializers.ValidationError(
                {"days": [f"La semana admite como máximo 7 días, llegaron {len(days)}."]}
            )
        return [
            WeekdayScheduleInputSerializer.to_days_entry(day, f"days[{index}]")
            for index, day in enumerate(days)
        ]


class ScheduleSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertySchedule
        fields = ("id", "start_time", "end_time", "is_active")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["start_time"] = services.format_hhmm(instance.start_time)
        data["end_time"] = services.format_hhmm(instance.end_time)
        return data


def build_schedules_payload(property_obj, slots) -> dict:
    """Arma `PropertySchedules` con los siete días siempre presentes.

    Los días sin franjas vienen con `slots: []` para que el cliente pueda
    pintar la semana completa sin tratar la ausencia como "todavía no cargó".
    """
    grouped = {choice.value: [] for choice in Weekday}
    for slot in slots:
        grouped.setdefault(slot.weekday, []).append(slot)

    days = []
    total = 0
    for weekday in sorted(grouped):
        day_slots = sorted(grouped[weekday], key=lambda item: item.start_time)
        total += len(day_slots)
        days.append(
            {
                "weekday": services.ENUM_FROM_WEEKDAY[weekday],
                "slots": ScheduleSlotSerializer(day_slots, many=True).data,
            }
        )

    return {
        "property_id": property_obj.id,
        "timezone": services.schedule_timezone(),
        "total_slots": total,
        "days": days,
    }
