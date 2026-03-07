from django.conf import settings
from django.db import models


class MealLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meal_logs")
    meal_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    ingredients = models.JSONField(default=list, blank=True)
    servings = models.FloatField(default=1)
    calories = models.FloatField(default=0)
    protein = models.FloatField(default=0)
    carbohydrates = models.FloatField(default=0)
    fat = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
