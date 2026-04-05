from rest_framework import serializers
from .models import Recipe, RecipeIngredient


class IngredientInputSerializer(serializers.Serializer):
    name              = serializers.CharField(max_length=255)
    quantity          = serializers.FloatField()
    unit              = serializers.CharField(max_length=50, required=False, default='g')
    calories_per_100g = serializers.FloatField(required=False, default=0, min_value=0)
    protein_per_100g  = serializers.FloatField(required=False, default=0, min_value=0)
    carbs_per_100g    = serializers.FloatField(required=False, default=0, min_value=0)
    fat_per_100g      = serializers.FloatField(required=False, default=0, min_value=0)


class RecipeCreateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    servings    = serializers.IntegerField(min_value=1)
    recipe_image= serializers.CharField(required=False, allow_blank=True, default="")
    ingredients = IngredientInputSerializer(many=True)


class RecipeUpdateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    ingredients = IngredientInputSerializer(many=True)
    recipe_image = serializers.CharField(required=False, allow_blank=True, default="")


class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)

    class Meta:
        model  = RecipeIngredient
        fields = [
            'ingredient_name', 'quantity', 'unit',
            'calories_per_100g', 'protein_per_100g',
            'carbs_per_100g', 'fat_per_100g',
        ]


class RecipeDetailSerializer(serializers.ModelSerializer):
    ingredients        = RecipeIngredientSerializer(source='recipe_ingredients', many=True, read_only=True)
    macros             = serializers.DictField(read_only=True)
    owner_name         = serializers.SerializerMethodField()
    source_recipe_id   = serializers.IntegerField(source='source_recipe.id',   read_only=True, allow_null=True)
    source_recipe_name = serializers.CharField(source='source_recipe.name',   read_only=True, allow_null=True)
    source_owner_name  = serializers.SerializerMethodField()

    def get_owner_name(self, obj):
        full = f'{obj.user.first_name or ""} {obj.user.last_name or ""}'.strip()
        return full if full else obj.user.email

    def get_source_owner_name(self, obj):
        if not obj.source_recipe:
            return None
        u    = obj.source_recipe.user
        full = f'{u.first_name or ""} {u.last_name or ""}'.strip()
        return full if full else u.email

    class Meta:
        model  = Recipe
        fields = [
            'id', 'name', 'description', 'servings', 'recipe_image', 'created_at',
            'visibility', 'owner_name',
            'source_recipe_id', 'source_recipe_name', 'source_owner_name',
            'ingredients', 'macros',
        ]


class RecipeListSerializer(serializers.ModelSerializer):
    macros             = serializers.DictField(read_only=True)
    source_owner_name  = serializers.SerializerMethodField()
    source_recipe_name = serializers.CharField(source='source_recipe.name', read_only=True, allow_null=True)

    def get_source_owner_name(self, obj):
        if not obj.source_recipe:
            return None
        u    = obj.source_recipe.user
        full = f'{u.first_name or ""} {u.last_name or ""}'.strip()
        return full if full else u.email

    class Meta:
        model  = Recipe
        fields = [
            'id', 'name', 'servings', 'created_at', 'recipe_image',
            'visibility', 'source_owner_name', 'source_recipe_name',
            'macros',
        ]


class PublicRecipeSerializer(serializers.ModelSerializer):
    macros      = serializers.DictField(read_only=True)
    ingredients = RecipeIngredientSerializer(source='recipe_ingredients', many=True, read_only=True)
    owner_name  = serializers.SerializerMethodField()

    def get_owner_name(self, obj):
        full = f'{obj.user.first_name or ""} {obj.user.last_name or ""}'.strip()
        return full if full else 'MacroMeals User'

    class Meta:
        model  = Recipe
        fields = ['id', 'name', 'description', 'servings', 'created_at', 'owner_name', 'ingredients', 'macros']
