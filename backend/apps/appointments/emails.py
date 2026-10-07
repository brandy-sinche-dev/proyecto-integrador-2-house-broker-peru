"""Correos transaccionales de las citas (RF-SEC-05).

El contrato pide dos avisos por cada reserva: la confirmación al cliente y
la notificación al agente que va a atender la visita. Los dos se envían
**después** de crear la cita, y un fallo de envío solo se loguea: el correo
no es parte de la reserva, así que no puede revocarla.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

from .services import schedule_tz

logger = logging.getLogger(__name__)

# Nombres de día y mes en español sin depender del locale del proceso: la
# suite corre en una imagen sin locales configurados y `strftime(%A)` ahí
# devolvería el nombre en inglés.
WEEKDAYS = (
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
)
MONTHS = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def format_when(value) -> str:
    """`jueves 8 de octubre de 2026, 16:00` en la zona de la agenda."""
    local = value.astimezone(schedule_tz())
    return (
        f"{WEEKDAYS[local.weekday()]} {local.day} de "
        f"{MONTHS[local.month - 1]} de {local.year}, {local:%H:%M}"
    )


def _where(appointment) -> str:
    prop = appointment.property
    district = prop.district.name if prop.district_id else None
    city = f"{prop.address}, {district}" if district else prop.address
    return (
        f"Inmueble: {prop.title}\n"
        f"Dirección: {city}\n"
        f"Fecha y hora: {format_when(appointment.scheduled_at)} (America/Lima)\n"
        f"Duración: {appointment.duration_minutes} minutos\n"
        f"Código de la cita: {appointment.id}"
    )


def _client_message(appointment) -> str:
    return (
        f"Hola {appointment.client.get_full_name() or appointment.client.get_username()},\n\n"
        "Recibimos tu solicitud de visita y quedó registrada en estado "
        "pendiente. El agente del inmueble debe confirmar el horario antes de "
        "que la visita quede cerrada.\n\n"
        f"{_where(appointment)}\n\n"
        "Te avisaremos por este mismo correo cuando el agente confirme.\n\n"
        "— HouseBroker Perú"
    )


def _agent_message(appointment) -> str:
    return (
        f"Hola {appointment.agent.get_full_name() or appointment.agent.get_username()},\n\n"
        "Tienes una visita pendiente de confirmación. Confírmala desde el "
        "panel de citas para que el cliente reciba el aviso.\n\n"
        f"{_where(appointment)}\n\n"
        "— HouseBroker Perú"
    )


def _send(*, to, subject, body) -> None:
    if not to:
        return
    try:
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [to],
        )
    except Exception:
        # La reserva ya existe: un buzón caído no puede deshacerla.
        logger.exception("No se pudo enviar el correo a %s", to)


def send_appointment_emails(appointment) -> None:
    """Envía los dos avisos de una cita recién creada. Nunca lanza."""
    title = appointment.property.title
    _send(
        to=appointment.client.email,
        subject=f"Solicitud de visita registrada — {title}",
        body=_client_message(appointment),
    )
    _send(
        to=appointment.agent.email,
        subject=f"Nueva visita por confirmar — {title}",
        body=_agent_message(appointment),
    )
