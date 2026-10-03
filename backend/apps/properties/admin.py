from django.contrib import admin

from .models import District, Property, PropertyImage, PropertyOwner


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "ubigeo", "province", "is_active")
    search_fields = ("name", "ubigeo")
    list_filter = ("is_active", "province")


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "title",
        "price",
        "currency",
        "mode",
        "property_type",
        "status",
        "is_active",
        "created_at",
    )
    list_filter = ("status", "property_type", "mode", "is_active")
    search_fields = ("code", "title", "address")
    raw_id_fields = ("agent", "district", "created_by")


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ("property", "storage_key", "sort_order", "is_cover")
    list_filter = ("is_cover",)


@admin.register(PropertyOwner)
class PropertyOwnerAdmin(admin.ModelAdmin):
    list_display = ("full_name", "property", "is_representative")
    search_fields = ("full_name", "document_number")
