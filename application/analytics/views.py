from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response

# Create your views here.

class CurrentDayProgressView(APIView): 
    
    def get(self, request): 
        
        return Response(
            {   
             "current": {
                "calories": 1000,
                "fat": 10.12,
                "protein": 67.8,
                "carbohydrates": 50.5,
                "water": 1000
                },
             "goal": {
                "calories": 2000,
                "fat": 2000 * 0.25, 
                "protein": 2000 * .30,
                "carbohydrates": 2000 * .45, 
                "water": 2500 
             }
            }
        )       

