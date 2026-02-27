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

    dailyCalorieGoal = models.PositiveIntegerField(default = 2000, null=True, blank=True)
    proteinGoal = models.PositiveIntegerField(
        default = 30,
        validators = [
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        null=True,
        blank=True
    )
    carbsGoal = models.PositiveIntegerField(
        default = 45,
        validators = [
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        null=True,
        blank=True
    )
    fatGoal = models.PositiveIntegerField(
        default = 25,
        validators = [
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        null=True,
        blank=True
    )
    waterGoal = models.DecimalField(
        default = 2.5,
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True
    )


    



    #ensuring that macro goals add up to 100%
    def clean(self):
        super().clean()

        if self.proteinGoal is not None and self.carbsGoal is not None and self.fatGoal is not None:
            totalMacros = self.proteinGoal + self.carbsGoal + self.fatGoal

            if (totalMacros != 100):
                raise ValidationError(f"Total macro percentages must equal 100%. Current total: {totalMacros}%")
