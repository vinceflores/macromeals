from django.db import models
from django.conf import settings

class Ingredient(models.Model):
    name = models.CharField(max_length=255, unique=True)

class Recipe(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recipes")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    servings = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="recipe_ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    quantity = models.FloatField()
    unit = models.CharField(max_length=50, default="g")