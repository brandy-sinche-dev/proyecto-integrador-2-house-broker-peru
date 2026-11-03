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

from .permissions import IsAgentOrAdmin, IsClientNoteAgentOrAdmin
from .serializers import (
    ClientHistoryEntrySerializer,
    ClientNoteCreateInputSerializer,
    ClientNoteSerializer,
    ClientProfileSerializer,
)
from .services import (
    build_client_history,
    build_client_profile,
    create_client_note,
    list_client_notes,
    parse_history_filters,
    resolve_client,
    resolve_note,
    soft_delete_client_note,
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


class ClientNoteListCreateView(ProblemResponseMixin, APIView):
    """`GET` y `POST /api/v1/clients/{id}/notes` (HU-CRM-04)."""

    permission_classes = [IsClientNoteAgentOrAdmin]
    forbidden_detail = (
        "Las observaciones de atención solo están disponibles para agentes y "
        "administradores."
    )

    def get(self, request, id):
        client = resolve_client(id)
        self.check_object_permissions(request, client)

        paginator = PropertyPagination()
        queryset = list_client_notes(client)
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = ClientNoteSerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response["X-Total-Count"] = paginator.page.paginator.count
            return response

        serializer = ClientNoteSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, id):
        client = resolve_client(id)
        self.check_object_permissions(request, client)

        serializer = ClientNoteCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = create_client_note(
            client, request.user, serializer.validated_data
        )
        response = Response(
            ClientNoteSerializer(note).data,
            status=http_status.HTTP_201_CREATED,
        )
        response["Location"] = request.build_absolute_uri(
            f"/api/v1/clients/{client.pk}/notes/{note.pk}"
        )
        return response


class ClientNoteDetailView(ProblemResponseMixin, APIView):
    """`DELETE /api/v1/clients/{id}/notes/{note_id}` (HU-CRM-04)."""

    permission_classes = [IsClientNoteAgentOrAdmin]
    forbidden_detail = (
        "Las observaciones de atención solo están disponibles para agentes y "
        "administradores."
    )
    note_forbidden_detail = (
        "Solo el agente autor de la nota o un administrador pueden eliminarla."
    )

    def delete(self, request, id, note_id):
        client = resolve_client(id)
        self.check_object_permissions(request, client)

        note = resolve_note(client, note_id)
        self.check_object_permissions(request, note)
        soft_delete_client_note(note)
        return Response(status=http_status.HTTP_204_NO_CONTENT)
