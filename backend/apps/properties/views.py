import uuid

from django.db.models import BooleanField, Exists, OuterRef, Value
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone as dj_timezone
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import services
from .filters import apply_catalog_filters, parse_catalog_filters
from .models import Favorite, Property
from .pagination import PropertyPagination
from .permissions import (
    ROLE_ADMIN,
    ROLE_AGENT,
    IsAuthenticatedUser,
    IsPropertyAgentOrAdmin,
    _role_of,
)
from .problems import ProblemError, ProblemResponseMixin
from .serializers import (
    FavoriteInputSerializer,
    FavoriteSerializer,
    PropertyInputSerializer,
    PropertySchedulesInputSerializer,
    PropertySerializer,
    PropertyStatusInputSerializer,
    PropertyStatusResultSerializer,
    build_schedules_payload,
)


# Campos que `PUT` reemplaza (schema `PropertyInput`). `id`, `is_active`,
# `created_at`, `code` y `agent` se conservan: el contrato lo dice explícito.
WRITABLE_FIELDS = (
    "title",
    "price",
    "currency",
    "mode",
    "address",
    "district",
    "property_type",
    "area_total",
    "area_built",
    "bedrooms",
    "bathrooms",
    "parking_spaces",
    "exterior_url",
    "floorplan_url",
    "is_negotiable",
    "is_featured",
    "maintenance_fee",
)


class PropertyViewSet(ProblemResponseMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = PropertySerializer
    pagination_class = PropertyPagination
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_queryset(self):
        queryset = (
            Property.objects.filter(is_active=True)
            .select_related("agent")
            .prefetch_related("images")
            .defer("description", "owner_notes", "features")
            .order_by("-created_at")
        )
        user = self.request.user
        if user is not None and user.is_authenticated:
            queryset = queryset.annotate(
                is_favorite=Exists(
                    Favorite.objects.filter(user=user, property=OuterRef("pk"))
                )
            )
        else:
            queryset = queryset.annotate(
                is_favorite=Value(False, output_field=BooleanField())
            )
        return apply_catalog_filters(
            queryset, parse_catalog_filters(self.request.query_params)
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        paginator = self.paginator
        if paginator is not None and getattr(paginator, "page", None) is not None:
            response["X-Total-Count"] = paginator.page.paginator.count
        return response

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.action in {"create", "update", "partial_update", "destroy"}:
            permissions = [IsPropertyAgentOrAdmin()]
        return permissions

    # -------------------------------------------------------------
    # Alta, edición y baja (HU-PROP-01 / Registro de propiedad)
    # -------------------------------------------------------------

    def ensure_can_manage(self):
        """Rol que puede dar de alta; editar y borrar los decide el permiso de objeto."""
        role = _role_of(self.request.user)
        if role not in {ROLE_AGENT, ROLE_ADMIN}:
            raise ProblemError(
                code="forbidden",
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Solo un agente o un administrador puede registrar propiedades.",
                extras={"required_roles": [ROLE_AGENT, ROLE_ADMIN]},
            )

    def create(self, request, *args, **kwargs):
        """`POST` (schema `PropertyInput`): el servidor manda `code`, `agent`
        y `district` (resuelto desde la dirección)."""
        self.ensure_can_manage()
        payload = PropertyInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = dict(payload.validated_data)
        district = services.resolve_district(data["address"])
        prop = Property.objects.create(
            code=services.next_property_code(),
            agent=request.user,
            district=district,
            created_by=request.user,
            **data,
        )
        location = request.build_absolute_uri(f"{reverse('property-list')}/{prop.id}")
        return Response(
            PropertySerializer(prop, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
            headers={"Location": location},
        )

    def update(self, request, *args, **kwargs):
        """`PUT` (schema `PropertyInput`). `id`, `is_active` y `created_at`
        se conservan; el `district` se re-resuelve desde la nueva dirección."""
        prop = self.get_availability_object(request)
        payload = PropertyInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = dict(payload.validated_data)
        prop.district = services.resolve_district(data["address"])
        for field, value in data.items():
            setattr(prop, field, value)
        prop.save(update_fields=WRITABLE_FIELDS)
        return Response(
            PropertySerializer(prop, context=self.get_serializer_context()).data,
            status=http_status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        """`DELETE`: baja lógica, nunca borra la fila en `status` auditados."""
        prop = self.get_availability_object(request)
        prop.is_active = False
        prop.deleted_at = dj_timezone.now()
        prop.save(update_fields=["is_active", "deleted_at"])
        return Response(
            PropertySerializer(prop, context=self.get_serializer_context()).data,
            status=http_status.HTTP_200_OK,
        )

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
        methods=["get"],
        url_path="management",
        permission_classes=[IsPropertyAgentOrAdmin],
    )
    def management(self, request, *args, **kwargs):
        """Detalle protegido, accesible también para reactivar suspendidos."""
        prop = self.get_availability_object(request)
        return Response(self.get_serializer(prop).data)

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


class FavoriteViewSet(ProblemResponseMixin, viewsets.GenericViewSet):
    """Favoritos del usuario autenticado (HU-PROP-05).

    La lista es privada y el backend la filtra por `request.user`: no hay
    parámetro de usuario, porque con un `?user_id=` bastaría para leer los
    favoritos ajenos.

    `POST` y `DELETE` son idempotentes a propósito (matriz del contrato): el
    `200` con el `added_at` original en un reintento, y `204` aunque el inmueble
    no estuviera en la lista. El `404` es siempre del inmueble, nunca de la
    relación.
    """

    permission_classes = [IsAuthenticatedUser]
    serializer_class = FavoriteSerializer
    lookup_field = "property_id"

    def get_queryset(self):
        return (
            Favorite.objects.filter(user=self.request.user)
            .select_related("property__agent")
            .prefetch_related("property__images")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            if getattr(self.paginator, "page", None) is not None:
                response["X-Total-Count"] = self.paginator.page.paginator.count
            return response
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        payload = FavoriteInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        property_obj = self.get_property(
            payload.validated_data["property_id"], active_only=True
        )
        favorite, _ = Favorite.objects.get_or_create(
            user=request.user, property=property_obj
        )
        serializer = self.get_serializer(favorite)
        return Response(serializer.data, status=http_status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        property_id = self.as_uuid(kwargs[self.lookup_field])
        self.get_property(property_id)
        Favorite.objects.filter(user=request.user, property_id=property_id).delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)

    def get_property(self, property_id, *, active_only=False):
        """Inmueble de un `property_id`, o `404` si no existe.

        `active_only` es lo que distingue al `POST` del `DELETE`: no se puede
        guardar un inmueble retirado del catálogo, pero sí quitarle un favorito
        que ya existía antes de la puesta en `SUSPENDIDO`.
        """
        raw = self.as_uuid(property_id)
        queryset = Property.objects.filter(pk=raw)
        if active_only:
            queryset = queryset.filter(is_active=True)
        prop = queryset.first()
        if prop is None:
            raise self.property_not_found()
        return prop

    @staticmethod
    def as_uuid(value):
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except (TypeError, ValueError, AttributeError):
            raise FavoriteViewSet.property_not_found()

    @staticmethod
    def property_not_found():
        return ProblemError(
            code="resource_not_found",
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="No existe una propiedad con el identificador indicado.",
        )
