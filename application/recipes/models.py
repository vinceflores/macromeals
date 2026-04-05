from django.db import models
from django.conf import settings


class Ingredient(models.Model):
    name = models.CharField(max_length=255, unique=True)


class Recipe(models.Model):

    class Visibility(models.TextChoices):
        PRIVATE      = 'private',      'Private'
        FRIENDS_ONLY = 'friends_only', 'Friends Only'
        PUBLIC       = 'public',       'Public'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recipes',
    )
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    servings    = models.PositiveIntegerField(default=1)
    created_at  = models.DateTimeField(auto_now_add=True)
    recipe_image=models.TextField(blank=True, default="vv")

    visibility = models.CharField(
        max_length=15,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
        help_text="private = only you | friends_only = accepted friends | public = everyone",
    )

    source_recipe = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='copies',
    )


class RecipeIngredient(models.Model):
    recipe     = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    quantity   = models.FloatField()
    unit       = models.CharField(max_length=50, default='g')
    calories_per_100g = models.FloatField(default=0)
    protein_per_100g  = models.FloatField(default=0)
    carbs_per_100g    = models.FloatField(default=0)
    fat_per_100g      = models.FloatField(default=0)
