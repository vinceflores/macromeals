from django.urls import path
from .views import RegisterView, ProfileView, OnboardingView

urlpatterns = [
    path('register/',   RegisterView.as_view(),   name='register'),
    path('profile/',    ProfileView.as_view(),    name='profile'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
]
