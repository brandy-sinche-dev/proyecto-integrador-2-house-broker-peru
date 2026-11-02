"""Perfil comercial del cliente (HU-CRM-03).

Extensión 1:1 de la cuenta de usuario que guarda lo que el cliente declaró al
asistente: presupuesto, preferencias y nivel de interés. El contrato expone
estos datos como anulables porque una cuenta recién registrada todavía no los
tiene; por eso la ficha (`ClientProfileSerializer`) tolera la ausencia de esta
fila.

La tabla sigue `docs/database/data-model.md` §1.2. `document_type` y
`document_number` existen para la integridad documental, pero no se publican:
son PII de identidad y ningún requisito de la historia los pide.
"""

import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.properties.models import Currency


class ClientProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_profile",
    )
    document_type = models.CharField(max_length=20, null=True, blank=True)
    document_number = models.CharField(max_length=20, null=True, blank=True)
    budget_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    budget_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    budget_currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.PEN
    )
    preferred_district = models.CharField(max_length=100, null=True, blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    interest_level = models.SmallIntegerField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_profile"
        constraints = [
            models.CheckConstraint(
                condition=Q(budget_min__isnull=True)
                | Q(budget_max__isnull=True)
                | Q(budget_min__lte=F("budget_max")),
                name="client_profile_budget_range",
            ),
            models.CheckConstraint(
                condition=Q(budget_min__isnull=True) | Q(budget_min__gt=0),
                name="client_profile_budget_min_positive",
            ),
            models.CheckConstraint(
                condition=Q(interest_level__isnull=True)
                | (Q(interest_level__gte=1) & Q(interest_level__lte=5)),
                name="client_profile_interest_range",
            ),
            models.UniqueConstraint(
                fields=["document_type", "document_number"],
                condition=Q(document_number__isnull=False),
                name="client_profile_document_unique",
            ),
        ]

    def __str__(self):
        return f"Cliente {self.user_id}"
