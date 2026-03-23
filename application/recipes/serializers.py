from rest_framework import serializers
from .models import Recipe, RecipeIngredient

class IngredientInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    quantity = serializers.FloatField()
    unit = serializers.CharField(max_length=50, required=False, default="g")
    calories_per_100g = serializers.FloatField(required=False, default=0, min_value=0)
    protein_per_100g = serializers.FloatField(required=False, default=0, min_value=0)
    carbs_per_100g = serializers.FloatField(required=False, default=0, min_value=0)
    fat_per_100g = serializers.FloatField(required=False, default=0, min_value=0)

class RecipeCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    servings = serializers.IntegerField(min_value=1)
    recipe_image= serializers.CharField(required=False, allow_blank=True, default="")
    ingredients = IngredientInputSerializer(many=True)


class RecipeUpdateSerializer(serializers.Serializer):
    # Update scope for the shared editor page.
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    ingredients = IngredientInputSerializer(many=True)
    recipe_image = serializers.CharField(required=False, allow_blank=True, default="")

class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)

    class Meta:
        model = RecipeIngredient
        fields = [
            "ingredient_name",
            "quantity",
            "unit",
            "calories_per_100g",
            "protein_per_100g",
            "carbs_per_100g",
            "fat_per_100g",
        ]

class RecipeDetailSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(source="recipe_ingredients", many=True, read_only=True)
    macros = serializers.DictField(read_only=True)

    class Meta:
        model = Recipe
        fields = ["id", "name", "description", "servings", "recipe_image", "created_at", "ingredients", "macros"]

class RecipeListSerializer(serializers.ModelSerializer):
    macros = serializers.DictField(read_only=True)

    class Meta:
        model = Recipe
        fields = ["id", "name", "servings", "created_at", "macros", 'recipe_image']
