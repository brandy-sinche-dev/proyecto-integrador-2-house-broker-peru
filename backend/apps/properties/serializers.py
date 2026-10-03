from rest_framework import serializers

from .models import Property, PropertyImage


class PropertyImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = ("id", "url", "sort_order", "is_cover", "alt_text", "width", "height")

    def get_url(self, obj):
        return obj.get_url()


class SellerSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.CharField(read_only=True)
    phone = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return (
            getattr(obj, "full_name", "")
            or obj.get_full_name()
            or obj.get_username()
        )

    def get_phone(self, obj):
        return getattr(obj, "phone", None)


class PropertySerializer(serializers.ModelSerializer):
    moneda = serializers.CharField(source="currency")
    area_construida = serializers.DecimalField(
        source="area_built", max_digits=10, decimal_places=2, allow_null=True
    )
    dormitorios = serializers.IntegerField(source="bedrooms", allow_null=True)
    banos = serializers.IntegerField(source="bathrooms", allow_null=True)
    estacionamientos = serializers.IntegerField(source="parking_spaces")
    link_galeria = serializers.CharField(source="exterior_url", allow_null=True)
    link_planos = serializers.CharField(source="floorplan_url", allow_null=True)
    negociable = serializers.BooleanField(source="is_negotiable", allow_null=True)
    destacado = serializers.BooleanField(source="is_featured")
    mantenimiento = serializers.DecimalField(
        source="maintenance_fee", max_digits=10, decimal_places=2, allow_null=True
    )
    images = PropertyImageSerializer(many=True, read_only=True)
    seller = SellerSerializer(source="agent", read_only=True)

    class Meta:
        model = Property
        fields = (
            "id",
            "title",
            "price",
            "moneda",
            "mode",
            "address",
            "property_type",
            "is_active",
            "created_at",
            "area_total",
            "area_construida",
            "dormitorios",
            "banos",
            "estacionamientos",
            "link_galeria",
            "link_planos",
            "negociable",
            "destacado",
            "mantenimiento",
            "images",
            "seller",
        )
        read_only_fields = fields
