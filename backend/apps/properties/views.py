from rest_framework import viewsets

from .models import Property
from .pagination import PropertyPagination
from .serializers import PropertySerializer


class PropertyViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PropertySerializer
    pagination_class = PropertyPagination
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_queryset(self):
        return (
            Property.objects.filter(is_active=True)
            .select_related("agent")
            .prefetch_related("images")
            .defer("description", "owner_notes", "features")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        paginator = self.paginator
        if paginator is not None and getattr(paginator, "page", None) is not None:
            response["X-Total-Count"] = paginator.page.paginator.count
        return response
