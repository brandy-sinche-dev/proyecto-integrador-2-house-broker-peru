import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PropertyType(models.TextChoices):
    DEPARTAMENTO = "DEPARTAMENTO", "Departamento"
    CASA = "CASA", "Casa"
    TERRENO = "TERRENO", "Terreno"
    OFICINA = "OFICINA", "Oficina"


class TransactionMode(models.TextChoices):
    VENTA = "VENTA", "Venta"
    ALQUILER = "ALQUILER", "Alquiler"


class Currency(models.TextChoices):
    PEN = "PEN", "Soles"
    USD = "USD", "Dólares"


class PropertyStatus(models.TextChoices):
    DISPONIBLE = "DISPONIBLE", "Disponible"
    RESERVADO = "RESERVADO", "Reservado"
    ALQUILADO = "ALQUILADO", "Alquilado"
    VENDIDO = "VENDIDO", "Vendido"
    SUSPENDIDO = "SUSPENDIDO", "Suspendido"


class District(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ubigeo = models.CharField(max_length=6, unique=True)
    name = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    department = models.CharField(max_length=100, default="Lima")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)
        constraints = [
            models.CheckConstraint(
                condition=Q(ubigeo__regex=r"^[0-9]{6}$"),
                name="district_ubigeo_format",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.ubigeo})"


class Property(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.PEN
    )
    mode = models.CharField(max_length=12, choices=TransactionMode.choices)
    property_type = models.CharField(max_length=20, choices=PropertyType.choices)
    status = models.CharField(
        max_length=15,
        choices=PropertyStatus.choices,
        default=PropertyStatus.DISPONIBLE,
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="properties",
    )
    district = models.ForeignKey(
        District, on_delete=models.PROTECT, related_name="properties"
    )
    address = models.CharField(max_length=300)
    reference = models.CharField(max_length=100, null=True, blank=True)
    area_total = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    area_built = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    bedrooms = models.SmallIntegerField(null=True, blank=True)
    bathrooms = models.SmallIntegerField(null=True, blank=True)
    parking_spaces = models.SmallIntegerField(default=0)
    maintenance_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    accepts_pets = models.BooleanField(default=False)
    accepts_children = models.BooleanField(default=False)
    is_negotiable = models.BooleanField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    exterior_url = models.URLField(max_length=500, null=True, blank=True)
    floorplan_url = models.URLField(max_length=500, null=True, blank=True)
    features = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True
    )
    owner_notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_properties",
    )
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(
                fields=["is_active", "status", "property_type", "-created_at"],
                name="property_catalog_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(price__gt=0), name="property_price_positive"
            ),
            models.CheckConstraint(
                condition=Q(currency__in=[c.value for c in Currency]),
                name="property_currency_check",
            ),
            models.CheckConstraint(
                condition=Q(mode__in=[m.value for m in TransactionMode]),
                name="property_mode_check",
            ),
            models.CheckConstraint(
                condition=Q(property_type__in=[t.value for t in PropertyType]),
                name="property_type_check",
            ),
            models.CheckConstraint(
                condition=Q(status__in=[s.value for s in PropertyStatus]),
                name="property_status_check",
            ),
            models.CheckConstraint(
                condition=Q(parking_spaces__gte=0),
                name="property_parking_positive",
            ),
            models.CheckConstraint(
                condition=Q(maintenance_fee__isnull=True) | Q(maintenance_fee__gte=0),
                name="property_maintenance_positive",
            ),
            models.CheckConstraint(
                condition=Q(area_total__isnull=True) | Q(area_total__gte=0),
                name="property_area_total_positive",
            ),
            models.CheckConstraint(
                condition=Q(area_built__isnull=True) | Q(area_built__gte=0),
                name="property_area_built_positive",
            ),
            models.CheckConstraint(
                condition=Q(bedrooms__isnull=True) | Q(bedrooms__gte=0),
                name="property_bedrooms_positive",
            ),
            models.CheckConstraint(
                condition=Q(bathrooms__isnull=True) | Q(bathrooms__gte=0),
                name="property_bathrooms_positive",
            ),
            models.CheckConstraint(
                condition=Q(commission_rate__isnull=True)
                | (Q(commission_rate__gte=0) & Q(commission_rate__lte=1)),
                name="property_commission_range",
            ),
            models.CheckConstraint(
                condition=~Q(status=PropertyStatus.SUSPENDIDO, is_active=True),
                name="property_suspended_is_inactive",
            ),
        ]

    def __str__(self):
        return f"{self.code} · {self.title}"


class PropertyImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="images"
    )
    storage_key = models.CharField(max_length=500)
    sort_order = models.IntegerField(default=0)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    is_cover = models.BooleanField(default=False)
    alt_text = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("sort_order", "created_at")
        constraints = [
            models.UniqueConstraint(
                fields=["property", "storage_key"],
                name="property_image_storage_unique",
            ),
            models.UniqueConstraint(
                fields=["property"],
                condition=Q(is_cover=True),
                name="property_image_single_cover",
            ),
            models.CheckConstraint(
                condition=Q(width__isnull=True) | Q(width__gt=0),
                name="property_image_width_positive",
            ),
            models.CheckConstraint(
                condition=Q(height__isnull=True) | Q(height__gt=0),
                name="property_image_height_positive",
            ),
            models.CheckConstraint(
                condition=Q(sort_order__gte=0),
                name="property_image_sort_order_positive",
            ),
        ]

    def get_url(self):
        base = getattr(settings, "PROPERTY_MEDIA_BASE_URL", "").rstrip("/")
        return f"{base}/{self.storage_key.lstrip('/')}"

    def __str__(self):
        return self.storage_key


class PropertyOwner(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="owners"
    )
    full_name = models.CharField(max_length=150)
    document_type = models.CharField(max_length=20, null=True, blank=True)
    document_number = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(max_length=254, null=True, blank=True)
    is_representative = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["property", "document_number"],
                condition=Q(document_number__isnull=False),
                name="property_owner_document_unique",
            ),
        ]

    def __str__(self):
        return self.full_name
