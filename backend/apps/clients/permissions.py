"""Permisos de la ficha y el historial CRM del cliente (HU-CRM-03)."""

from rest_framework import status

from apps.appointments.models import Appointment
from apps.properties.permissions import (
    ROLE_ADMIN,
    ROLE_AGENT,
    IsAuthenticatedUser,
    _role_of,
)
from apps.properties.problems import ProblemError

from .models import ClientNote

REQUIRED_ROLES = [ROLE_AGENT, ROLE_ADMIN]

DEFAULT_FORBIDDEN_DETAIL = (
    "La ficha CRM del cliente solo está disponible para agentes y "
    "administradores."
)
DEFAULT_NOT_FOUND_DETAIL = (
    "El cliente no existe o no tiene citas asignadas a tu cuenta."
)


class IsAgentOrAdmin(IsAuthenticatedUser):
    """Solo agentes y administradores acceden a la ficha CRM de un cliente.

    El alcance se decide en dos niveles, igual que en las citas:

    - `has_permission` responde `401` sin sesión y `403` si el rol es
      `CLIENTE` o no está declarado. La vista puede sobrescribir el mensaje
      porque la ficha y el historial se anuncian distinto en el contrato.
    - `has_object_permission` limita a un `AGENTE` a los clientes con al menos
      una cita asignada a su cuenta. Un cliente sin citas con el agente
      responde `404`, no `403`: el contrato no distingue "no existe" de "no es
      tuyo" para no revelar la cartera de otro agente.

    Se apoya en `IsAuthenticatedUser` para que la falta de sesión siga siendo
    `401` y no el `403` que DRF produce cuando ningún autenticador ofrece un
    desafío.
    """

    message = DEFAULT_FORBIDDEN_DETAIL

    def has_permission(self, request, view):
        super().has_permission(request, view)
        role = _role_of(request.user)
        if role in (ROLE_AGENT, ROLE_ADMIN):
            return True
        raise ProblemError(
            code="forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
            detail=getattr(view, "forbidden_detail", DEFAULT_FORBIDDEN_DETAIL),
            extras={"required_roles": REQUIRED_ROLES},
        )

    def has_object_permission(self, request, view, obj):
        role = _role_of(request.user)
        if role == ROLE_ADMIN:
            return True
        if role == ROLE_AGENT:
            assigned = Appointment.objects.filter(
                client=obj, agent=request.user
            ).exists()
            if assigned:
                return True
        raise ProblemError(
            code="resource_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
            detail=getattr(view, "not_found_detail", DEFAULT_NOT_FOUND_DETAIL),
        )


class IsClientNoteAgentOrAdmin(IsAgentOrAdmin):
    """Permiso de las observaciones de atención (HU-CRM-04).

    Las operaciones de lectura y alta aplican la misma regla que la ficha: un
    agente solo sobre clientes con citas asignadas y un administrador sobre
    cualquiera. El borrado suma la autoría: un agente asignado puede leer todas
    las notas del cliente, pero solo eliminar las que él escribió. Un
    administrador puede eliminar cualquiera.
    """

    note_forbidden_detail = (
        "Solo el agente autor de la nota o un administrador pueden eliminarla."
    )

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, ClientNote):
            if _role_of(request.user) == ROLE_ADMIN:
                return True
            if obj.author_id == request.user.pk:
                return True
            raise ProblemError(
                code="forbidden",
                status_code=status.HTTP_403_FORBIDDEN,
                detail=getattr(
                    view,
                    "note_forbidden_detail",
                    self.note_forbidden_detail,
                ),
            )
        return super().has_object_permission(request, view, obj)
