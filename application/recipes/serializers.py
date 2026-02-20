from rest_framework import serializers
from .models import Recipe, RecipeIngredient

class IngredientInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    quantity = serializers.FloatField()
    unit = serializers.CharField(max_length=50, required=False, default="g")

class RecipeCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    servings = serializers.IntegerField(min_value=1)
    ingredients = IngredientInputSerializer(many=True)

class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)

    class Meta:
        model = RecipeIngredient
        fields = ["ingredient_name", "quantity", "unit"]

class RecipeDetailSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(source="recipe_ingredients", many=True, read_only=True)
    macros = serializers.DictField(read_only=True)

    class Meta:
        model = Recipe
        fields = ["id", "name", "description", "servings", "created_at", "ingredients", "macros"]

class RecipeListSerializer(serializers.ModelSerializer):
    macros = serializers.DictField(read_only=True)

    class Meta:
        model = Recipe
        fields = ["id", "name", "servings", "created_at", "macros"]