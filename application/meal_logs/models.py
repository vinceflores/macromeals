from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class MealLog(models.Model):

    MEAL_TYPES = [
        ('BREAKFAST', 'Breakfast'),
        ('LUNCH', 'Lunch'),
        ('DINNER', 'Dinner'),
        ('SNACK', 'Snack'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meal_logs")
    meal_name = models.CharField(max_length=20, choices = MEAL_TYPES)
    recipe_name = models.CharField(max_length=20, blank =True, default="")
    date_logged = models.DateField(default=timezone.now)
    description = models.TextField(blank=True, default="")
    ingredients = models.JSONField(default=list, blank=True)
    servings = models.FloatField(default=1)
    calories = models.FloatField(default=0)
    protein = models.FloatField(default=0)
    carbohydrates = models.FloatField(default=0)
    fat = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    # def clean(self):
    #     if self.meal_name != 'SNACK':
    #         existing_meal = MealLog.objects.filter(
    #             user = self.user,
    #             meal_name = self.meal_name,
    #             date_logged = self.date_logged
    #         )

    #         if self.pk:
    #             existing_meal = existing_meal.exclude(pk = self.pk)

    #         if existing_meal.exists():
    #             raise ValidationError(
    #                 f"You have already logged {self.get_meal_name_display()} for {self.date_logged}. Edit the existing log, or change your meal type."
    #             )
            

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:

        ordering = ["-date_logged", "-created_at"]
    def __str__(self):
        return f"{self.user.email} - {self.get_meal_name_display()} ({self.date_logged})"

        
class WaterLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="water_logs") 
    water = models.FloatField(default=0) # in ml
    created_at = models.DateTimeField(auto_now_add=True)
    date_logged = models.DateField(default=timezone.now)
    class Meta:
        ordering = ["-date_logged", "-created_at"]
