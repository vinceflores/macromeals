from django.urls import path
from .views import RequestPasswordResetView, ConfirmPasswordResetView, VerifyCodeView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("password-reset/", RequestPasswordResetView.as_view()),
    path("password-reset/verify/", VerifyCodeView.as_view()),
    path("password-reset/confirm/", ConfirmPasswordResetView.as_view()),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # login route
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # to refresh token
]