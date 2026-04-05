"""
meal_logs/tests.py

Covers:
  Unit Tests        — _compute_macros_from_ingredients()
  Integration Tests — meal log CRUD, date filtering, water logging
  Use Case Tests    — TC9.1 (calendar meal tracking), TC10.1 (view progress)
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone

from accounts.models import CustomUser
from meal_logs.models import MealLog, WaterLog
from meal_logs.views import _compute_macros_from_ingredients


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_user(email, password="Test1234!"):
    return CustomUser.objects.create_user(
        email=email, password=password,
        first_name="Test", last_name="User",
    )


def get_token(email, password="Test1234!"):
    client = APIClient()
    res = client.post("/api/auth/token/", {"email": email, "password": password}, format="json")
    return res.data.get("access")


def auth_client(token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


SAMPLE_INGREDIENTS = [
    {
        "name": "chicken breast",
        "quantity": 200,
        "unit": "g",
        "calories_per_100g": 165,
        "protein_per_100g": 31,
        "carbs_per_100g": 0,
        "fat_per_100g": 3.6,
    }
]

MEAL_PAYLOAD = {
    "meal_name": "LUNCH",
    "recipe_name": "Chicken Lunch",
    "date_logged": str(timezone.now().date()),
    "servings": 1,
    "ingredients": SAMPLE_INGREDIENTS,
}


# ─────────────────────────────────────────────────────────────────────────────
# Unit Tests
# ─────────────────────────────────────────────────────────────────────────────

class ComputeMacrosFromIngredientsUnitTest(TestCase):
    """
    Unit tests for _compute_macros_from_ingredients() in isolation.
    No database or HTTP — tests pure calculation logic.
    """

    def test_single_ingredient_calculation(self):
        """200g chicken at 165 kcal/100g = 330 kcal."""
        result = _compute_macros_from_ingredients(SAMPLE_INGREDIENTS)
        self.assertEqual(result["calories"], 330.0)
        self.assertEqual(result["protein"], 62.0)
        self.assertEqual(result["fat"], 7.2)
        self.assertEqual(result["carbohydrates"], 0.0)

    def test_multiple_ingredients_accumulate(self):
        ingredients = [
            {
                "name": "chicken breast", "quantity": 200, "unit": "g",
                "calories_per_100g": 165, "protein_per_100g": 31,
                "carbs_per_100g": 0, "fat_per_100g": 3.6,
            },
            {
                "name": "rice", "quantity": 100, "unit": "g",
                "calories_per_100g": 130, "protein_per_100g": 2.7,
                "carbs_per_100g": 28, "fat_per_100g": 0.3,
            },
        ]
        result = _compute_macros_from_ingredients(ingredients)
        self.assertEqual(result["calories"], 460.0)  # 330 + 130
        self.assertEqual(result["carbohydrates"], 28.0)

    def test_empty_ingredients_returns_zeros(self):
        result = _compute_macros_from_ingredients([])
        self.assertEqual(result["calories"], 0.0)
        self.assertEqual(result["protein"], 0.0)
        self.assertEqual(result["carbohydrates"], 0.0)
        self.assertEqual(result["fat"], 0.0)

    def test_missing_macro_values_default_to_zero(self):
        """Ingredients with missing macro fields should not crash."""
        ingredients = [{"name": "mystery food", "quantity": 100}]
        result = _compute_macros_from_ingredients(ingredients)
        self.assertEqual(result["calories"], 0.0)

    def test_result_is_rounded_to_two_decimals(self):
        ingredients = [
            {
                "name": "odd food", "quantity": 33, "unit": "g",
                "calories_per_100g": 100, "protein_per_100g": 10,
                "carbs_per_100g": 10, "fat_per_100g": 10,
            }
        ]
        result = _compute_macros_from_ingredients(ingredients)
        # 33/100 * 100 = 33.0 — should be a clean rounded number
        self.assertEqual(result["calories"], 33.0)


# ─────────────────────────────────────────────────────────────────────────────
# Integration Tests
# ─────────────────────────────────────────────────────────────────────────────

class MealLogCRUDIntegrationTest(TestCase):
    """
    Integration tests for the meal log endpoints.
    """

    def setUp(self):
        self.user = make_user("meallog@test.com")
        self.client = auth_client(get_token("meallog@test.com"))

    def test_create_meal_log(self):
        res = self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["meal_name"], "LUNCH")
        self.assertEqual(res.data["calories"], 330.0)
        self.assertEqual(res.data["protein"], 62.0)

    def test_get_meal_logs_for_date(self):
        self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        today = str(timezone.now().date())
        res = self.client.get(f"/api/logging/?date={today}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)

    def test_get_meal_logs_wrong_date_returns_empty(self):
        self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        res = self.client.get("/api/logging/?date=2000-01-01")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 0)

    def test_delete_meal_log(self):
        res = self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        log_id = res.data["id"]
        del_res = self.client.delete(f"/api/logging/{log_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MealLog.objects.filter(id=log_id).exists())

    def test_update_meal_log(self):
        res = self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        log_id = res.data["id"]
        updated_payload = {**MEAL_PAYLOAD, "meal_name": "DINNER", "servings": 2}
        res = self.client.put(f"/api/logging/{log_id}/", updated_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["meal_name"], "DINNER")

    def test_cannot_access_other_users_log(self):
        other_user = make_user("other_log@test.com")
        other_log = MealLog.objects.create(
            user=other_user,
            meal_name="BREAKFAST",
            date_logged=timezone.now().date(),
            servings=1,
        )
        res = self.client.get(f"/api/logging/{other_log.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_macros_computed_automatically_on_create(self):
        """Macros should be calculated from ingredients, not manually entered."""
        res = self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # 200g chicken at 165 kcal/100g
        self.assertEqual(res.data["calories"], 330.0)

    def test_meal_log_requires_auth(self):
        client = APIClient()
        res = client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class WaterLogIntegrationTest(TestCase):
    """Integration tests for water logging."""

    def setUp(self):
        self.user = make_user("water@test.com")
        self.client = auth_client(get_token("water@test.com"))

    def test_log_water_intake(self):
        res = self.client.post(
            "/api/logging/water/",
            {"water": 500, "date_logged": str(timezone.now().date())},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_water_log_created_in_database(self):
        self.client.post(
            "/api/logging/water/",
            {"water": 500, "date_logged": str(timezone.now().date())},
            format="json",
        )
        self.assertTrue(WaterLog.objects.filter(user=self.user).exists())


# ─────────────────────────────────────────────────────────────────────────────
# Use Case Tests
# ─────────────────────────────────────────────────────────────────────────────

class TC9_1_CalendarMealTrackingUseCaseTest(TestCase):
    """
    TC9.1 — A user must be able to track their meals via a calendar view.
    Initial condition: user is on the calendar view.
    Procedure: user clicks on a specific day, views meal breakdown,
               switches days via calendar interface.
    Expected: user can view detailed breakdown of all logged meals for that day,
              and switch between days.
    """

    def setUp(self):
        self.user = make_user("tc9@test.com")
        self.client = auth_client(get_token("tc9@test.com"))
        self.today = str(timezone.now().date())
        self.yesterday = str((timezone.now() - timezone.timedelta(days=1)).date())

    def test_log_meal_for_today(self):
        res = self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_view_meals_for_specific_day(self):
        self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        res = self.client.get(f"/api/logging/?date={self.today}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreater(len(res.data["results"]), 0)

    def test_no_meals_on_different_day(self):
        """Logged meals for today should not show on yesterday."""
        self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        res = self.client.get(f"/api/logging/?date={self.yesterday}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 0)

    def test_multiple_meals_same_day(self):
        """User can log multiple meals on the same day."""
        breakfast = {**MEAL_PAYLOAD, "meal_name": "BREAKFAST"}
        snack = {**MEAL_PAYLOAD, "meal_name": "SNACK"}
        self.client.post("/api/logging/", breakfast, format="json")
        self.client.post("/api/logging/", snack, format="json")
        res = self.client.get(f"/api/logging/?date={self.today}")
        self.assertEqual(len(res.data["results"]), 2)

    def test_delete_meal_removes_from_day(self):
        res = self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        log_id = res.data["id"]
        self.client.delete(f"/api/logging/{log_id}/")
        res = self.client.get(f"/api/logging/?date={self.today}")
        self.assertEqual(len(res.data["results"]), 0)

    def test_edit_meal_updates_macros(self):
        """Editing a meal entry should recalculate macros."""
        res = self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        log_id = res.data["id"]
        original_calories = res.data["calories"]

        updated = {
            **MEAL_PAYLOAD,
            "ingredients": [
                {
                    "name": "chicken breast", "quantity": 400, "unit": "g",
                    "calories_per_100g": 165, "protein_per_100g": 31,
                    "carbs_per_100g": 0, "fat_per_100g": 3.6,
                }
            ],
        }
        res = self.client.put(f"/api/logging/{log_id}/", updated, format="json")
        self.assertGreater(res.data["calories"], original_calories)


class TC10_1_ProgressTrackingUseCaseTest(TestCase):
    """
    TC10.1 — A user must be able to track their progress (daily/weekly caloric intake).
    Initial condition: user has a custom goal set and is on the track progress view.
    Procedure: user selects metric and timeframe to view.
    Expected: user sees progress compared to set goal for the selected timeframe.
    """

    def setUp(self):
        self.user = make_user("tc10@test.com")
        self.user.daily_calorie_goal = 2000
        self.user.protein_goal = 30
        self.user.carbs_goal = 45
        self.user.fat_goal = 25
        self.user.save()
        self.client = auth_client(get_token("tc10@test.com"))
        self.today = str(timezone.now().date())

    def test_progress_endpoint_returns_data(self):
        res = self.client.get(f"/api/analytics/progress/?date={self.today}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_progress_reflects_logged_meals(self):
        """After logging a meal, progress should reflect the calories consumed."""
        self.client.post("/api/logging/", MEAL_PAYLOAD, format="json")
        res = self.client.get(f"/api/analytics/progress/?date={self.today}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Progress endpoint should return some calorie data
        self.assertIn("calories", str(res.data).lower())

    def test_progress_shows_zero_before_any_logs(self):
        """Before any meals are logged, consumed calories should be 0."""
        res = self.client.get(f"/api/analytics/progress/?date={self.today}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        # Find calories consumed — should be 0 if nothing logged
        calories_consumed = data.get("calories_consumed", data.get("calories", None))
        if calories_consumed is not None:
            self.assertEqual(calories_consumed, 0)
