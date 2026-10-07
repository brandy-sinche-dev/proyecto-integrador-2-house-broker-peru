"""Permisos de la disponibilidad del inmueble (RF-PROP-04)."""

from rest_framework import status
from rest_framework.permissions import BasePermission

from .problems import ProblemError

ROLE_ADMIN = "ADMINISTRADOR"
ROLE_AGENT = "AGENTE"
ROLE_CLIENT = "CLIENTE"

# `USERRole` del contrato: el `403` los publica para que el frontend pueda decir
# "solo administradores pueden hacer esto" en vez de "error".
REQUIRED_ROLES = [ROLE_AGENT, ROLE_ADMIN]


def _role_of(user) -> str | None:
    """Rol declarado del usuario, o `None` si el backend todavía no lo conoce.

    Con el usuario propio de `docs/database/migrations-and-seeding.md` §3 esto
    será `user.role`, poblado desde el claim del JWT. Mientras tanto, la
    segunda rama traduce `is_staff`/`is_superuser` a `ADMINISTRADOR`, que es la
    única señal de administración que `django.contrib.auth.User` ofrece.
    """
    if not user or not user.is_authenticated:
        return None
    role = getattr(user, "role", None)
    if role:
        return role
    profile = getattr(user, "profile", None)
    profile_role = getattr(profile, "role", None)
    if profile_role:
        return profile_role
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return ROLE_ADMIN
    return None


class IsAuthenticatedUser(BasePermission):
    """Permiso de los favoritos: sesión válida, o `401`.

    `IsAuthenticated` degrada `NotAuthenticated` a `403` cuando ningún
    autenticador ofrece un desafío `WWW-Authenticate`, y en los favoritos no
    hay grados: sin sesión el contrato responde `401 unauthorized`, porque
    `401` y `403` son dos pantallas distintas para el cliente. Por eso se
    replica el preámbulo de `IsPropertyAgentOrAdmin` y se lanza el `ProblemError`
    con el `code` que el contrato documenta.
    """

    message = (
        "Falta el encabezado 'Authorization' o la sesión no es válida."
    )

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True
        raise ProblemError(
            code="unauthorized",
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Falta el encabezado 'Authorization' o la sesión no es válida."
            ),
        )


class IsPropertyAgentOrAdmin(BasePermission):
    """Permiso de escritura sobre un inmueble concreto.

    Sustituye a `IsAuthenticated` en las acciones de disponibilidad porque
    necesita decidir dos cosas que DRF separa: si no hay sesión responde `401`,
    y si la hay pero no alcanza responde `403`. Se podría dejar
    `IsAuthenticated` delante, pero entonces el `401` nunca sale: DRF degrada
    `NotAuthenticated` a `403` cuando el autenticador no ofrece desafío, y
    `SessionAuthentication` no ofrece ninguno. El cliente no puede
    distinguir "cerrá sesión" de "no tenés permiso", que son dos pantallas
    distintas.

    La decisión de fondo es "es el agente asignado o es administrador":

    - Un administrador puede con cualquier inmueble, asignado o no.
    - Un `CLIENTE` nunca, ni siquiera si por un error de datos fuera el
      `agent` de la fila.
    - Sin rol declarado, la asignación es la única evidencia: si
      `property.agent` es `NULL`, nadie salvo un administrador entra, y eso
      evita que el endpoint sea una escalada para cualquier usuario
      autenticado.

    `has_object_permission` es donde se resuelve el agente: DRF ya trajo el
    inmueble con `get_object()`, así que el permiso no repite el `SELECT` y un
    `403` nunca se confunde con el `404` de un inmueble que no existe.
    """

    message = (
        "Solo el agente asignado a este inmueble o un administrador pueden "
        "gestionar su disponibilidad."
    )

    def has_permission(self, request, view):
        user = request.user
        if user and user.is_authenticated:
            return True
        raise ProblemError(
            code="unauthorized",
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Falta el encabezado 'Authorization' o la sesión no es válida."
            ),
        )

    def has_object_permission(self, request, view, obj):
        role = _role_of(request.user)
        if role == ROLE_ADMIN:
            return True
        if role == ROLE_CLIENT:
            return False
        return obj.agent_id is not None and obj.agent_id == request.user.pk