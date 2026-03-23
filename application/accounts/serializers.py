from rest_framework import serializers
from .models import CustomUser
import math


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _activity_multiplier(days_per_week: int) -> float:
    """
    Map self-reported exercise days/week to a Mifflin-St Jeor activity factor.

    0 days   → Sedentary           (1.200)
    1–2 days → Lightly active      (1.375)
    3–4 days → Moderately active   (1.550)
    5–6 days → Very active         (1.725)
    7 days   → Extra active        (1.900)
    """
    if days_per_week <= 0:
        return 1.200
    elif days_per_week <= 2:
        return 1.375
    elif days_per_week <= 4:
        return 1.550
    elif days_per_week <= 6:
        return 1.725
    else:
        return 1.900


# Macro splits per goal (carbs%, protein%, fat%) — must sum to 100
_MACRO_SPLITS = {
    "lose_weight":   {"carbs": 40, "protein": 30, "fat": 30},
    "maintain":      {"carbs": 45, "protein": 30, "fat": 25},
    "gain_muscle":   {"carbs": 40, "protein": 35, "fat": 25},
    "general":       {"carbs": 50, "protein": 25, "fat": 25},
}

# Calorie adjustments relative to TDEE
_CALORIE_ADJUSTMENTS = {
    "lose_weight":  -500,
    "maintain":        0,
    "gain_muscle":  +300,
    "general":         0,
}


def calculate_goals(
    weight_kg: float,
    height_cm: float,
    age: int,
    biological_sex: str,
    exercise_days_per_week: int,
    fitness_goal: str,
) -> dict:
    """
    Returns a dict with calculated daily_calorie_goal, protein_goal,
    carbs_goal, fat_goal, and water_goal.

    Uses the Mifflin-St Jeor equation for BMR, then multiplies by an
    activity factor to get TDEE, then adjusts for the fitness goal.
    """
    # 1. BMR via Mifflin-St Jeor
    base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if biological_sex == CustomUser.BiologicalSex.MALE:
        bmr = base + 5
    elif biological_sex == CustomUser.BiologicalSex.FEMALE:
        bmr = base - 161
    else:
        # "Other / Prefer not to say" — use the midpoint (-78) as recommended
        # by St. Jeor Associates for individuals who don't identify as M/F
        bmr = base - 78

    # 2. TDEE
    tdee = bmr * _activity_multiplier(exercise_days_per_week)

    # 3. Adjust for goal
    adjustment = _CALORIE_ADJUSTMENTS.get(fitness_goal, 0)
    daily_calories = max(1200, round(tdee + adjustment))  # floor at 1200 kcal

    # 4. Macro splits
    split = _MACRO_SPLITS.get(fitness_goal, _MACRO_SPLITS["general"])

    # 5. Water goal: ~35 ml per kg of body weight, rounded to nearest 50 ml
    water_ml = round((35 * weight_kg) / 50) * 50

    return {
        "daily_calorie_goal": daily_calories,
        "protein_goal":       split["protein"],
        "carbs_goal":         split["carbs"],
        "fat_goal":           split["fat"],
        "water_goal":         int(water_ml),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Serializers
# ─────────────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'email',
            'first_name',
            'last_name',
            'protein_goal',
            'carbs_goal',
            'fat_goal',
            'water_goal',
            'daily_calorie_goal',
            # Physical stats
            'height_cm',
            'weight_kg',
            'age',
            'biological_sex',
            # Onboarding flag — read-only from the profile endpoint
            'onboarding_complete',
        ]
        read_only_fields = ['onboarding_complete']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('email', 'first_name', 'last_name', 'password')

    def create(self, validated_data):
        return CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )


class OnboardingSerializer(serializers.Serializer):
    """
    Accepts the quiz answers, runs the Mifflin-St Jeor calculation,
    and writes the results + physical stats back to the user record.
    """

    # Physical measurements — frontend always sends metric values
    # (it converts imperial → metric client-side before POSTing)
    height_cm = serializers.FloatField(
        min_value=50, max_value=280,
        help_text="Height in centimetres",
    )
    weight_kg = serializers.FloatField(
        min_value=20, max_value=500,
        help_text="Weight in kilograms",
    )
    age = serializers.IntegerField(min_value=13, max_value=120)

    biological_sex = serializers.ChoiceField(
        choices=CustomUser.BiologicalSex.choices,
    )

    exercise_days_per_week = serializers.IntegerField(
        min_value=0, max_value=7,
        help_text="How many days per week the user exercises",
    )

    fitness_goal = serializers.ChoiceField(
        choices=[
            ("lose_weight",  "Lose weight"),
            ("maintain",     "Maintain weight"),
            ("gain_muscle",  "Gain muscle"),
            ("general",      "Improve general nutrition"),
        ]
    )

    def save(self, user: CustomUser, **kwargs):
        data = self.validated_data
        goals = calculate_goals(
            weight_kg=data['weight_kg'],
            height_cm=data['height_cm'],
            age=data['age'],
            biological_sex=data['biological_sex'],
            exercise_days_per_week=data['exercise_days_per_week'],
            fitness_goal=data['fitness_goal'],
        )

        # Persist physical stats
        user.height_cm = data['height_cm']
        user.weight_kg = data['weight_kg']
        user.age = data['age']
        user.biological_sex = data['biological_sex']

        # Persist calculated goals
        user.daily_calorie_goal = goals['daily_calorie_goal']
        user.protein_goal       = goals['protein_goal']
        user.carbs_goal         = goals['carbs_goal']
        user.fat_goal           = goals['fat_goal']
        user.water_goal         = goals['water_goal']

        # Mark onboarding complete
        user.onboarding_complete = True

        user.save()
        return goals
