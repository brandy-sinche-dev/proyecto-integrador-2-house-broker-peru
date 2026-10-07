from django.urls import path

from .views import (
    LoginView,
    PasswordResetConfirmView,
    PasswordResetView,
    RefreshView,
    RegisterView,
)

urlpatterns = [
    path("register", RegisterView.as_view(), name="auth-register"),
    path("login", LoginView.as_view(), name="auth-login"),
    path("refresh", RefreshView.as_view(), name="auth-refresh"),
    path("password-reset/", PasswordResetView.as_view(), name="auth-password-reset"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
]
