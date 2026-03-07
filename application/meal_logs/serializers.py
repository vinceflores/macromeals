from rest_framework import serializers

from .models import MealLog


class MealLogIngredientSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    quantity = serializers.FloatField(min_value=0)
    unit = serializers.CharField(max_length=50, required=False, default="g")
    calories_per_100g = serializers.FloatField(required=False, default=0, min_value=0)
    protein_per_100g = serializers.FloatField(required=False, default=0, min_value=0)
    carbs_per_100g = serializers.FloatField(required=False, default=0, min_value=0)
    fat_per_100g = serializers.FloatField(required=False, default=0, min_value=0)


class MealLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealLog
        fields = [
            "id",
            "meal_name",
            "description",
            "ingredients",
            "servings",
            "calories",
            "protein",
            "carbohydrates",
            "fat",
            "created_at",
        ]


class MealLogCreateSerializer(serializers.Serializer):
    meal_name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    servings = serializers.FloatField(required=False, default=1, min_value=0.1)
    ingredients = MealLogIngredientSerializer(many=True, required=False, default=list)
