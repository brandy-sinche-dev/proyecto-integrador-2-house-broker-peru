"""Factories compartidas por los tests de la ficha e historial del cliente."""

from datetime import datetime
from zoneinfo import ZoneInfo

from apps.appointments.models import Appointment, AppointmentStatus
from apps.clients.models import ClientProfile

UTC = ZoneInfo("UTC")


def utc(year, month, day, hour=14, minute=0):
    """Instante UTC de una hora diurna de Lima (09:00 por defecto)."""
    return datetime(year, month, day, hour, minute, tzinfo=UTC)


def make_appointment(
    property_obj,
    client,
    agent,
    scheduled_at,
    status=AppointmentStatus.PENDING,
    **overrides,
):
    return Appointment.objects.create(
        property=property_obj,
        client=client,
        agent=agent,
        scheduled_at=scheduled_at,
        duration_minutes=overrides.pop("duration_minutes", 45),
        status=status,
        **overrides,
    )


def make_client_profile(user, **overrides):
    defaults = {
        "budget_min": 1800,
        "budget_max": 2500,
        "budget_currency": "PEN",
        "preferred_district": "Miraflores",
        "preferences": {
            "mode": "ALQUILER",
            "property_type": "DEPARTAMENTO",
            "districts": ["Miraflores", "San Isidro"],
            "bedrooms": 2,
        },
        "interest_level": 4,
    }
    defaults.update(overrides)
    return ClientProfile.objects.create(user=user, **defaults)
