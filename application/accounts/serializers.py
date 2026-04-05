from rest_framework import serializers
from .models import CustomUser, FriendRequest
import math


# ─────────────────────────────────────────────────────────────────────────────
# Calculation helpers (unchanged from onboarding)
# ─────────────────────────────────────────────────────────────────────────────

def _activity_multiplier(days_per_week: int) -> float:
    if days_per_week <= 0:  return 1.200
    elif days_per_week <= 2: return 1.375
    elif days_per_week <= 4: return 1.550
    elif days_per_week <= 6: return 1.725
    else:                    return 1.900


_MACRO_SPLITS = {
    "lose_weight": {"carbs": 40, "protein": 30, "fat": 30},
    "maintain":    {"carbs": 45, "protein": 30, "fat": 25},
    "gain_muscle": {"carbs": 40, "protein": 35, "fat": 25},
    "general":     {"carbs": 50, "protein": 25, "fat": 25},
}

_CALORIE_ADJUSTMENTS = {
    "lose_weight": -500,
    "maintain":       0,
    "gain_muscle":  +300,
    "general":        0,
}


def calculate_goals(weight_kg, height_cm, age, biological_sex,
                    exercise_days_per_week, fitness_goal) -> dict:
    base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if biological_sex == CustomUser.BiologicalSex.MALE:
        bmr = base + 5
    elif biological_sex == CustomUser.BiologicalSex.FEMALE:
        bmr = base - 161
    else:
        bmr = base - 78

    tdee       = bmr * _activity_multiplier(exercise_days_per_week)
    adjustment = _CALORIE_ADJUSTMENTS.get(fitness_goal, 0)
    daily_cal  = max(1200, round(tdee + adjustment))
    split      = _MACRO_SPLITS.get(fitness_goal, _MACRO_SPLITS["general"])
    water_ml   = round((35 * weight_kg) / 50) * 50

    return {
        "daily_calorie_goal": daily_cal,
        "protein_goal":       split["protein"],
        "carbs_goal":         split["carbs"],
        "fat_goal":           split["fat"],
        "water_goal":         int(water_ml),
    }


# ─────────────────────────────────────────────────────────────────────────────
# User serializers
# ─────────────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = [
            'email', 'first_name', 'last_name',
            'protein_goal', 'carbs_goal', 'fat_goal',
            'water_goal', 'daily_calorie_goal',
            'height_cm', 'weight_kg', 'age', 'biological_sex',
            'onboarding_complete',
        ]
        read_only_fields = ['onboarding_complete']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = CustomUser
        fields = ('email', 'first_name', 'last_name', 'password')

    def create(self, validated_data):
        return CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )


class OnboardingSerializer(serializers.Serializer):
    height_cm              = serializers.FloatField(min_value=50,  max_value=280)
    weight_kg              = serializers.FloatField(min_value=20,  max_value=500)
    age                    = serializers.IntegerField(min_value=13, max_value=120)
    biological_sex         = serializers.ChoiceField(choices=CustomUser.BiologicalSex.choices)
    exercise_days_per_week = serializers.IntegerField(min_value=0, max_value=7)
    fitness_goal           = serializers.ChoiceField(choices=[
        ("lose_weight", "Lose weight"),
        ("maintain",    "Maintain weight"),
        ("gain_muscle", "Gain muscle"),
        ("general",     "Improve general nutrition"),
    ])

    def save(self, user: CustomUser, **kwargs):
        d     = self.validated_data
        goals = calculate_goals(
            weight_kg=d['weight_kg'],
            height_cm=d['height_cm'],
            age=d['age'],
            biological_sex=d['biological_sex'],
            exercise_days_per_week=d['exercise_days_per_week'],
            fitness_goal=d['fitness_goal'],
        )
        user.height_cm      = d['height_cm']
        user.weight_kg      = d['weight_kg']
        user.age            = d['age']
        user.biological_sex = d['biological_sex']
        user.daily_calorie_goal = goals['daily_calorie_goal']
        user.protein_goal       = goals['protein_goal']
        user.carbs_goal         = goals['carbs_goal']
        user.fat_goal           = goals['fat_goal']
        user.water_goal         = goals['water_goal']
        user.onboarding_complete = True
        user.save()
        return goals


# ─────────────────────────────────────────────────────────────────────────────
# Friend serializers
# ─────────────────────────────────────────────────────────────────────────────

class PublicUserSerializer(serializers.ModelSerializer):
    """Minimal safe representation of a user shown to others."""
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        first = obj.first_name or ""
        last  = obj.last_name  or ""
        full  = f"{first} {last}".strip()
        return full if full else obj.email

    class Meta:
        model  = CustomUser
        fields = ['id', 'email', 'full_name']


class FriendRequestSerializer(serializers.ModelSerializer):
    sender   = PublicUserSerializer(read_only=True)
    receiver = PublicUserSerializer(read_only=True)

    class Meta:
        model  = FriendRequest
        fields = ['id', 'sender', 'receiver', 'status', 'created_at']
