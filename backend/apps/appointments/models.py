"""Citas de visita a un inmueble (HU-CRM-01 y HU-CRM-02).

El modelo es una transcripción de `docs/database/data-model.md` §3.1: la tabla
con más reglas de integridad del modelo. Lo que no se puede expresar con
`Meta` (el `EXCLUDE USING gist` de solapamiento) vive en la migración, con el
mismo patrón de `properties.0002` que solo corre sobre PostgreSQL.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.properties.models import Property, PropertySchedule

# Duración admitida por el contrato (`Appointment.duration_minutes`): el
# `CHECK` es de la fila y por eso vive aquí; las franjas tienen su propio rango
# (`SLOT_MIN_DURATION`/`SLOT_MAX_DURATION`), que es una regla de la agenda.
APPOINTMENT_MIN_DURATION = 15
APPOINTMENT_MAX_DURATION = 480
DEFAULT_DURATION_MINUTES = 45

REASON_MIN_LENGTH = 5
REASON_MAX_LENGTH = 500


class AppointmentStatus(models.TextChoices):
    """`AppointmentStatus` del contrato (`catalogs.md` §4.3).

    `PENDING` es el único estado de nacimiento: la reserva no confirma nada,
    y ninguna transición válida devuelve una cita a `PENDING`.
    """

    PENDING = "PENDING", "Pendiente"
    CONFIRMED = "CONFIRMED", "Confirmada"
    RESCHEDULED = "RESCHEDULED", "Reprogramada"
    COMPLETED = "COMPLETED", "Completada"
    CANCELLED = "CANCELLED", "Cancelada"
    NO_SHOW = "NO_SHOW", "No asistió"


class AppointmentSource(models.TextChoices):
    """De dónde vino la cita (`data-model.md` §3.1, columna `source`)."""

    CLIENT_WEB = "CLIENT_WEB", "Web del cliente"
    AGENT = "AGENT", "Panel del agente"
    ADMIN = "ADMIN", "Panel del administrador"
    AI_CHAT = "AI_CHAT", "Chat con IA"


# Estados que ocupan agenda. Es el predicado del `EXCLUDE`, del índice único
# parcial y del filtro de `available-slots`: `CANCELLED` y `NO_SHOW` no bloquean
# el horario, y `COMPLETED` conserva su hueco porque la visita ya ocurrió.
ACTIVE_STATUSES = (
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.RESCHEDULED,
)

STATUS_VALUES = [status.value for status in AppointmentStatus]


class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.PROTECT, related_name="appointments"
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="appointments_as_client",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="appointments_as_agent",
    )
    # `RESTRICT` (aquí `PROTECT`) en las tres FK: la cita es un hecho histórico
    # y ni un usuario ni un inmueble lógicamente borrado pueden arrastrarla
    # (`docs/02_Arquitectura.md` §8).
    schedule_slot = models.ForeignKey(
        PropertySchedule,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="appointments",
    )
    scheduled_at = models.DateTimeField()
    # Calculada en `save()` como `scheduled_at + duration_minutes`. Existe solo
    # para el `EXCLUDE`, que necesita un rango materializado para indexar.
    end_at = models.DateTimeField()
    duration_minutes = models.SmallIntegerField(default=DEFAULT_DURATION_MINUTES)
    status = models.CharField(
        max_length=15,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.PENDING,
    )
    reason = models.TextField(null=True, blank=True)
    rescheduled_from = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="rescheduled_into",
    )
    reschedule_count = models.IntegerField(default=0)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(
        max_length=20,
        choices=AppointmentSource.choices,
        default=AppointmentSource.CLIENT_WEB,
    )
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "appointment"
        ordering = ("scheduled_at",)
        indexes = [
            # `indexes-and-queries.md` §4: historial del cliente, agenda del
            # agente y filtros por estado + rango de fechas.
            models.Index(
                fields=["client", "-scheduled_at"], name="appointment_client_idx"
            ),
            models.Index(
                fields=["agent", "scheduled_at"], name="appointment_agent_idx"
            ),
            models.Index(
                fields=["status", "scheduled_at"], name="appointment_status_date_idx"
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(status__in=STATUS_VALUES),
                name="appointment_status_check",
            ),
            models.CheckConstraint(
                condition=Q(duration_minutes__gte=APPOINTMENT_MIN_DURATION)
                & Q(duration_minutes__lte=APPOINTMENT_MAX_DURATION),
                name="appointment_duration_range",
            ),
            models.CheckConstraint(
                condition=Q(reschedule_count__gte=0),
                name="appointment_reschedule_count_positive",
            ),
            # `indexes-and-queries.md` §2.5: "dos citas a la misma hora". Va
            # con `condition` para que una cita `CANCELLED` no clavé el hueco:
            # el índice parcial es lo que hace cumplible la regla también en
            # SQLite, donde la suite no tiene el `EXCLUDE` de PostgreSQL. Es a
            # la vez la protección contra el doble envío del `POST`.
            models.UniqueConstraint(
                fields=["property", "scheduled_at"],
                condition=Q(status__in=ACTIVE_STATUSES),
                name="appointment_property_slot_unique",
            ),
        ]

    def save(self, *args, **kwargs):
        """Mantiene `end_at` como `scheduled_at + duration_minutes`.

        El `CHECK` que lo confirma en PostgreSQL se agrega en la migración; la
        derivación tiene que existir igual en SQLite, que es donde corre la
        suite, y en cualquier `save()` que no pase por el servicio.
        """
        if self.scheduled_at is not None and self.duration_minutes:
            self.end_at = self.scheduled_at + timedelta(minutes=self.duration_minutes)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.property_id} · {self.scheduled_at:%Y-%m-%d %H:%M} ({self.status})"
