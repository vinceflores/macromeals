from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MealLog
from .serializers import MealLogCreateSerializer, MealLogSerializer


class MealLogListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = MealLog.objects.filter(user=request.user)
        return Response({"results": MealLogSerializer(logs, many=True).data})

    def post(self, request):
        serializer = MealLogCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        meal_log = MealLog.objects.create(user=request.user, **serializer.validated_data)
        return Response(MealLogSerializer(meal_log).data, status=status.HTTP_201_CREATED)
