"""Filtros del catálogo público (HU-PROP-03, `TASK-ARC-PROP-03`).

`GET /api/v1/properties` filtra sobre el mismo recurso, sin endpoint nuevo:
`minPrice`/`maxPrice` sobre `price`, `propertyType` sobre `property_type`,
`ubigeo` sobre el distrito y `search` sobre `title` y `address`.

Tres decisiones del contrato (`docs/api/README.md` §"Filtros de búsqueda") viven
aquí:

- **Un parámetro vacío equivale a omitido**, para que el frontend pueda limpiar
  un control sin reescribir la URL completa.
- **La validación no corta en el primer fallo**: `errors` trae una entrada por
  cada parámetro inválido de la misma petición, en el orden en que la operación
  los declara, para que el cliente marque todos los controles a la vez.
- **`search` es case-insensitive y sin acentos** con un mínimo de 2 caracteres,
  que acota el costo de la búsqueda.

El rango invertido (`minPrice` > `maxPrice`) es un código distinto
(`invalid_filter_range`): cada valor es válido por separado y solo el conjunto
está mal, que es una pregunta distinta de "este parámetro no existe".
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from django.db.models import Q, Value
from django.db.models.functions import Lower, Replace
from django.http import QueryDict

from .models import PropertyType
from .problems import ProblemError

SEARCH_MIN_LENGTH = 2
SEARCH_MAX_LENGTH = 120
PRICE_MIN_VALUE = Decimal("0.0001")

PROPERTY_TYPE_VALUES = list(PropertyType.values)
UBIGEO_PATTERN = re.compile(r"^[0-9]{6}$")

# Español sin acentos, que es lo que el contrato pide para `search`. Ñ va
# aparte de las vocales porque no es una variante de ninguna otra letra: se
# plantea a sí misma para que "nino" encuentre "Niño".
ACCENT_FOLDING = (
    ("á", "a"),
    ("é", "e"),
    ("í", "i"),
    ("ó", "o"),
    ("ú", "u"),
    ("ü", "u"),
    ("ñ", "n"),
)

# Mayúsculas acentuadas: SQLite `LOWER()` es solo ASCII, así que la Ñ/Á de un
# título en mayúsculas no bajaría con el `Lower` de la base por sí solo; se
# pliegan antes con su propia tabla.
UPPERCASE_ACCENT_FOLDING = (
    ("Á", "a"),
    ("É", "e"),
    ("Í", "i"),
    ("Ó", "o"),
    ("Ú", "u"),
    ("Ü", "u"),
    ("Ñ", "n"),
)

# Detalle por parámetro, para la respuesta con un solo error. Con dos o más el
# contrato cambia a un resumen que cuenta los parámetros.
_SINGLE_ERROR_DETAILS = {
    "minPrice": "El parámetro 'minPrice' debe ser un número mayor o igual a 0.0001.",
    "maxPrice": "El parámetro 'maxPrice' debe ser un número mayor o igual a 0.0001.",
    "propertyType": (
        "El parámetro 'propertyType' admite los valores "
        f"{', '.join(PROPERTY_TYPE_VALUES)}."
    ),
    "ubigeo": "El parámetro 'ubigeo' debe ser un código INEI de 6 dígitos.",
    "search": (
        f"El parámetro 'search' debe tener entre {SEARCH_MIN_LENGTH} y "
        f"{SEARCH_MAX_LENGTH} caracteres."
    ),
}


@dataclass(frozen=True)
class CatalogFilters:
    """Filtros ya validados, listos para aplicar sobre el queryset."""

    price_min: Decimal | None = None
    price_max: Decimal | None = None
    property_types: tuple[str, ...] = ()
    ubigeos: tuple[str, ...] = ()
    search: str | None = None


def fold_text(value: str) -> str:
    """Minúsculas y sin acentos, el mismo pliegue que aplica la base."""
    lowered = value.lower()
    for accented, plain in ACCENT_FOLDING:
        lowered = lowered.replace(accented, plain)
    return lowered


def fold_expression(field_name: str):
    """Expresión SQL que pliega `field` igual que `fold_text` pliega el término.

    El pliegue se replica en base porque SQLite no tiene `unaccent` y la
    búsqueda tiene que dar el mismo resultado ahí y en PostgreSQL. Cada
    `Replace` es una función estándar en los dos motores, así que la cadena no
    depende del dialecto.
    """
    expression = Lower(field_name)
    for accented, plain in UPPERCASE_ACCENT_FOLDING:
        expression = Replace(expression, Value(accented), Value(plain))
    for accented, plain in ACCENT_FOLDING:
        expression = Replace(expression, Value(accented), Value(plain))
    return expression


def _collect(errors: list[dict], parameter: str, message: str) -> None:
    errors.append({"parameter": parameter, "message": message})


def _raise_if_invalid(errors: list[dict]) -> None:
    if not errors:
        return
    if len(errors) == 1:
        detail = _SINGLE_ERROR_DETAILS[errors[0]["parameter"]]
    else:
        detail = f"Se detectaron {len(errors)} parámetros de consulta inválidos."
    raise ProblemError(
        code="invalid_query_parameter",
        detail=detail,
        errors=errors,
    )


def _raw_values(params, name: str) -> list[str]:
    """Todos los valores repetidos del parámetro, sin colapsar la repetición."""
    if isinstance(params, QueryDict):
        return params.getlist(name)
    value = params.get(name)
    if value in (None, ""):
        return []
    if isinstance(value, (list, tuple)):
        return [str(item) for item in value]
    return [str(value)]


def _first_value(params, name: str) -> str | None:
    """Primer valor no vacío, o `None` si el parámetro viene vacío.

    `?minPrice=` equivale a omitirlo: el frontend limpia un control escribiendo
    un valor vacío y no debería producir un `400`.
    """
    for raw in _raw_values(params, name):
        if str(raw).strip() != "":
            return str(raw)
    return None


def _parse_price(params, name: str, errors: list[dict]) -> Decimal | None:
    raw = _first_value(params, name)
    if raw is None:
        return None
    try:
        value = Decimal(raw)
    except (InvalidOperation, ValueError):
        _collect(errors, name, f"El valor '{raw}' no es un número válido.")
        return None
    if not value.is_finite() or value < PRICE_MIN_VALUE:
        _collect(
            errors,
            name,
            f"El valor '{raw}' es menor que el mínimo permitido ({PRICE_MIN_VALUE}).",
        )
        return None
    return value


def _parse_choice_list(
    params, name: str, validator, errors: list[dict]
) -> tuple[str, ...]:
    picked = []
    for raw in _raw_values(params, name):
        value = str(raw).strip()
        # Un valor vacío entre los repetidos se descarta, igual que un
        # parámetro entero vacío: es la forma en que un `<select>` limpio
        # vuelve a mandar su última opción.
        if value == "":
            continue
        problem = validator(value)
        if problem:
            _collect(errors, name, problem)
            continue
        if value not in picked:
            picked.append(value)
    return tuple(picked)


def _property_type_message(value: str) -> str | None:
    if value in PROPERTY_TYPE_VALUES:
        return None
    return (
        f"El valor '{value}' no pertenece al conjunto permitido "
        f"({', '.join(PROPERTY_TYPE_VALUES)})."
    )


def _ubigeo_message(value: str) -> str | None:
    if UBIGEO_PATTERN.fullmatch(value):
        return None
    return f"El valor '{value}' no cumple el formato de 6 dígitos (patrón ^\\d{{6}}$)."


def _parse_search(params, errors: list[dict]) -> str | None:
    raw = _first_value(params, "search")
    if raw is None:
        return None
    # Los espacios iniciales, finales y dobles se colapsan antes de comparar,
    # así que la longitud se mide sobre el texto ya normalizado.
    collapsed = re.sub(r"\s+", " ", raw).strip()
    if collapsed == "":
        return None
    length = len(collapsed)
    if length < SEARCH_MIN_LENGTH:
        _collect(
            errors,
            "search",
            f"El valor '{collapsed}' tiene {length} "
            f"{'carácter' if length == 1 else 'caracteres'} y el mínimo es "
            f"{SEARCH_MIN_LENGTH}.",
        )
        return None
    if length > SEARCH_MAX_LENGTH:
        _collect(
            errors,
            "search",
            f"El valor '{collapsed}' tiene {length} caracteres y el máximo es "
            f"{SEARCH_MAX_LENGTH}.",
        )
        return None
    return collapsed


def _format_price(value: Decimal) -> str:
    """Precio como lo escribe el contrato en sus ejemplos (`450000.0`)."""
    return str(float(value))


def parse_catalog_filters(params) -> CatalogFilters:
    """Valida los query params y devuelve los filtros, o `400`.

    El orden de `errors` es el de la operación en el spec: `minPrice`,
    `maxPrice`, `propertyType`, `ubigeo`, `search`. El rango invertido se
    comprueba después, porque solo tiene sentido cuando los dos extremos ya
    son individualmente válidos.
    """
    errors: list[dict] = []

    price_min = _parse_price(params, "minPrice", errors)
    price_max = _parse_price(params, "maxPrice", errors)
    property_types = _parse_choice_list(
        params, "propertyType", _property_type_message, errors
    )
    ubigeos = _parse_choice_list(params, "ubigeo", _ubigeo_message, errors)
    search = _parse_search(params, errors)

    _raise_if_invalid(errors)

    if price_min is not None and price_max is not None and price_min > price_max:
        raise ProblemError(
            code="invalid_filter_range",
            title="Rango de precio incoherente",
            detail="`minPrice` no puede ser mayor que `maxPrice`.",
            errors=[
                {
                    "parameter": "minPrice",
                    "message": (
                        f"El valor '{_format_price(price_min)}' es mayor que "
                        f"'maxPrice' ({_format_price(price_max)})."
                    ),
                }
            ],
        )

    return CatalogFilters(
        price_min=price_min,
        price_max=price_max,
        property_types=property_types,
        ubigeos=ubigeos,
        search=search,
    )


def apply_catalog_filters(queryset, filters: CatalogFilters):
    """Aplica los filtros ya validados, todos en conjunción.

    `propertyType` y `ubigeo` son OR dentro de sí mismos y AND entre ellos, y
    `count`/`X-Total-Count` salen del queryset de acá, no del catálogo entero.
    """
    if filters.price_min is not None:
        queryset = queryset.filter(price__gte=filters.price_min)
    if filters.price_max is not None:
        queryset = queryset.filter(price__lte=filters.price_max)
    if filters.property_types:
        queryset = queryset.filter(property_type__in=filters.property_types)
    if filters.ubigeos:
        queryset = queryset.filter(district__ubigeo__in=filters.ubigeos)
    if filters.search is not None:
        term = fold_text(filters.search)
        queryset = queryset.annotate(
            _search_title=fold_expression("title"),
            _search_address=fold_expression("address"),
        ).filter(Q(_search_title__icontains=term) | Q(_search_address__icontains=term))
    return queryset
