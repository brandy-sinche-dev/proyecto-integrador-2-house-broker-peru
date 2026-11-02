"""Endpoints de la ficha e historial del cliente (HU-CRM-03, RF-CRM-03).

Ambas operaciones comparten el mismo alcance: un `AGENTE` solo ve clientes con
citas asignadas a su cuenta, un `ADMINISTRADOR` ve cualquier cliente y un
`CLIENTE` recibe `403`. La resolución del cliente ocurre después de validar el
rol, para que un `404` no se convierta en una forma de enumerar cuentas.
"""

from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.properties.pagination import PropertyPagination
from apps.properties.problems import ProblemResponseMixin

from .permissions import IsAgentOrAdmin
from .serializers import (
    ClientHistoryEntrySerializer,
    ClientProfileSerializer,
)
from .services import (
    build_client_history,
    build_client_profile,
    parse_history_filters,
    resolve_client,
)


class ClientProfileView(ProblemResponseMixin, APIView):
    """`GET /api/v1/clients/{id}/profile` — ficha consolidada del cliente."""

    permission_classes = [IsAgentOrAdmin]
    forbidden_detail = (
        "La ficha CRM del cliente solo está disponible para agentes y "
        "administradores."
    )

    def get(self, request, id):
        client = resolve_client(id)
        self.check_object_permissions(request, client)
        return Response(
            ClientProfileSerializer(build_client_profile(client)).data,
            status=http_status.HTTP_200_OK,
        )


class ClientHistoryView(ProblemResponseMixin, APIView):
    """`GET /api/v1/clients/{id}/history` — línea de tiempo del cliente."""

    permission_classes = [IsAgentOrAdmin]
    forbidden_detail = (
        "El historial CRM del cliente solo está disponible para agentes y "
        "administradores."
    )

    def get(self, request, id):
        filters = parse_history_filters(request.query_params)
        client = resolve_client(id)
        self.check_object_permissions(request, client)

        paginator = PropertyPagination()
        entries = build_client_history(client, filters)
        page = paginator.paginate_queryset(entries, request, view=self)
        if page is not None:
            serializer = ClientHistoryEntrySerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response["X-Total-Count"] = paginator.page.paginator.count
            return response

        serializer = ClientHistoryEntrySerializer(entries, many=True)
        return Response(serializer.data)
