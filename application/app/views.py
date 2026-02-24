from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.views import View
from django.http import JsonResponse
# Create your views here.
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user

        if user.is_authenticated:
            return JsonResponse({"email": user.email})

        return JsonResponse({"error": "Not authenticated"}, status=401)