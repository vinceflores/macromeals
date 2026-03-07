from rest_framework import serializers

from .models import MealLog


class MealLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealLog
        fields = [
            "id",
            "meal_name",
            "calories",
            "protein",
            "carbohydrates",
            "fat",
            "created_at",
        ]


class MealLogCreateSerializer(serializers.Serializer):
    meal_name = serializers.CharField(max_length=255)
    calories = serializers.FloatField(min_value=0, required=False, default=0)
    protein = serializers.FloatField(min_value=0, required=False, default=0)
    carbohydrates = serializers.FloatField(min_value=0, required=False, default=0)
    fat = serializers.FloatField(min_value=0, required=False, default=0)
