import re
from datetime import timedelta

from django.contrib.auth import authenticate, password_validation
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.properties.problems import ProblemError

from .models import PasswordResetToken, Role, UserProfile

User = get_user_model()

PASSWORD_MAX_AGE = timedelta(hours=1)


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def validate_password_strength(password: str) -> None:
    errors = []
    if len(password) < 10:
        errors.append("al menos 10 caracteres")
    if len(password) > 128:
        errors.append("máximo 128 caracteres")
    if not re.search(r"[A-Z]", password):
        errors.append("una mayúscula")
    if not re.search(r"[a-z]", password):
        errors.append("una minúscula")
    if not re.search(r"\d", password):
        errors.append("un dígito")
    if errors:
        raise ProblemError(
            code="weak_password",
            status_code=400,
            detail="El campo 'password' no cumple los requisitos de seguridad.",
            errors=[
                {
                    "parameter": "password",
                    "message": "La contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula y un dígito.",
                }
            ],
        )
    try:
        password_validation.validate_password(password)
    except Exception:
        raise ProblemError(
            code="weak_password",
            status_code=400,
            detail="El campo 'password' no cumple los requisitos de seguridad.",
            errors=[
                {
                    "parameter": "password",
                    "message": "La contraseña es demasiado común o insegura.",
                }
            ],
        )


class StrictFieldsSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict):
            unknown = sorted(set(data) - set(self.fields))
            if unknown:
                raise ProblemError(
                    code="invalid_query_parameter",
                    detail=f"El cuerpo trae campos no previstos: {', '.join(unknown)}.",
                    errors=[
                        {"parameter": name, "message": "Campo no reconocido."}
                        for name in unknown
                    ],
                )
        return super().to_internal_value(data)


class RegisterSerializer(StrictFieldsSerializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)
    full_name = serializers.CharField(min_length=2, max_length=120)
    phone = serializers.CharField(
        required=False, allow_blank=True, min_length=9, max_length=20
    )
    role = serializers.ChoiceField(
        choices=[Role.CLIENTE.value], default=Role.CLIENTE.value
    )

    def validate(self, attrs):
        email = normalize_email(attrs.get("email", ""))
        if User.objects.filter(email__iexact=email).exists() or User.objects.filter(
            username__iexact=email
        ).exists():
            raise ProblemError(
                code="email_already_registered",
                status_code=409,
                detail=f"Ya existe una cuenta con el correo '{email}'.",
            )
        if attrs.get("role") and attrs["role"] != Role.CLIENTE.value:
            raise ProblemError(
                code="role_not_assignable",
                status_code=400,
                detail="El registro público solo admite el rol 'CLIENTE'.",
                errors=[
                    {
                        "parameter": "role",
                        "message": "El valor indicado no puede asignarse en el registro.",
                    }
                ],
            )
        validate_password_strength(attrs.get("password", ""))
        attrs["email"] = email
        return attrs

    def create(self, validated_data):
        email = normalize_email(validated_data["email"])
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            first_name=validated_data["full_name"][:150],
        )
        UserProfile.objects.create(
            user=user,
            full_name=validated_data["full_name"],
            phone=validated_data.get("phone") or None,
            role=Role.CLIENTE,
        )
        return user


class LoginSerializer(StrictFieldsSerializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)

    def validate(self, attrs):
        email = normalize_email(attrs.get("email", ""))
        password = attrs.get("password", "")
        user = User.objects.filter(email__iexact=email).first() or User.objects.filter(
            username__iexact=email
        ).first()
        if user is not None and not user.is_active:
            raise ProblemError(
                code="account_disabled",
                status_code=403,
                detail="La cuenta está desactivada. Contacta al administrador para reactivarla.",
            )
        if user is None or not user.check_password(password):
            raise ProblemError(
                code="invalid_credentials",
                status_code=401,
                detail="El correo o la contraseña no coinciden con ninguna cuenta activa.",
            )
        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone", "role", "is_active", "created_at")
        read_only_fields = fields

    def get_full_name(self, obj):
        profile = getattr(obj, "profile", None)
        return getattr(profile, "full_name", "") or obj.get_full_name() or obj.get_username()

    def get_phone(self, obj):
        return getattr(getattr(obj, "profile", None), "phone", None)

    def get_role(self, obj):
        profile = getattr(obj, "profile", None)
        if profile and profile.role:
            return profile.role
        if obj.is_superuser or obj.is_staff:
            return Role.ADMINISTRADOR
        return Role.CLIENTE


class PasswordResetSerializer(StrictFieldsSerializer):
    email = serializers.EmailField(max_length=254)

    def validate(self, attrs):
        attrs["email"] = normalize_email(attrs["email"])
        return attrs


class PasswordResetConfirmSerializer(StrictFieldsSerializer):
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(max_length=128, trim_whitespace=False)

    def validate(self, attrs):
        validate_password_strength(attrs["password"])
        token = attrs["token"]
        try:
            record = PasswordResetToken.objects.select_related("user").get(token=token)
        except PasswordResetToken.DoesNotExist:
            raise ProblemError(
                code="invalid_reset_token",
                status_code=400,
                detail="El token de recuperación no es válido.",
            )
        if record.used_at is not None or record.expires_at < timezone.now():
            raise ProblemError(
                code="invalid_reset_token",
                status_code=400,
                detail="El token de recuperación expiró o ya fue utilizado.",
            )
        attrs["record"] = record
        return attrs

    def save(self):
        record = self.validated_data["record"]
        user = record.user
        user.set_password(self.validated_data["password"])
        user.save()
        record.used_at = timezone.now()
        record.save()
        return user
