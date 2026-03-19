from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer, OnboardingSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "message": "User created successfully!",
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class OnboardingView(APIView):
    """
    POST /api/accounts/onboarding/

    Accepts quiz answers, calculates recommended calorie and macro goals
    using the Mifflin-St Jeor equation, persists everything, and returns
    the calculated goals alongside the updated user profile.

    Can also be called again at any time to redo the quiz (the banner on
    the dashboard won't reappear, but the profile page has a "Redo Quiz"
    button that hits this same endpoint).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = OnboardingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        goals = serializer.save(user=request.user)

        return Response(
            {
                "message": "Onboarding complete! Goals have been calculated and saved.",
                "calculated_goals": goals,
                # Return the full updated profile so the frontend can refresh state
                "profile": UserSerializer(request.user).data,
            },
            status=status.HTTP_200_OK,
        )
