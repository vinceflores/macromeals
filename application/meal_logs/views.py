from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import WaterLogSerializer
from .models import MealLog
from .serializers import MealLogCreateSerializer, MealLogSerializer
from django.utils import timezone

def _compute_macros_from_ingredients(ingredients):
    totals = {"calories": 0.0, "protein": 0.0, "carbohydrates": 0.0, "fat": 0.0}
    for ingredient in ingredients:
        qty = float(ingredient.get("quantity", 0) or 0)
        factor = qty / 100.0
        totals["calories"] += float(ingredient.get("calories_per_100g", 0) or 0) * factor
        totals["protein"] += float(ingredient.get("protein_per_100g", 0) or 0) * factor
        totals["carbohydrates"] += float(ingredient.get("carbs_per_100g", 0) or 0) * factor
        totals["fat"] += float(ingredient.get("fat_per_100g", 0) or 0) * factor
    return {key: round(value, 2) for key, value in totals.items()}


class MealLogListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = MealLog.objects.filter(user=request.user)
        date_param = request.query_params.get('date')
        if date_param:
            logs = logs.filter(date_logged=date_param)
        return Response({"results": MealLogSerializer(logs, many=True).data})

    def post(self, request):
        serializer = MealLogCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        ingredients = validated.get("ingredients", [])
        computed = _compute_macros_from_ingredients(ingredients)
        meal_log = MealLog.objects.create(
            user=request.user,
            meal_name=validated["meal_name"],
            description=validated.get("description", ""),
            date_logged=validated.get("date_logged"),
            ingredients=ingredients,
            servings=float(validated.get("servings", 1)),
            calories=computed["calories"],
            protein=computed["protein"],
            carbohydrates=computed["carbohydrates"],
            fat=computed["fat"],
        )
        return Response(MealLogSerializer(meal_log).data, status=status.HTTP_201_CREATED)


class MealLogDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, log_id: int):
        meal_log = MealLog.objects.filter(id=log_id, user=request.user).first()
        if not meal_log:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(MealLogSerializer(meal_log).data, status=status.HTTP_200_OK)

    def put(self, request, log_id: int):
        meal_log = MealLog.objects.filter(id=log_id, user=request.user).first()
        if not meal_log:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = MealLogCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        ingredients = validated.get("ingredients", [])
        computed = _compute_macros_from_ingredients(ingredients)

        meal_log.meal_name = validated["meal_name"]
        meal_log.description = validated.get("description", "")
        meal_log.ingredients = ingredients
        meal_log.servings = float(validated.get("servings", meal_log.servings or 1))
        if "date_logged" in validated:
            meal_log.date_logged = validated["date_logged"]
        meal_log.calories = computed["calories"]
        meal_log.protein = computed["protein"]
        meal_log.carbohydrates = computed["carbohydrates"]
        meal_log.fat = computed["fat"]
        meal_log.save()

        return Response(MealLogSerializer(meal_log).data, status=status.HTTP_200_OK)

    def delete(self, request, log_id: int):
        meal_log = MealLog.objects.filter(id=log_id, user=request.user).first()
        if not meal_log:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        meal_log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    
    def patch(self, request, log_id: int):
        meal_log = MealLog.objects.filter(id=log_id, user=request.user).first()
        if not meal_log:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        ingredients = request.data.get("ingredients")
        if ingredients is not None:
            meal_log.ingredients = ingredients
            
            computed = _compute_macros_from_ingredients(ingredients)
            meal_log.calories = computed["calories"]
            meal_log.protein = computed["protein"]
            meal_log.carbohydrates = computed["carbohydrates"]
            meal_log.fat = computed["fat"]

        if "servings" in request.data:
            meal_log.servings = float(request.data["servings"])
        if "meal_name" in request.data:
            meal_log.meal_name = request.data["meal_name"]
        if "description" in request.data:
            meal_log.description = request.data["description"]

        meal_log.save()
        return Response(MealLogSerializer(meal_log).data, status=status.HTTP_200_OK)
    

class MealLogViewSet(viewsets.ModelViewSet):
    queryset = MealLog.objects.all()
    serializer_class = MealLogSerializer

   
    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


class WaterLogView(APIView):
    permission_classes =[IsAuthenticated]
    serializer_class = WaterLogSerializer
    def get(self):
        pass
        
    def post(self, request):

        date_logged = request.data.get('date_logged') or timezone.localtime(timezone.now().date())
        serializer = self.serializer_class  (data = request.data)
        if not serializer.is_valid():
            return Response( {"errors": serializer.errors},status=status.HTTP_400_BAD_REQUEST)
        water = serializer.save(user = request.user, date_logged = date_logged)
        return Response(status=status.HTTP_201_CREATED)

