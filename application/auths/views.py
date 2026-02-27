# from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    RequestPasswordResetSerializer,
    ConfirmPasswordResetSerializer,
    VerifyCodeSerializer
)

class RequestPasswordResetView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = RequestPasswordResetSerializer(data=request.data)
        # if serializer.validate_email():
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Code sent to email"}, status=200)


class VerifyCodeView(APIView):
    permission_classes = []
    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True) 
        return Response({"message": "Code Verified"}, status=200)

class ConfirmPasswordResetView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = ConfirmPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password reset successful"}, status=200)