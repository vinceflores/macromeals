from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from .serializers import RegisterSerializer

#test
#handle the HTTP request (POST) (restful apis)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = request.data)

        #validate the data
        if (serializer.is_valid()):
            serializer.save()
            return Response({"message": "User created succesfully!"}, status = status.HTTP_201_CREATED)
        
        #if invalid
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
