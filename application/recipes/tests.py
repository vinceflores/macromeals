"""
recipes/tests.py

Covers:
  Unit Tests        — compute_macros()
  Integration Tests — recipe CRUD, visibility toggle, community browse, save public recipe
  Use Case Tests    — TC1.1 (view macros), TC2.1 (modify recipe), TC5.1 (browse/search recipes)
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomUser, FriendRequest
from recipes.models import Recipe, Ingredient, RecipeIngredient
from recipes.views import compute_macros


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_user(email, password="Test1234!", first_name="Test", last_name="User"):
    return CustomUser.objects.create_user(
        email=email, password=password,
        first_name=first_name, last_name=last_name,
    )


def get_token(email, password="Test1234!"):
    client = APIClient()
    res = client.post("/api/auth/token/", {"email": email, "password": password}, format="json")
    return res.data.get("access")


def auth_client(token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def make_recipe(user, name="Test Recipe", visibility="private"):
    recipe = Recipe.objects.create(
        user=user, name=name, servings=2, visibility=visibility
    )
    ing, _ = Ingredient.objects.get_or_create(name="chicken breast")
    RecipeIngredient.objects.create(
        recipe=recipe, ingredient=ing,
        quantity=200, unit="g",
        calories_per_100g=165,
        protein_per_100g=31,
        carbs_per_100g=0,
        fat_per_100g=3.6,
    )
    return recipe


# ─────────────────────────────────────────────────────────────────────────────
# Unit Tests
# ─────────────────────────────────────────────────────────────────────────────

class ComputeMacrosUnitTest(TestCase):
    """
    Unit tests for compute_macros() in isolation.
    Creates model objects directly without HTTP.
    """

    def setUp(self):
        self.user = make_user("macro_unit@test.com")
        self.recipe = make_recipe(self.user)

    def test_total_calories_correct(self):
        """200g chicken breast at 165 kcal/100g = 330 kcal total."""
        result = compute_macros(self.recipe)
        self.assertEqual(result["total"]["calories"], 330.0)

    def test_total_protein_correct(self):
        """200g chicken breast at 31g protein/100g = 62g protein total."""
        result = compute_macros(self.recipe)
        self.assertEqual(result["total"]["protein"], 62.0)

    def test_per_serving_divides_by_servings(self):
        """Per serving = total / 2 servings."""
        result = compute_macros(self.recipe)
        self.assertEqual(result["perServing"]["calories"], 165.0)
        self.assertEqual(result["perServing"]["protein"], 31.0)

    def test_empty_recipe_returns_zeros(self):
        """Recipe with no ingredients returns all zeros."""
        empty_recipe = Recipe.objects.create(user=self.user, name="Empty", servings=1)
        result = compute_macros(empty_recipe)
        self.assertEqual(result["total"]["calories"], 0.0)
        self.assertEqual(result["total"]["protein"], 0.0)

    def test_multiple_ingredients_sum_correctly(self):
        """Adding a second ingredient accumulates totals correctly."""
        ing2, _ = Ingredient.objects.get_or_create(name="rice")
        RecipeIngredient.objects.create(
            recipe=self.recipe, ingredient=ing2,
            quantity=100, unit="g",
            calories_per_100g=130,
            protein_per_100g=2.7,
            carbs_per_100g=28,
            fat_per_100g=0.3,
        )
        result = compute_macros(self.recipe)
        # chicken: 330 kcal + rice: 130 kcal = 460 kcal
        self.assertEqual(result["total"]["calories"], 460.0)


# ─────────────────────────────────────────────────────────────────────────────
# Integration Tests
# ─────────────────────────────────────────────────────────────────────────────

class RecipeCRUDIntegrationTest(TestCase):
    """
    Integration tests for recipe create, read, update, delete via HTTP.
    """

    def setUp(self):
        self.user = make_user("recipe_crud@test.com")
        self.client = auth_client(get_token("recipe_crud@test.com"))

    def _create_payload(self, name="My Recipe"):
        return {
            "name": name,
            "description": "Test description",
            "servings": 2,
            "ingredients": [
                {
                    "name": "chicken breast",
                    "quantity": 200,
                    "unit": "g",
                    "calories_per_100g": 165,
                    "protein_per_100g": 31,
                    "carbs_per_100g": 0,
                    "fat_per_100g": 3.6,
                }
            ],
        }

    def test_create_recipe(self):
        res = self.client.post("/recipe/", self._create_payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "My Recipe")
        self.assertIn("macros", res.data)

    def test_get_recipe_list(self):
        self.client.post("/recipe/", self._create_payload(), format="json")
        res = self.client.get("/recipe/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_get_recipe_detail(self):
        create_res = self.client.post("/recipe/", self._create_payload(), format="json")
        recipe_id = create_res.data["id"]
        res = self.client.get(f"/recipe/{recipe_id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "My Recipe")

    def test_delete_recipe(self):
        create_res = self.client.post("/recipe/", self._create_payload(), format="json")
        recipe_id = create_res.data["id"]
        res = self.client.delete(f"/recipe/{recipe_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Recipe.objects.filter(id=recipe_id).exists())

    def test_cannot_access_other_users_recipe(self):
        other_user = make_user("other@test.com")
        other_recipe = make_recipe(other_user)
        res = self.client.get(f"/recipe/{other_recipe.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class VisibilityToggleIntegrationTest(TestCase):
    """
    Integration tests for the 3-way visibility cycle:
    private → friends_only → public → private
    """

    def setUp(self):
        self.user = make_user("vis@test.com")
        self.client = auth_client(get_token("vis@test.com"))
        self.recipe = make_recipe(self.user)

    def test_toggle_private_to_friends_only(self):
        res = self.client.patch(f"/recipe/{self.recipe.id}/visibility/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["visibility"], "friends_only")

    def test_toggle_friends_only_to_public(self):
        self.client.patch(f"/recipe/{self.recipe.id}/visibility/")
        res = self.client.patch(f"/recipe/{self.recipe.id}/visibility/")
        self.assertEqual(res.data["visibility"], "public")

    def test_toggle_public_back_to_private(self):
        self.client.patch(f"/recipe/{self.recipe.id}/visibility/")
        self.client.patch(f"/recipe/{self.recipe.id}/visibility/")
        res = self.client.patch(f"/recipe/{self.recipe.id}/visibility/")
        self.assertEqual(res.data["visibility"], "private")

    def test_cannot_toggle_other_users_recipe(self):
        other_user = make_user("other_vis@test.com")
        other_recipe = make_recipe(other_user)
        res = self.client.patch(f"/recipe/{other_recipe.id}/visibility/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class CommunityBrowseIntegrationTest(TestCase):
    """
    Integration tests for the community browse endpoint.
    Only public recipes from other users should appear.
    """

    def setUp(self):
        self.user_a = make_user("browse_a@test.com")
        self.user_b = make_user("browse_b@test.com")
        self.client_a = auth_client(get_token("browse_a@test.com"))

    def test_public_recipes_from_others_appear(self):
        make_recipe(self.user_b, name="Bob's Public Recipe", visibility="public")
        res = self.client_a.get("/recipe/community/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [r["name"] for r in res.data]
        self.assertIn("Bob's Public Recipe", names)

    def test_own_recipes_excluded_from_community(self):
        make_recipe(self.user_a, name="My Public Recipe", visibility="public")
        res = self.client_a.get("/recipe/community/")
        names = [r["name"] for r in res.data]
        self.assertNotIn("My Public Recipe", names)

    def test_private_recipes_excluded_from_community(self):
        make_recipe(self.user_b, name="Bob's Private Recipe", visibility="private")
        res = self.client_a.get("/recipe/community/")
        names = [r["name"] for r in res.data]
        self.assertNotIn("Bob's Private Recipe", names)

    def test_friends_only_excluded_from_community(self):
        make_recipe(self.user_b, name="Bob's Friends Recipe", visibility="friends_only")
        res = self.client_a.get("/recipe/community/")
        names = [r["name"] for r in res.data]
        self.assertNotIn("Bob's Friends Recipe", names)

    def test_save_public_recipe_copies_to_library(self):
        public_recipe = make_recipe(self.user_b, name="Saveable Recipe", visibility="public")
        res = self.client_a.post(f"/recipe/{public_recipe.id}/save/")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Recipe.objects.filter(user=self.user_a, source_recipe=public_recipe).exists())

    def test_cannot_save_own_recipe(self):
        own_recipe = make_recipe(self.user_a, name="My Own", visibility="public")
        res = self.client_a.post(f"/recipe/{own_recipe.id}/save/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_save_same_recipe_twice(self):
        public_recipe = make_recipe(self.user_b, name="Duplicate Test", visibility="public")
        self.client_a.post(f"/recipe/{public_recipe.id}/save/")
        res = self.client_a.post(f"/recipe/{public_recipe.id}/save/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# Use Case Tests
# ─────────────────────────────────────────────────────────────────────────────

class TC1_1_ViewMacrosUseCaseTest(TestCase):
    """
    TC1.1 — A user must be able to view macros from previously saved recipes.
    Initial condition: at least one saved recipe exists.
    Procedure: request recipe list, then request recipe details.
    Expected: macros like grams of protein, fat, etc are displayed per recipe.
    """

    def setUp(self):
        self.user = make_user("tc1@test.com")
        self.client = auth_client(get_token("tc1@test.com"))
        self.recipe = make_recipe(self.user, name="Chicken Meal")

    def test_recipe_list_includes_macros(self):
        res = self.client.get("/recipe/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        macros = res.data[0]["macros"]
        self.assertIn("total", macros)
        self.assertGreater(macros["total"]["calories"], 0)
        self.assertGreater(macros["total"]["protein"], 0)

    def test_recipe_detail_includes_per_serving_macros(self):
        res = self.client.get(f"/recipe/{self.recipe.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("macros", res.data)
        self.assertIn("perServing", res.data["macros"])
        self.assertIn("total", res.data["macros"])

    def test_empty_recipe_list_returns_empty(self):
        """No saved recipes shows empty list, not an error."""
        Recipe.objects.filter(user=self.user).delete()
        res = self.client.get("/recipe/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)


class TC2_1_ModifyRecipeUseCaseTest(TestCase):
    """
    TC2.1 — A user should be able to modify existing recipes and save as new ones.
    Initial condition: recipe exists and is saved.
    Procedure: user selects recipe, modifies it, submits.
    Expected: new recipe saved with unique id, original recipe still exists.
    """

    def setUp(self):
        self.user = make_user("tc2@test.com")
        self.client = auth_client(get_token("tc2@test.com"))

        # Create original recipe via API
        res = self.client.post(
            "/recipe/",
            {
                "name": "Original Recipe",
                "description": "Original",
                "servings": 2,
                "ingredients": [
                    {
                        "name": "chicken breast", "quantity": 200, "unit": "g",
                        "calories_per_100g": 165, "protein_per_100g": 31,
                        "carbs_per_100g": 0, "fat_per_100g": 3.6,
                    }
                ],
            },
            format="json",
        )
        self.original_id = res.data["id"]

    def test_edit_recipe_updates_name(self):
        res = self.client.put(
            f"/recipe/{self.original_id}/",
            {
                "name": "Modified Recipe",
                "description": "Changed",
                "ingredients": [
                    {
                        "name": "chicken breast", "quantity": 150, "unit": "g",
                        "calories_per_100g": 165, "protein_per_100g": 31,
                        "carbs_per_100g": 0, "fat_per_100g": 3.6,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Modified Recipe")

    def test_create_new_recipe_has_unique_id(self):
        """Creating a new recipe gives a different ID from the original."""
        res = self.client.post(
            "/recipe/",
            {
                "name": "New Version",
                "description": "Copy",
                "servings": 1,
                "ingredients": [
                    {
                        "name": "rice", "quantity": 100, "unit": "g",
                        "calories_per_100g": 130, "protein_per_100g": 2.7,
                        "carbs_per_100g": 28, "fat_per_100g": 0.3,
                    }
                ],
            },
            format="json",
        )
        new_id = res.data["id"]
        self.assertNotEqual(new_id, self.original_id)

    def test_original_recipe_still_exists_after_edit(self):
        self.client.put(
            f"/recipe/{self.original_id}/",
            {
                "name": "Modified Recipe",
                "description": "Changed",
                "ingredients": [
                    {
                        "name": "chicken breast", "quantity": 150, "unit": "g",
                        "calories_per_100g": 165, "protein_per_100g": 31,
                        "carbs_per_100g": 0, "fat_per_100g": 3.6,
                    }
                ],
            },
            format="json",
        )
        self.assertTrue(Recipe.objects.filter(id=self.original_id).exists())


class TC5_1_BrowseRecipesUseCaseTest(TestCase):
    """
    TC5.1 — A user must be able to browse recipes by category or text.
    Initial condition: user is on saved recipes page with at least two saved recipes.
    Procedure: user inputs keywords matching one recipe in the search bar.
    Expected: isolated saved recipes matching the keyword are displayed.
    """

    def setUp(self):
        self.user = make_user("tc5@test.com")
        self.client = auth_client(get_token("tc5@test.com"))

        # Create two recipes
        self.client.post(
            "/recipe/",
            {
                "name": "Chicken Salad",
                "servings": 1,
                "ingredients": [
                    {
                        "name": "chicken breast", "quantity": 150, "unit": "g",
                        "calories_per_100g": 165, "protein_per_100g": 31,
                        "carbs_per_100g": 0, "fat_per_100g": 3.6,
                    }
                ],
            },
            format="json",
        )
        self.client.post(
            "/recipe/",
            {
                "name": "Rice Bowl",
                "servings": 1,
                "ingredients": [
                    {
                        "name": "rice", "quantity": 200, "unit": "g",
                        "calories_per_100g": 130, "protein_per_100g": 2.7,
                        "carbs_per_100g": 28, "fat_per_100g": 0.3,
                    }
                ],
            },
            format="json",
        )

    def test_all_saved_recipes_returned(self):
        """User can see all their saved recipes."""
        res = self.client.get("/recipe/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    def test_community_browse_requires_auth(self):
        """Unauthenticated user cannot browse community recipes."""
        client = APIClient()
        res = client.get("/recipe/community/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
