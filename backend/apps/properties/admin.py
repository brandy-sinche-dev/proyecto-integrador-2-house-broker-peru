from django.contrib import admin

from .models import (
    District,
    Property,
    PropertyImage,
    PropertyOwner,
    PropertySchedule,
    PropertyStatusChange,
)


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


@admin.register(PropertySchedule)
class PropertyScheduleAdmin(admin.ModelAdmin):
    list_display = ("property", "weekday", "start_time", "end_time", "is_active")
    list_filter = ("weekday", "is_active")
    raw_id_fields = ("property",)


@admin.register(PropertyStatusChange)
class PropertyStatusChangeAdmin(admin.ModelAdmin):
    list_display = ("property", "previous_status", "new_status", "changed_by", "changed_at")
    list_filter = ("new_status", "previous_status")
    raw_id_fields = ("property", "changed_by")
    # Tabla append-only: el admin tampoco debe editar el historial.
    readonly_fields = (
        "property",
        "previous_status",
        "new_status",
        "reason",
        "changed_by",
        "changed_at",
    )

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
