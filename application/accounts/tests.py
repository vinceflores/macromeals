"""
accounts/tests.py

Covers:
  Unit Tests        — calculate_goals(), is_friends_with()
  Integration Tests — onboarding endpoint, friends send/accept/view flow
  Use Case Tests    — TC11.2.1 (login), TC3.1 (set dietary goals / onboarding quiz)
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomUser, FriendRequest
from accounts.serializers import calculate_goals


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_user(email, password="Test1234!", first_name="Test", last_name="User"):
    return CustomUser.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )


def get_tokens(client, email, password="Test1234!"):
    """Log in and return access token."""
    res = client.post(
        "/api/auth/token/",
        {"email": email, "password": password},
        format="json",
    )
    return res.data.get("access")


def auth_client(token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


# ─────────────────────────────────────────────────────────────────────────────
# Unit Tests
# ─────────────────────────────────────────────────────────────────────────────

class CalculateGoalsUnitTest(TestCase):
    """
    Unit test for the Mifflin-St Jeor calorie calculation.
    Tests calculate_goals() in isolation — no database, no HTTP.
    """

    def test_male_lose_weight(self):
        """
        Male, 25 years old, 75kg, 175cm, 3 days/week, lose weight.
        BMR = (10*75) + (6.25*175) - (5*25) + 5 = 1723.75
        TDEE = 1723.75 * 1.55 = 2671.81
        Goal = 2671.81 - 500 = 2171.81 → rounded to 2172
        """
        result = calculate_goals(
            weight_kg=75,
            height_cm=175,
            age=25,
            biological_sex="male",
            exercise_days_per_week=3,
            fitness_goal="lose_weight",
        )
        self.assertEqual(result["daily_calorie_goal"], 2172)
        self.assertEqual(result["protein_goal"], 30)
        self.assertEqual(result["carbs_goal"], 40)
        self.assertEqual(result["fat_goal"], 30)
        self.assertEqual(result["protein_goal"] + result["carbs_goal"] + result["fat_goal"], 100)

    def test_female_maintain(self):
        """
        Female, 30 years old, 60kg, 165cm, 1 day/week, maintain.
        BMR = (10*60) + (6.25*165) - (5*30) - 161 = 1370.25
        TDEE = 1370.25 * 1.375 = 1884.0
        Goal = 1884 (no adjustment)
        """
        result = calculate_goals(
            weight_kg=60,
            height_cm=165,
            age=30,
            biological_sex="female",
            exercise_days_per_week=1,
            fitness_goal="maintain",
        )
        self.assertGreater(result["daily_calorie_goal"], 1500)
        self.assertEqual(result["protein_goal"] + result["carbs_goal"] + result["fat_goal"], 100)

    def test_gain_muscle_surplus(self):
        """Gain muscle goal should add 300 calories to TDEE."""
        result_maintain = calculate_goals(
            weight_kg=80, height_cm=180, age=22,
            biological_sex="male", exercise_days_per_week=4,
            fitness_goal="maintain",
        )
        result_gain = calculate_goals(
            weight_kg=80, height_cm=180, age=22,
            biological_sex="male", exercise_days_per_week=4,
            fitness_goal="gain_muscle",
        )
        self.assertEqual(result_gain["daily_calorie_goal"] - result_maintain["daily_calorie_goal"], 300)

    def test_calorie_floor_at_1200(self):
        """Should never return less than 1200 calories regardless of inputs."""
        result = calculate_goals(
            weight_kg=20, height_cm=50, age=120,
            biological_sex="female", exercise_days_per_week=0,
            fitness_goal="lose_weight",
        )
        self.assertGreaterEqual(result["daily_calorie_goal"], 1200)

    def test_water_goal_scales_with_weight(self):
        """Heavier users should get a higher water goal."""
        light = calculate_goals(
            weight_kg=50, height_cm=160, age=25,
            biological_sex="female", exercise_days_per_week=3,
            fitness_goal="maintain",
        )
        heavy = calculate_goals(
            weight_kg=100, height_cm=180, age=25,
            biological_sex="male", exercise_days_per_week=3,
            fitness_goal="maintain",
        )
        self.assertGreater(heavy["water_goal"], light["water_goal"])


class FriendshipUnitTest(TestCase):
    """
    Unit tests for is_friends_with() and get_friends() on CustomUser.
    No HTTP requests — tests the model methods directly.
    """

    def setUp(self):
        self.user_a = make_user("a@test.com")
        self.user_b = make_user("b@test.com")

    def test_not_friends_initially(self):
        self.assertFalse(self.user_a.is_friends_with(self.user_b))

    def test_not_friends_while_pending(self):
        FriendRequest.objects.create(sender=self.user_a, receiver=self.user_b)
        self.assertFalse(self.user_a.is_friends_with(self.user_b))

    def test_friends_after_acceptance(self):
        fr = FriendRequest.objects.create(sender=self.user_a, receiver=self.user_b)
        fr.status = "accepted"
        fr.save()
        self.assertTrue(self.user_a.is_friends_with(self.user_b))
        self.assertTrue(self.user_b.is_friends_with(self.user_a))

    def test_not_friends_after_rejection(self):
        fr = FriendRequest.objects.create(sender=self.user_a, receiver=self.user_b)
        fr.status = "rejected"
        fr.save()
        self.assertFalse(self.user_a.is_friends_with(self.user_b))

    def test_get_friends_returns_correct_users(self):
        user_c = make_user("c@test.com")
        fr1 = FriendRequest.objects.create(sender=self.user_a, receiver=self.user_b)
        fr1.status = "accepted"
        fr1.save()
        # user_c is NOT friends with user_a
        friends = list(self.user_a.get_friends())
        self.assertIn(self.user_b, friends)
        self.assertNotIn(user_c, friends)


# ─────────────────────────────────────────────────────────────────────────────
# Integration Tests
# ─────────────────────────────────────────────────────────────────────────────

class OnboardingIntegrationTest(TestCase):
    """
    Integration test for POST /api/accounts/onboarding/
    Tests the full HTTP request through Django, hitting the real database.
    Corresponds to TC3.1 in the design doc.
    """

    def setUp(self):
        self.user = make_user("quiz@test.com")
        token = get_tokens(APIClient(), "quiz@test.com")
        self.client = auth_client(token)

    def test_onboarding_sets_goals_and_marks_complete(self):
        payload = {
            "height_cm": 175,
            "weight_kg": 75,
            "age": 25,
            "biological_sex": "male",
            "exercise_days_per_week": 3,
            "fitness_goal": "lose_weight",
        }
        res = self.client.post("/api/accounts/onboarding/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("calculated_goals", res.data)
        self.assertIn("profile", res.data)
        self.assertTrue(res.data["profile"]["onboarding_complete"])
        self.assertIsNotNone(res.data["profile"]["daily_calorie_goal"])

    def test_onboarding_macros_sum_to_100(self):
        payload = {
            "height_cm": 165,
            "weight_kg": 60,
            "age": 28,
            "biological_sex": "female",
            "exercise_days_per_week": 2,
            "fitness_goal": "general",
        }
        res = self.client.post("/api/accounts/onboarding/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        profile = res.data["profile"]
        macro_total = profile["protein_goal"] + profile["carbs_goal"] + profile["fat_goal"]
        self.assertEqual(macro_total, 100)

    def test_onboarding_rejects_invalid_age(self):
        payload = {
            "height_cm": 175,
            "weight_kg": 75,
            "age": 5,  # below minimum of 13
            "biological_sex": "male",
            "exercise_days_per_week": 3,
            "fitness_goal": "maintain",
        }
        res = self.client.post("/api/accounts/onboarding/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_onboarding_requires_authentication(self):
        client = APIClient()  # no token
        payload = {
            "height_cm": 175, "weight_kg": 75, "age": 25,
            "biological_sex": "male", "exercise_days_per_week": 3,
            "fitness_goal": "maintain",
        }
        res = client.post("/api/accounts/onboarding/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class FriendsIntegrationTest(TestCase):
    """
    Integration tests for the full friends flow:
    send request → accept → list friends → view recipes.
    """

    def setUp(self):
        self.user_a = make_user("friend_a@test.com", first_name="Alice")
        self.user_b = make_user("friend_b@test.com", first_name="Bob")

        token_a = get_tokens(APIClient(), "friend_a@test.com")
        token_b = get_tokens(APIClient(), "friend_b@test.com")

        self.client_a = auth_client(token_a)
        self.client_b = auth_client(token_b)

    def test_send_friend_request(self):
        res = self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "pending")

    def test_accept_friend_request(self):
        # A sends request
        res = self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        request_id = res.data["id"]

        # B accepts
        res = self.client_b.patch(
            f"/api/accounts/friends/request/{request_id}/",
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "accepted")

    def test_friends_appear_in_list_after_acceptance(self):
        # Send and accept
        res = self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        request_id = res.data["id"]
        self.client_b.patch(
            f"/api/accounts/friends/request/{request_id}/",
            {"action": "accept"},
            format="json",
        )

        # A should see B in friends list
        res = self.client_a.get("/api/accounts/friends/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        emails = [f["email"] for f in res.data]
        self.assertIn("friend_b@test.com", emails)

    def test_cannot_view_recipes_without_friendship(self):
        res = self.client_a.get(f"/api/accounts/friends/{self.user_b.id}/recipes/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_requests_appear_for_receiver(self):
        self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        res = self.client_b.get("/api/accounts/friends/requests/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["sender"]["email"], "friend_a@test.com")

    def test_duplicate_friend_request_rejected(self):
        self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        res = self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_friend(self):
        # Send, accept, then remove
        res = self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        request_id = res.data["id"]
        self.client_b.patch(
            f"/api/accounts/friends/request/{request_id}/",
            {"action": "accept"},
            format="json",
        )
        res = self.client_a.delete(f"/api/accounts/friends/{request_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(self.user_a.is_friends_with(self.user_b))


# ─────────────────────────────────────────────────────────────────────────────
# Use Case Tests
# ─────────────────────────────────────────────────────────────────────────────

class TC11_2_1_LoginUseCaseTest(TestCase):
    """
    TC11.2.1 — A user must be able to log in using their created account.
    Initial condition: an account exists.
    Procedure: user enters credentials and clicks login.
    Expected: JWT token is issued and user is authenticated.
    """

    def setUp(self):
        make_user("login_test@test.com", password="SecurePass123!")

    def test_valid_login_returns_tokens(self):
        client = APIClient()
        res = client.post(
            "/api/auth/token/",
            {"email": "login_test@test.com", "password": "SecurePass123!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_invalid_password_rejected(self):
        client = APIClient()
        res = client.post(
            "/api/auth/token/",
            {"email": "login_test@test.com", "password": "wrongpassword"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_user_rejected(self):
        client = APIClient()
        res = client.post(
            "/api/auth/token/",
            {"email": "nobody@test.com", "password": "Test1234!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class TC3_1_OnboardingQuizUseCaseTest(TestCase):
    """
    TC3.1 — A user must be able to set daily dietary goals via the onboarding quiz.
    Initial condition: user has an account and is authenticated.
    Procedure: user completes the quiz form and submits.
    Expected: dietary goal is saved with a unique id, onboarding_complete = True.
    """

    def setUp(self):
        self.user = make_user("onboard_uc@test.com")
        token = get_tokens(APIClient(), "onboard_uc@test.com")
        self.client = auth_client(token)

    def test_full_onboarding_flow(self):
        # Step 1: Confirm onboarding not complete before quiz
        profile_res = self.client.get("/api/accounts/profile/")
        self.assertFalse(profile_res.data["onboarding_complete"])

        # Step 2: Submit quiz
        quiz_res = self.client.post(
            "/api/accounts/onboarding/",
            {
                "height_cm": 170,
                "weight_kg": 68,
                "age": 22,
                "biological_sex": "female",
                "exercise_days_per_week": 4,
                "fitness_goal": "gain_muscle",
            },
            format="json",
        )
        self.assertEqual(quiz_res.status_code, status.HTTP_200_OK)

        # Step 3: Confirm profile updated
        profile_res = self.client.get("/api/accounts/profile/")
        self.assertTrue(profile_res.data["onboarding_complete"])
        self.assertIsNotNone(profile_res.data["daily_calorie_goal"])
        self.assertEqual(profile_res.data["height_cm"], 170)
        self.assertEqual(profile_res.data["weight_kg"], 68)
        self.assertEqual(profile_res.data["age"], 22)

        # Step 4: Confirm macros sum to 100
        total = (
            profile_res.data["protein_goal"]
            + profile_res.data["carbs_goal"]
            + profile_res.data["fat_goal"]
        )
        self.assertEqual(total, 100)

    def test_quiz_can_be_redone(self):
        """User can redo the quiz and goals update accordingly."""
        self.client.post(
            "/api/accounts/onboarding/",
            {
                "height_cm": 170, "weight_kg": 68, "age": 22,
                "biological_sex": "female", "exercise_days_per_week": 4,
                "fitness_goal": "gain_muscle",
            },
            format="json",
        )
        first_calories = self.client.get("/api/accounts/profile/").data["daily_calorie_goal"]

        self.client.post(
            "/api/accounts/onboarding/",
            {
                "height_cm": 170, "weight_kg": 68, "age": 22,
                "biological_sex": "female", "exercise_days_per_week": 0,
                "fitness_goal": "lose_weight",
            },
            format="json",
        )
        second_calories = self.client.get("/api/accounts/profile/").data["daily_calorie_goal"]

        # Sedentary + deficit should produce fewer calories than active + surplus
        self.assertLess(second_calories, first_calories)


class FriendsUseCaseTest(TestCase):
    """
    Use case test for the full friends workflow end to end.
    User A finds User B, sends a request, User B accepts,
    both appear in each other's friends list.
    """

    def setUp(self):
        self.user_a = make_user("uc_a@test.com", first_name="Alice")
        self.user_b = make_user("uc_b@test.com", first_name="Bob")
        token_a = get_tokens(APIClient(), "uc_a@test.com")
        token_b = get_tokens(APIClient(), "uc_b@test.com")
        self.client_a = auth_client(token_a)
        self.client_b = auth_client(token_b)

    def test_full_friend_request_flow(self):
        # Step 1: A searches for B
        res = self.client_a.get(
            "/api/accounts/users/search/?q=Bob"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data
        bob = next((u for u in results if u["email"] == "uc_b@test.com"), None)
        self.assertIsNotNone(bob)
        self.assertEqual(bob["friend_status"], "none")

        # Step 2: A sends friend request to B
        res = self.client_a.post(
            "/api/accounts/friends/request/",
            {"receiver_id": self.user_b.id},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        request_id = res.data["id"]

        # Step 3: B sees the request in pending list
        res = self.client_b.get("/api/accounts/friends/requests/")
        self.assertEqual(len(res.data), 1)

        # Step 4: B accepts the request
        res = self.client_b.patch(
            f"/api/accounts/friends/request/{request_id}/",
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(res.data["status"], "accepted")

        # Step 5: Both users see each other in friends list
        res_a = self.client_a.get("/api/accounts/friends/")
        res_b = self.client_b.get("/api/accounts/friends/")
        emails_a = [f["email"] for f in res_a.data]
        emails_b = [f["email"] for f in res_b.data]
        self.assertIn("uc_b@test.com", emails_a)
        self.assertIn("uc_a@test.com", emails_b)

        # Step 6: Pending requests list is now empty for B
        res = self.client_b.get("/api/accounts/friends/requests/")
        self.assertEqual(len(res.data), 0)
