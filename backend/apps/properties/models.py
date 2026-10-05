import builtins
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

# `docs/database/catalogs.md` §"Reglas de franja": la duración se valida en el
# servicio y no con un `CHECK`, porque el mínimo y el máximo son una regla de
# negocio y no una propiedad de la fila. Aquí solo viven los valores.
SLOT_MIN_DURATION = timedelta(minutes=30)
SLOT_MAX_DURATION = timedelta(hours=8)


class PropertyType(models.TextChoices):
    DEPARTAMENTO = "DEPARTAMENTO", "Departamento"
    CASA = "CASA", "Casa"
    TERRENO = "TERRENO", "Terreno"
    OFICINA = "OFICINA", "Oficina"


class TransactionMode(models.TextChoices):
    VENTA = "VENTA", "Venta"
    ALQUILER = "ALQUILER", "Alquiler"


class Currency(models.TextChoices):
    PEN = "PEN", "Soles"
    USD = "USD", "Dólares"


class PropertyStatus(models.TextChoices):
    DISPONIBLE = "DISPONIBLE", "Disponible"
    RESERVADO = "RESERVADO", "Reservado"
    ALQUILADO = "ALQUILADO", "Alquilado"
    VENDIDO = "VENDIDO", "Vendido"
    SUSPENDIDO = "SUSPENDIDO", "Suspendido"


class Weekday(models.IntegerChoices):
    """Día de la semana tal como lo persiste la base (`catalogs.md` §3).

    El enum del API son strings (`LUNES`), pero la columna es un `smallint`:
    con enteros el `ORDER BY` sale lunes-primero y con los strings del enum
    saldría domingo-primero. La traducción vive en los serializers y en
    `services.py`, no en el modelo.
    """

    LUNES = 0, "Lunes"
    MARTES = 1, "Martes"
    MIERCOLES = 2, "Miércoles"
    JUEVES = 3, "Jueves"
    VIERNES = 4, "Viernes"
    SABADO = 5, "Sábado"
    DOMINGO = 6, "Domingo"


STATUS_VALUES = [status.value for status in PropertyStatus]


class District(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ubigeo = models.CharField(max_length=6, unique=True)
    name = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    department = models.CharField(max_length=100, default="Lima")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)
        constraints = [
            models.CheckConstraint(
                condition=Q(ubigeo__regex=r"^[0-9]{6}$"),
                name="district_ubigeo_format",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.ubigeo})"


class Property(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.PEN
    )
    mode = models.CharField(max_length=12, choices=TransactionMode.choices)
    property_type = models.CharField(max_length=20, choices=PropertyType.choices)
    status = models.CharField(
        max_length=15,
        choices=PropertyStatus.choices,
        default=PropertyStatus.DISPONIBLE,
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="properties",
    )
    district = models.ForeignKey(
        District, on_delete=models.PROTECT, related_name="properties"
    )
    address = models.CharField(max_length=300)
    reference = models.CharField(max_length=100, null=True, blank=True)
    area_total = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    area_built = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    bedrooms = models.SmallIntegerField(null=True, blank=True)
    bathrooms = models.SmallIntegerField(null=True, blank=True)
    parking_spaces = models.SmallIntegerField(default=0)
    maintenance_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    accepts_pets = models.BooleanField(default=False)
    accepts_children = models.BooleanField(default=False)
    is_negotiable = models.BooleanField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    exterior_url = models.URLField(max_length=500, null=True, blank=True)
    floorplan_url = models.URLField(max_length=500, null=True, blank=True)
    features = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True
    )
    owner_notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_properties",
    )
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(
                fields=["is_active", "status", "property_type", "-created_at"],
                name="property_catalog_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(price__gt=0), name="property_price_positive"
            ),
            models.CheckConstraint(
                condition=Q(currency__in=[c.value for c in Currency]),
                name="property_currency_check",
            ),
            models.CheckConstraint(
                condition=Q(mode__in=[m.value for m in TransactionMode]),
                name="property_mode_check",
            ),
            models.CheckConstraint(
                condition=Q(property_type__in=[t.value for t in PropertyType]),
                name="property_type_check",
            ),
            models.CheckConstraint(
                condition=Q(status__in=[s.value for s in PropertyStatus]),
                name="property_status_check",
            ),
            models.CheckConstraint(
                condition=Q(parking_spaces__gte=0),
                name="property_parking_positive",
            ),
            models.CheckConstraint(
                condition=Q(maintenance_fee__isnull=True) | Q(maintenance_fee__gte=0),
                name="property_maintenance_positive",
            ),
            models.CheckConstraint(
                condition=Q(area_total__isnull=True) | Q(area_total__gte=0),
                name="property_area_total_positive",
            ),
            models.CheckConstraint(
                condition=Q(area_built__isnull=True) | Q(area_built__gte=0),
                name="property_area_built_positive",
            ),
            models.CheckConstraint(
                condition=Q(bedrooms__isnull=True) | Q(bedrooms__gte=0),
                name="property_bedrooms_positive",
            ),
            models.CheckConstraint(
                condition=Q(bathrooms__isnull=True) | Q(bathrooms__gte=0),
                name="property_bathrooms_positive",
            ),
            models.CheckConstraint(
                condition=Q(commission_rate__isnull=True)
                | (Q(commission_rate__gte=0) & Q(commission_rate__lte=1)),
                name="property_commission_range",
            ),
            models.CheckConstraint(
                condition=~Q(status=PropertyStatus.SUSPENDIDO, is_active=True),
                name="property_suspended_is_inactive",
            ),
        ]

    def __str__(self):
        return f"{self.code} · {self.title}"

    @property
    def is_bookable(self) -> bool:
        """¿Admite visitas? Solo `DISPONIBLE` (`catalogs.md` §4.1).

        Vive en el modelo y no en el serializer porque es la misma pregunta
        que responde la cascada del catálogo: la botonera de reserva se oculta
        cuando esto es `False`, y el agendamiento de HU-CRM-01 tendrá que
        negarse con la misma condición.
        """
        return self.is_active and self.status == PropertyStatus.DISPONIBLE


class PropertyImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="images"
    )
    storage_key = models.CharField(max_length=500)
    sort_order = models.IntegerField(default=0)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    is_cover = models.BooleanField(default=False)
    alt_text = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("sort_order", "created_at")
        constraints = [
            models.UniqueConstraint(
                fields=["property", "storage_key"],
                name="property_image_storage_unique",
            ),
            models.UniqueConstraint(
                fields=["property"],
                condition=Q(is_cover=True),
                name="property_image_single_cover",
            ),
            models.CheckConstraint(
                condition=Q(width__isnull=True) | Q(width__gt=0),
                name="property_image_width_positive",
            ),
            models.CheckConstraint(
                condition=Q(height__isnull=True) | Q(height__gt=0),
                name="property_image_height_positive",
            ),
            models.CheckConstraint(
                condition=Q(sort_order__gte=0),
                name="property_image_sort_order_positive",
            ),
        ]

    def get_url(self):
        base = getattr(settings, "PROPERTY_MEDIA_BASE_URL", "").rstrip("/")
        return f"{base}/{self.storage_key.lstrip('/')}"

    def __str__(self):
        return self.storage_key


class PropertyOwner(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="owners"
    )
    full_name = models.CharField(max_length=150)
    document_type = models.CharField(max_length=20, null=True, blank=True)
    document_number = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(max_length=254, null=True, blank=True)
    is_representative = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["property", "document_number"],
                condition=Q(document_number__isnull=False),
                name="property_owner_document_unique",
            ),
        ]

    def __str__(self):
        return self.full_name


class PropertySchedule(models.Model):
    """Franja de visita recurrente de un inmueble (`data-model.md` §2.5).

    Una fila es un intervalo `[start_time, end_time)` de un día de la semana,
    sin fecha concreta: `09:00` de lunes son las 09:00 de Lima de todos los
    lunes. Por eso las horas son `time` y no `timestamptz`: materializar el
    instante es trabajo de `available-slots` (HU-CRM-01), no de esta tabla.

    `is_active` existe para que el reemplazo de la agenda sea no destructivo:
    una franja que sale del cuerpo se desactiva en vez de borrarse, y así las
    citas ya agendadas conservan la referencia.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="schedule_slots"
    )
    weekday = models.SmallIntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "property_schedule_slot"
        ordering = ("weekday", "start_time")
        constraints = [
            models.CheckConstraint(
                condition=Q(weekday__gte=Weekday.LUNES) & Q(weekday__lte=Weekday.DOMINGO),
                name="schedule_weekday_range",
            ),
            models.CheckConstraint(
                condition=Q(end_time__gt=F("start_time")),
                name="schedule_end_after_start",
            ),
            models.UniqueConstraint(
                fields=["property", "weekday", "start_time"],
                name="schedule_unique_start_per_weekday",
            ),
            models.UniqueConstraint(
                fields=["property", "weekday", "start_time", "end_time"],
                name="schedule_unique_range_per_weekday",
            ),
        ]

    # `builtins.property` a propósito: dentro del cuerpo de la clase el nombre
    # `property` ya lo ocupa la ForeignKey, y `@property` sin calificar
    # intentaría llamar a ese descriptor.
    @builtins.property
    def duration(self) -> timedelta:
        midnight = timezone.datetime(2000, 1, 1)
        return timezone.datetime.combine(
            midnight.date(), self.end_time
        ) - timezone.datetime.combine(midnight.date(), self.start_time)

    def overlaps(self, other) -> bool:
        """Intersección no vacía de dos intervalos semiabiertos del mismo día.

        `09:00-12:00` y `12:00-15:00` no se solapan porque el extremo derecho
        es exclusivo; por eso la comparación es estricta en los dos lados.
        """
        if self.weekday != other.weekday:
            return False
        return self.start_time < other.end_time and other.start_time < self.end_time

    def clean(self):
        """Valida la fila y el solapamiento contra las franjas ya guardadas.

        El solapamiento abarca varias filas, así que un `CHECK` no lo puede
        expresar: en PostgreSQL lo impone el `EXCLUDE USING gist` de la
        migración 0002 y aquí queda la misma regla para SQLite y para el
        servicio, que necesita el mensaje de error y no una `IntegrityError`.
        """
        super().clean()
        from django.core.exceptions import ValidationError

        errors = {}

        if self.start_time and self.end_time:
            duration = self.duration
            if self.end_time <= self.start_time:
                errors["end_time"] = (
                    f"La hora de inicio {self.start_time:%H:%M} debe ser anterior "
                    f"a la de fin {self.end_time:%H:%M}."
                )
            elif duration < SLOT_MIN_DURATION:
                errors["end_time"] = (
                    f"La franja dura {int(duration.total_seconds() // 60)} minutos "
                    f"y el mínimo es {int(SLOT_MIN_DURATION.total_seconds() // 60)}."
                )
            elif duration > SLOT_MAX_DURATION:
                errors["end_time"] = (
                    f"La franja dura {int(duration.total_seconds() // 60)} minutos "
                    f"y el máximo es {int(SLOT_MAX_DURATION.total_seconds() // 60)}."
                )

            if not errors and self.property_id and self.weekday is not None:
                siblings = PropertySchedule.objects.filter(
                    property_id=self.property_id,
                    weekday=self.weekday,
                    is_active=True,
                ).exclude(pk=self.pk)
                for sibling in siblings:
                    if self.overlaps(sibling):
                        errors["start_time"] = (
                            f"Se solapa con la franja "
                            f"{sibling.start_time:%H:%M}-{sibling.end_time:%H:%M}."
                        )
                        break

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        day = Weekday(self.weekday).label if self.weekday is not None else "?"
        return f"{self.property_id} · {day} {self.start_time:%H:%M}-{self.end_time:%H:%M}"


class PropertyStatusChange(models.Model):
    """Historial append-only de cambios de estado (`data-model.md` §2.6).

    Sin esta tabla, `PropertyStatusResult` solo daría el estado actual: lo que
    aporta es la cadena de "pasó de X a Y, por este motivo y por este actor",
    que el `previous_status` de una respuesta suelta no puede contar.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="status_changes"
    )
    previous_status = models.CharField(
        max_length=15, choices=PropertyStatus.choices, null=True, blank=True
    )
    new_status = models.CharField(max_length=15, choices=PropertyStatus.choices)
    reason = models.TextField(null=True, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="property_status_changes",
    )
    changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "property_status_change"
        ordering = ("-changed_at", "-id")
        constraints = [
            # `previous_status IS NULL` (el alta inicial) queda fuera del
            # `CHECK` porque en SQL una comparación con `NULL` es `NULL`, y un
            # `CHECK` que da `NULL` se considera satisfecho.
            models.CheckConstraint(
                condition=~Q(previous_status=F("new_status")),
                name="status_change_differs_from_previous",
            ),
            models.CheckConstraint(
                condition=Q(new_status__in=STATUS_VALUES),
                name="status_change_new_status_check",
            ),
        ]

    def save(self, *args, **kwargs):
        """La tabla es append-only: un `UPDATE` es un bug, no una corrección."""
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValueError(
                "property_status_change es append-only: inserte una fila de "
                "corrección en vez de actualizar la existente."
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.previous_status or 'ALTA'} → {self.new_status} ({self.changed_at:%Y-%m-%d %H:%M})"
