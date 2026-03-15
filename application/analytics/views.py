from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from meal_logs.models import MealLog
from django.utils   import timezone
import numpy as np
from collections import namedtuple
from meal_logs.services.water_log import WaterLogService

from meal_logs.serializers import MealLogSerializer
# Create your views here.

class CurrentDayProgressView(APIView): 
    permission_classes = [IsAuthenticated]
    water_log_service = WaterLogService

    def get(self, request): 
        date = request.query_params.get('date');

        target_date = date if date else timezone.now().date()
        
        
        user = self.request.user
        # created_at
        today = timezone.now().date()
        meals = MealLog.objects.filter(user=user, date_logged = target_date)
        macros_np= np.array([m for m in meals.values_list( 'calories','carbohydrates', 'fat', 'protein')])
        fields = [ 'calories','carbohydrates', 'fat', 'protein']
        current = np.round(np.sum(macros_np,axis=0), 2)
        Totals = namedtuple('Totals', fields)
        if macros_np.size == 0:
            totals = Totals(0, 0, 0, 0)
        else:
            current = np.round(np.sum(macros_np, axis=0), 2)
            totals = Totals(*current.tolist())

        water = self.water_log_service.getCurrentDay(user=user, date = target_date)
        
        return Response(
            {   
             "current": {
                "calories": totals.calories ,
                "fat": totals.fat,
                "protein": totals.protein,
                "carbohydrates": totals.carbohydrates,
                "water": water
                },
             "goal": {
                "calories": user.daily_calorie_goal,
                "fat": user.daily_calorie_goal/8 * user.fat_goal/100 , 
                "protein":  user.daily_calorie_goal/4 * user.protein_goal/100,
                "carbohydrates": user.daily_calorie_goal/4 * user.carbs_goal/100, 
                "water": user.water_goal
             }
            }
        )       

class CurrentDayLoggedMeals(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date = request.query_params.get('date')
        target_date = date if date else timezone.now().date()


        meal_log = MealLog.objects.filter( user=request.user, date_logged = target_date)
        # if not meal_log:
        #     return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(MealLogSerializer(meal_log).data, many = True, status=status.HTTP_200_OK) 