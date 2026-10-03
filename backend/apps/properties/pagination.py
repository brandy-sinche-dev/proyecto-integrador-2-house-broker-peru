from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination


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
        return super().paginate_queryset(queryset, request, view)
