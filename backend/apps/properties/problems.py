"""Errores de la API en formato `application/problem+json` (RFC 7807).

El contrato de `docs/api/openapi_spec.yaml` no usa el sobre de error por
defecto de DRF: cada endpoint documenta un `code` estable
(`invalid_property_transition`, `schedule_overlap`, `forbidden`, …) y una lista
`errors` con el `parameter` que falló. Un cliente decide qué hacer mirando el
`code`, no el texto, que está en español y puede cambiar.

`problem_exception_handler` normaliza las dos fuentes de error de la API:

- `ProblemError`, que es donde el servicio declara el `code` de negocio.
- Las excepciones propias de DRF (validación de serializer, 401, 403, 404,
  429), que se reescriben al mismo sobre con el `code` que el contrato les
  asigna. Sin esto, un campo inválido volvería como `{"page": ["..."]}` y el
  frontend no tendría contra qué matchear.
"""

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    MethodNotAllowed,
    NotAuthenticated,
    NotFound,
    ParseError,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

ERROR_TYPES = {
    "invalid_query_parameter": (
        "https://housebroker.pe/errors/invalid-query-parameter",
        "Parámetro de consulta inválido",
    ),
    "invalid_property_transition": (
        "https://housebroker.pe/errors/invalid-property-transition",
        "Transición de estado no permitida",
    ),
    "invalid_time_range": (
        "https://housebroker.pe/errors/invalid-time-range",
        "Rango horario inválido",
    ),
    "schedule_overlap": (
        "https://housebroker.pe/errors/schedule-overlap",
        "Franjas horarias solapadas",
    ),
    "property_state_conflict": (
        "https://housebroker.pe/errors/property-state-conflict",
        "Conflicto de estado del inmueble",
    ),
    "schedule_has_bookings": (
        "https://housebroker.pe/errors/schedule-has-bookings",
        "La configuración choca con visitas agendadas",
    ),
    "agent_assignment_required": (
        "https://housebroker.pe/errors/agent-assignment-required",
        "Se requiere el agente asignado",
    ),
    "property_not_bookable": (
        "https://housebroker.pe/errors/property-not-bookable",
        "Propiedad no agendable",
    ),
    "appointment_slot_conflict": (
        "https://housebroker.pe/errors/appointment-slot-conflict",
        "Conflicto de horario de cita",
    ),
    "unauthorized": (
        "https://housebroker.pe/errors/unauthorized",
        "No autenticado",
    ),
    "forbidden": (
        "https://housebroker.pe/errors/forbidden",
        "Sin permisos sobre el recurso",
    ),
    "resource_not_found": (
        "https://housebroker.pe/errors/resource-not-found",
        "Recurso no encontrado",
    ),
    "method_not_allowed": (
        "https://housebroker.pe/errors/method-not-allowed",
        "Método no permitido",
    ),
    "too_many_requests": (
        "https://housebroker.pe/errors/too-many-requests",
        "Demasiadas peticiones",
    ),
    "internal_server_error": (
        "https://housebroker.pe/errors/internal-server-error",
        "Error interno del servidor",
    ),
    "invalid_filter_range": (
        "https://housebroker.pe/errors/invalid-filter-range",
        "Rango de precio incoherente",
    ),
}

# `code` que el contrato le asigna a cada excepción propia de DRF. Lo que no
# esté en esta tabla conserva el `default_code` de DRF, que para las que sí
# documenta el contrato coincide con el nombre.
EXCEPTION_CODES = {
    ParseError: "invalid_query_parameter",
    ValidationError: "invalid_query_parameter",
    NotAuthenticated: "unauthorized",
    AuthenticationFailed: "unauthorized",
    PermissionDenied: "forbidden",
    NotFound: "resource_not_found",
    MethodNotAllowed: "method_not_allowed",
    Throttled: "too_many_requests",
}


class ProblemError(APIException):
    """Error de dominio con el `code` que el contrato documenta.

    `errors` es la lista de `{parameter, message}` del schema `ProblemBadRequest`
    (errors: [{parameter: days[0].slots[1], message: ...}]). `extras` son las
    extensiones opcionales del schema, como el `required_roles` del 403.

    `title` sobrescribe el título por defecto del `code`: el spec usa el mismo
    `invalid_filter_range` con "Rango de precio incoherente" en el catálogo y
    con "Rango de fechas inválido" en CRM.
    """

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_query_parameter"

    def __init__(
        self,
        *,
        code,
        detail,
        errors=None,
        status_code=None,
        instance=None,
        extras=None,
        title=None,
    ):
        self.code = code
        self.title = title
        self.errors = errors or []
        self.instance = instance
        self.extras = extras or {}
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail=detail, code=code)


# Claves con las que DRF nombra un error que no pertenece a ningún campo del
# cuerpo. No aportan nada al `parameter` del contrato: el error es del
# contenedor que las contiene.
_CONTAINER_KEYS = frozenset({"non_field_errors", "default_error_messages", "required"})


def flatten_errors(detail, path=""):
    """Aplana el `detail` de DRF a la lista `{parameter, message}` del contrato.

    DRF nombra los campos con punto (`days.0.slots`) y mete los errores de
    contenedor en claves como `non_field_errors`; el contrato los nombra como
    los nombra el cliente (`days[0].slots`). Es la misma convención que usan los
    errores del servicio, para que el frontend pueda marcar el control con
    error sin dos reglas de acierto.
    """
    if isinstance(detail, dict):
        for key, value in detail.items():
            if key in _CONTAINER_KEYS:
                yield from flatten_errors(value, path)
            else:
                yield from flatten_errors(value, _join(path, key))
        return

    if isinstance(detail, (list, tuple)):
        if not path:
            # `ValidationError("algo")` no tiene un campo al que colgar el
            # nombre: se reporta contra el cuerpo entero.
            for message in detail:
                yield {"parameter": "body", "message": str(message)}
            return
        if all(not isinstance(item, (dict, list, tuple)) for item in detail):
            # DRF envuelve los mensajes de un campo en una lista
            # (`{"status": ["Este campo es obligatorio."]}`), pero para el
            # cliente son el mismo parámetro: `status`, no `status[0]`.
            for message in detail:
                yield {"parameter": path, "message": str(message)}
            return
        for index, item in enumerate(detail):
            yield from flatten_errors(item, f"{path}[{index}]")
        return

    yield {"parameter": path or "body", "message": str(detail)}


def _join(path, key) -> str:
    """`days` + `0` -> `days[0]`; `days[0]` + `slots` -> `days[0].slots`."""
    if isinstance(key, int) or (isinstance(key, str) and key.isdigit()):
        return f"{path}[{key}]"
    return f"{path}.{key}" if path else str(key)


def _code_of(exc: Exception) -> str:
    for klass in type(exc).__mro__:
        if klass in EXCEPTION_CODES:
            return EXCEPTION_CODES[klass]
    return getattr(exc, "default_code", "error")


def problem_exception_handler(exc, context):
    """Escribe todo error de la API en el sobre que documenta el contrato."""
    if isinstance(exc, ProblemError):
        return _problem_response(
            _problem_body(
                exc.code,
                exc.status_code,
                exc.detail,
                exc.errors,
                exc.extras,
                exc.instance,
                context,
                title=exc.title,
            ),
            exc.status_code,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if not isinstance(exc, APIException):
        return response

    errors = (
        list(flatten_errors(exc.detail))
        if isinstance(exc, (ValidationError, ParseError))
        else None
    )
    body = _problem_body(
        _code_of(exc),
        response.status_code,
        exc.detail,
        errors,
        _extras_of(exc),
        None,
        context,
    )
    response.data = body
    return _as_problem_media_type(response)


PROBLEM_MEDIA_TYPE = "application/problem+json"


def _as_problem_media_type(response):
    """Marca la respuesta como problema; el tipo lo fija `ProblemResponseMixin`.

    No se puede resolver aquí: la negociación de contenido de DRF ocurre en
    `initial()`, antes de la vista, y `finalize_response` copia su resultado a
    la respuesta después de que el manejador de excepciones haya corrido.
    """
    response.problem_media_type = True
    return response


class ProblemResponseMixin:
    """Deja `application/problem+json` en pie después de la negociación de DRF.

    Sin esto, el `Content-Type` de un error vuelve a ser `application/json`: el
    cuerpo sería el correcto, pero un cliente que ramifica por el tipo de medio
    —que es lo que el RFC 7807 pretende— no vería la diferencia.
    """

    def finalize_response(self, request, response, *args, **kwargs):
        finalized = super().finalize_response(request, response, *args, **kwargs)
        if getattr(finalized, "problem_media_type", False):
            finalized.accepted_renderer = JSONRenderer()
            finalized.accepted_media_type = PROBLEM_MEDIA_TYPE
            # `Response.rendered_content` reescribe la cabecera desde
            # `renderer.media_type` mientras devuelve el cuerpo, así que la
            # cabecera sola no alcanza: hay que fijar también `content_type`.
            finalized.content_type = PROBLEM_MEDIA_TYPE
            finalized["Content-Type"] = PROBLEM_MEDIA_TYPE
        return finalized


def _problem_response(body, status_code):
    return _as_problem_media_type(Response(body, status=status_code))


def _extras_of(exc: Exception) -> dict | None:
    if not isinstance(exc, PermissionDenied):
        return None
    # Import local: `permissions` importa este módulo, y este es el único punto
    # que necesita la lista de roles que publica el schema `ProblemForbidden`.
    from .permissions import REQUIRED_ROLES

    return {"required_roles": list(REQUIRED_ROLES)}


def _problem_body(code, status_code, detail, errors, extras, instance, context, title=None):
    error_type, default_title = ERROR_TYPES.get(
        code, (f"https://housebroker.pe/errors/{code}", code)
    )
    request = context.get("request")

    body = {
        "type": error_type,
        "title": title or default_title,
        "status": status_code,
        "detail": _summary(detail),
        "instance": instance or getattr(request, "path", None),
        "code": code,
    }
    if errors:
        body["errors"] = errors
    body.update(extras or {})
    return body


def _summary(detail) -> str:
    """El `detail` del RFC es un texto, y DRF puede dar una lista o un dict."""
    if isinstance(detail, dict):
        fields = ", ".join(str(key) for key in detail)
        return (
            f"El cuerpo tiene {len(detail)} campo(s) inválido(s): {fields}."
        )
    if isinstance(detail, (list, tuple)):
        return str(detail[0]) if detail else ""
    return str(detail)