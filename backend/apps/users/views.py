from datetime import datetime, timedelta, timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.properties.problems import ProblemError, ProblemResponseMixin

from .models import PasswordResetToken
from .serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()
REFRESH_COOKIE = "hb_refresh_token"


def _profile(user):
    return getattr(user, "profile", None)


def _create_token_pair(user):
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    refresh["role"] = _profile(user).role if _profile(user) else "CLIENTE"
    access = refresh.access_token
    access["email"] = user.email
    access["role"] = _profile(user).role if _profile(user) else "CLIENTE"
    _record_outstanding(refresh, user)
    return access, refresh


def _record_outstanding(refresh, user):
    OutstandingToken.objects.update_or_create(
        jti=refresh["jti"],
        defaults={
            "token": str(refresh),
            "user": user,
            "created_at": timezone.now(),
            "expires_at": datetime.fromtimestamp(refresh["exp"], tz=dt_timezone.utc),
        },
    )


def _blacklist(refresh):
    try:
        token = OutstandingToken.objects.get(jti=refresh["jti"])
        BlacklistedToken.objects.get_or_create(token=token)
    except OutstandingToken.DoesNotExist:
        pass


def _set_refresh_cookie(response, refresh):
    response.set_cookie(
        REFRESH_COOKIE,
        str(refresh),
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=False,
        samesite="Strict",
        path="/api/v1/auth",
    )


def _problem(code, status_code, detail, errors=None):
    return ProblemError(
        code=code, status_code=status_code, detail=detail, errors=errors or []
    )


class RegisterView(ProblemResponseMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(ProblemResponseMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        access, refresh = _create_token_pair(user)
        response = Response(
            {
                "access": str(access),
                "token_type": "Bearer",
                "expires_in": int(access.lifetime.total_seconds()),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, refresh)
        return response


class RefreshView(ProblemResponseMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_value = request.COOKIES.get(REFRESH_COOKIE)
        if not token_value:
            raise _problem(
                "refresh_token_missing",
                status.HTTP_401_UNAUTHORIZED,
                "Falta el refresh token en la cookie de sesión.",
            )
        try:
            refresh = RefreshToken(token_value)
        except TokenError as exc:
            raise _problem(
                "invalid_refresh_token",
                status.HTTP_401_UNAUTHORIZED,
                "El refresh token es inválido o expiró.",
            ) from exc

        blacklisted = BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists()
        if blacklisted:
            raise _problem(
                "refresh_token_reused",
                status.HTTP_401_UNAUTHORIZED,
                "El refresh token ya fue rotado o revocado.",
            )
        user = User.objects.filter(id=refresh.get("user_id")).first()
        if user is None or not user.is_active:
            raise _problem(
                "account_disabled",
                status.HTTP_403_FORBIDDEN,
                "La cuenta está desactivada o no existe.",
            )
        _blacklist(refresh)
        access, new_refresh = _create_token_pair(user)
        response = Response(
            {
                "access": str(access),
                "token_type": "Bearer",
                "expires_in": int(access.lifetime.total_seconds()),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, new_refresh)
        return response


class PasswordResetView(ProblemResponseMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            token = RefreshToken.for_user(user).access_token
            PasswordResetToken.objects.create(
                user=user,
                token=str(token)[-64:],
                expires_at=timezone.now() + timedelta(hours=1),
            )
        return Response(
            {"detail": "Si el correo está registrado, recibirás un enlace de recuperación."},
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetConfirmView(ProblemResponseMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Contraseña actualizada."}, status=status.HTTP_200_OK)
