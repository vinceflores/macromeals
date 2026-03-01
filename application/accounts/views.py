from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from .serializers import RegisterSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer
from rest_framework.generics import RetrieveUpdateAPIView

#test
#handle the HTTP request (POST) (restful apis)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = request.data)

        #validate the data
        if (serializer.is_valid()):

            user = serializer.save()

            refresh = RefreshToken.for_user(user)
            
            return Response({
                "message": "User created successfully!",
                "access": str(refresh.access_token), 
                "refresh": str(refresh),             
            }, status=status.HTTP_201_CREATED)
        #if invalid
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        
        return self.request.user