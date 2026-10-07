from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination


class _EmptyPageAdapter:
    """`page` sin datos pero con un `paginator`, para un `results` vacío.

    `PageNumberPagination` usa el `Page` para armar `next`/`previous` y el
    `count`; una página fuera de rango no debe ser `404` (el contrato de
    catálogo y de CRM la fija en `200` con `results` vacío), así que se
    sustituye por un objeto que solo sabe decir que no hay vecinos y que
    conserva el total del queryset para `count` y `X-Total-Count`.
    """

    def __init__(self, count):
        self.paginator = type("_CountOnly", (), {"count": count})()

    def __len__(self):
        return 0

    def has_next(self):
        return False

    def has_previous(self):
        return False


class PropertyPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "limit"
    max_page_size = 100
    page_query_param = "page"

    def get_page_size(self, request):
        raw_limit = request.query_params.get(self.page_size_query_param)
        if raw_limit in (None, ""):
            return self.page_size
        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            raise ValidationError(
                {"limit": ["El parámetro 'limit' debe ser un entero mayor o igual a 1."]}
            )
        if limit < 1:
            raise ValidationError(
                {"limit": ["El parámetro 'limit' debe ser un entero mayor o igual a 1."]}
            )
        return min(limit, self.max_page_size)

    def paginate_queryset(self, queryset, request, view=None):
        raw_page = request.query_params.get(self.page_query_param, 1)
        if raw_page in (None, ""):
            raw_page = 1
        try:
            page_number = int(raw_page)
        except (TypeError, ValueError):
            raise ValidationError(
                {"page": ["El parámetro 'page' debe ser un entero mayor o igual a 1."]}
            )
        if page_number < 1:
            raise ValidationError(
                {"page": ["El parámetro 'page' debe ser un entero mayor o igual a 1."]}
            )
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            # El número ya pasó la validación de entero, así que el `404` de
            # DRF aquí solo puede venir de una página fuera de rango. El
            # contrato la fija en `200` con `results` vacío y `next` en `null`.
            self.page = _EmptyPageAdapter(queryset.count())
            return []
