from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

#custom class to avoid username issue
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password = None, **extra_fields):
        if not email:
            raise ValueError("Error: Email field is required")
        email = self.normalize_email(email)
        user = self.model(email = email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        return self.create_user(email, password, **extra_fields)
    

class CustomUser(AbstractUser):

    
    username = None
    email = models.EmailField(unique=True) #making email field mandatory
    #defining macro goals

    objects = CustomUserManager()

    #specifying that user email is required
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    daily_calorie_goal = models.PositiveIntegerField(default = 2000, null=True, blank=True)
    protein_goal = models.PositiveIntegerField(
        default = 30,
        validators = [
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        null=True,
        blank=True
    )
    carbs_goal = models.PositiveIntegerField(
        default = 45,
        validators = [
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        null=True,
        blank=True
    )
    fat_goal = models.PositiveIntegerField(
        default = 25,
        validators = [
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        null=True,
        blank=True
    )
    water_goal = models.DecimalField(
        default = 2500,
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True
    )

    #ensuring that macro goals add up to 100%
    def clean(self):
        super().clean()

        if self.protein_goal is not None and self.carbs_goal is not None and self.fat_goal is not None:
            total_macros = self.protein_goal + self.carbs_goal + self.fat_goal

            if (total_macros != 100):
                raise ValidationError(f"Total macro percentages must equal 100%. Current total: {total_macros}%")
