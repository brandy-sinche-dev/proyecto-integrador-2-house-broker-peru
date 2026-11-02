"""Permisos de las transiciones de estado de una cita (RF-CRM-02)."""

from rest_framework import status

from apps.properties.permissions import (
    ROLE_ADMIN,
    ROLE_AGENT,
    IsAuthenticatedUser,
    _role_of,
)
from apps.properties.problems import ProblemError

REQUIRED_ROLES = [ROLE_AGENT, ROLE_ADMIN]


class CanChangeAppointmentStatus(IsAuthenticatedUser):
    """Solo el agente asignado o un administrador cambian el estado.

    Se apoya en `IsAuthenticatedUser` para que la falta de sesión siga siendo
    `401` y no el `403` que DRF produce cuando el autenticador no ofrece un
    desafío. El `403` de rol o de asignación se lanza explícito para publicar
    `required_roles` en el sobre `application/problem+json`.
    """

    message = (
        "Solo el agente asignado a esta cita o un administrador pueden "
        "modificar su estado."
    )

    def has_object_permission(self, request, view, obj):
        role = _role_of(request.user)
        if role == ROLE_ADMIN:
            return True
        if role == ROLE_AGENT and obj.agent_id == request.user.pk:
            return True
        if role == ROLE_AGENT:
            raise ProblemError(
                code="forbidden",
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Solo el agente asignado a esta cita o un administrador "
                    "pueden modificar su estado."
                ),
                extras={"required_roles": [ROLE_AGENT]},
            )
        raise ProblemError(
            code="forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Solo los roles AGENTE y ADMINISTRADOR pueden cambiar el "
                "estado de una cita."
            ),
            extras={"required_roles": REQUIRED_ROLES},
        )
