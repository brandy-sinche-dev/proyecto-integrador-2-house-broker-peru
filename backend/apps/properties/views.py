from django.shortcuts import get_object_or_404
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import services
from .models import Property
from .pagination import PropertyPagination
from .permissions import IsPropertyAgentOrAdmin
from .problems import ProblemResponseMixin
from .serializers import (
    PropertySchedulesInputSerializer,
    PropertySerializer,
    PropertyStatusInputSerializer,
    PropertyStatusResultSerializer,
    build_schedules_payload,
)


class PropertyViewSet(ProblemResponseMixin, viewsets.ReadOnlyModelViewSet):
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

    # -------------------------------------------------------------
    # Disponibilidad (RF-PROP-04)
    # -------------------------------------------------------------

    def get_availability_queryset(self):
        """Inmuebles que este usuario puede llegar a gestionar.

        No filtra por `is_active`: un inmueble suspendido tiene que seguir
        siendo editable, porque reactivarlo es justamente una de las
        transiciones. El `404` del catálogo público y el `200` del panel del
        agente son decisiones distintas sobre la misma fila.
        """
        return Property.objects.select_related("agent")

    def get_availability_object(self, request):
        """Inmueble de la URL, con el permiso ya evaluado.

        Se resuelve a mano en vez de con `self.get_object()` porque
        `get_queryset()` es el del catálogo (solo `is_active`) y las acciones de
        disponibilidad necesitan el otro. El `403` del permiso se comprueba
        con `check_object_permissions` sobre el mismo objeto que ya se trajo,
        para no repetir el `SELECT`.
        """
        prop = get_object_or_404(self.get_availability_queryset(), pk=self.kwargs["id"])
        self.check_object_permissions(request, prop)
        return prop

    @action(
        detail=True,
        methods=["patch"],
        url_path="status",
        permission_classes=[IsPropertyAgentOrAdmin],
    )
    def update_status(self, request, *args, **kwargs):
        prop = self.get_availability_object(request)

        payload = PropertyStatusInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        result = services.change_property_status(
            prop,
            payload.validated_data["status"],
            payload.validated_data.get("reason"),
            actor=request.user,
        )
        return Response(PropertyStatusResultSerializer(result).data, status=http_status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["get", "put"],
        url_path="schedules",
        permission_classes=[IsPropertyAgentOrAdmin],
    )
    def schedules(self, request, *args, **kwargs):
        """`GET` devuelve la semana vigente, `PUT` la reemplaza entera.

        Los dos verbos viven en una sola acción a propósito: el router de DRF
        genera una ruta por acción, y dos rutas con el mismo `url_path` se
        resuelven en orden, así que la primera en registrar se queda con la URL
        y la segunda nunca recibe su método (un `PUT` acabaría en `405`).
        """
        prop = self.get_availability_object(request)

        if request.method == "PUT":
            payload = PropertySchedulesInputSerializer(data=request.data)
            payload.is_valid(raise_exception=True)
            slots = services.replace_schedules(prop, payload.to_week())
        else:
            slots = services.list_weekly_slots(prop)

        return Response(build_schedules_payload(prop, slots), status=http_status.HTTP_200_OK)