from django.test import TestCase

# Create your tests here.

# def GoalsCalculated():
#     pass

# def MacrosReturned():
#     pass
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import MagicMock, patch

from analytics.views import CurrentDayProgressView


class CurrentDayProgressViewUnitTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        User = get_user_model()

        self.user = User(
            email="u@example.com",
            first_name="U",
            last_name="Ser",
            daily_calorie_goal=2000,
            protein_goal=30,
            carbs_goal=45,
            fat_goal=25,
            water_goal=2500,
        )

    def test_progress_empty_day(self):
        d = timezone.now().date().isoformat()
        request = self.factory.get("/api/analytics/progress/", {"date": d})
        force_authenticate(request, user=self.user)

        fake_qs = MagicMock()
        fake_qs.values_list.return_value = []

        with patch("analytics.views.MealLog.objects.filter", return_value=fake_qs), \
             patch("analytics.views.WaterLogService.getCurrentDay", return_value=0):
            response = CurrentDayProgressView.as_view()(request)
            response.render()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["current"]["calories"], 0)
        self.assertEqual(response.data["current"]["water"], 0)

    def test_progress_sums_meals_and_water(self):
        d = timezone.now().date().isoformat()
        request = self.factory.get("/api/analytics/progress/", {"date": d})
        force_authenticate(request, user=self.user)

        fake_qs = MagicMock()
        # Order matches values_list('calories','carbohydrates','fat','protein')
        fake_qs.values_list.return_value = [(100, 10, 2, 5), (200, 20, 4, 10)]

        with patch("analytics.views.MealLog.objects.filter", return_value=fake_qs), \
             patch("analytics.views.WaterLogService.getCurrentDay", return_value=750):
            response = CurrentDayProgressView.as_view()(request)
            response.render()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["current"]["calories"], 300)
        self.assertEqual(response.data["current"]["carbohydrates"], 30)
        self.assertEqual(response.data["current"]["fat"], 6)
        self.assertEqual(response.data["current"]["protein"], 15)
        self.assertEqual(response.data["current"]["water"], 750)
        self.assertEqual(response.data["goal"]["calories"], 2000)

    def test_convertGoalFromPercentToDecimal(self):
        d = timezone.now().date().isoformat()
        request = self.factory.get("/api/analytics/progress/", {"date": d})
        force_authenticate(request, user=self.user) 
        fake_qs = MagicMock()
        # Order matches values_list('calories','carbohydrates','fat','protein')
        fake_qs.values_list.return_value = [(100, 10, 2, 5), (200, 20, 4, 10)]
        with patch("analytics.views.MealLog.objects.filter", return_value=fake_qs), \
             patch("analytics.views.WaterLogService.getCurrentDay", return_value=750):
            response = CurrentDayProgressView.as_view()(request)
            response.render() 

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["goal"]["fat"], 62.5 ) # in grams (g)
        self.assertEqual(response.data["goal"]["protein"], 150)
        self.assertEqual(response.data["goal"]["carbohydrates"], 225)
        