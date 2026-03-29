from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Error: Email field is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):

    class BiologicalSex(models.TextChoices):
        MALE   = 'male',   'Male'
        FEMALE = 'female', 'Female'
        OTHER  = 'other',  'Other / Prefer not to say'

    username = None
    email    = models.EmailField(unique=True)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    # ── Nutrition goals ───────────────────────────────────────────────────────
    daily_calorie_goal = models.PositiveIntegerField(default=2000, null=True, blank=True)
    protein_goal = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True,
    )
    carbs_goal = models.PositiveIntegerField(
        default=45,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True,
    )
    fat_goal = models.PositiveIntegerField(
        default=25,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True,
    )
    water_goal = models.PositiveIntegerField(
        default=2500,
        validators=[MinValueValidator(0)],
        null=True, blank=True,
    )

    # ── Physical stats ────────────────────────────────────────────────────────
    height_cm = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(280)],
    )
    weight_kg = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(500)],
    )
    age = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(13), MaxValueValidator(120)],
    )
    biological_sex = models.CharField(
        max_length=10,
        choices=BiologicalSex.choices,
        null=True, blank=True,
    )

    # ── Onboarding ────────────────────────────────────────────────────────────
    onboarding_complete = models.BooleanField(default=False)

    def clean(self):
        super().clean()
        if (
            self.protein_goal is not None
            and self.carbs_goal is not None
            and self.fat_goal is not None
        ):
            total = self.protein_goal + self.carbs_goal + self.fat_goal
            if total != 100:
                raise ValidationError(
                    f"Total macro percentages must equal 100%. Current total: {total}%"
                )

    # ── Friendship helpers ────────────────────────────────────────────────────
    def get_friends(self):
        """Return QuerySet of accepted friend CustomUser objects."""
        sent     = FriendRequest.objects.filter(sender=self,   status='accepted').values_list('receiver_id', flat=True)
        received = FriendRequest.objects.filter(receiver=self, status='accepted').values_list('sender_id',   flat=True)
        friend_ids = set(list(sent) + list(received))
        return CustomUser.objects.filter(id__in=friend_ids)

    def is_friends_with(self, other) -> bool:
        return FriendRequest.objects.filter(
            models.Q(sender=self, receiver=other) |
            models.Q(sender=other, receiver=self),
            status='accepted',
        ).exists()


class FriendRequest(models.Model):
    class Status(models.TextChoices):
        PENDING  = 'pending',  'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'

    sender   = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='sent_requests'
    )
    receiver = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='received_requests'
    )
    status     = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # One pending/accepted request between any two users at a time
        unique_together = [('sender', 'receiver')]

    def __str__(self):
        return f"{self.sender.email} → {self.receiver.email} [{self.status}]"
