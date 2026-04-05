from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from requests import RequestException

from .models import Recipe, Ingredient, RecipeIngredient
from .serializers import (
    RecipeCreateSerializer,
    RecipeListSerializer,
    RecipeDetailSerializer,
    RecipeUpdateSerializer,
    PublicRecipeSerializer,
)
from app.usda import fdc_search

NUTRITION_PER_100G = {
    "chicken breast": {"calories": 165, "protein": 31,  "fat": 3.6, "carbs": 0},
    "rice":           {"calories": 130, "protein": 2.7, "fat": 0.3, "carbs": 28},
    "egg":            {"calories": 143, "protein": 13,  "fat": 10,  "carbs": 1.1},
}


def compute_macros(recipe):
    total = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}
    for ri in recipe.recipe_ingredients.all():
        per100 = {
            "calories": float(ri.calories_per_100g or 0),
            "protein":  float(ri.protein_per_100g  or 0),
            "fat":      float(ri.fat_per_100g      or 0),
            "carbs":    float(ri.carbs_per_100g    or 0),
        }
        if not any(per100.values()):
            name  = (ri.ingredient.name or "").strip().lower()
            per100 = NUTRITION_PER_100G.get(name, {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0})
        qty    = float(ri.quantity or 0)
        factor = qty / 100.0
        for k in total:
            total[k] += float(per100.get(k, 0)) * factor
    total      = {k: round(v, 2) for k, v in total.items()}
    servings   = max(int(recipe.servings or 1), 1)
    per_serving = {k: round(v / servings, 2) for k, v in total.items()}
    return {"total": total, "perServing": per_serving}


# ── Existing CRUD views ───────────────────────────────────────────────────────

class RecipeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recipes = (
            Recipe.objects.filter(user=request.user)
            .prefetch_related("recipe_ingredients__ingredient", "source_recipe__user")
            .order_by("-created_at")
        )
        for r in recipes:
            r.macros = compute_macros(r)
        return Response(RecipeListSerializer(recipes, many=True).data)

    def post(self, request):
        ser = RecipeCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        data   = ser.validated_data
        recipe = Recipe.objects.create(
            user=request.user,
            name=data["name"],
            description=data.get("description", ""),
            servings=data["servings"],
            recipe_image=data["recipe_image"]
        )
        for item in data["ingredients"]:
            ing, _ = Ingredient.objects.get_or_create(name=item["name"].strip().lower())
            RecipeIngredient.objects.create(
                recipe=recipe, ingredient=ing,
                quantity=float(item["quantity"]), unit=item.get("unit", "g"),
                calories_per_100g=float(item.get("calories_per_100g", 0)),
                protein_per_100g=float(item.get("protein_per_100g",   0)),
                carbs_per_100g=float(item.get("carbs_per_100g",       0)),
                fat_per_100g=float(item.get("fat_per_100g",           0)),
            )
        recipe = Recipe.objects.filter(id=recipe.id).prefetch_related("recipe_ingredients__ingredient").first()
        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data, status=status.HTTP_201_CREATED)


class RecipeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, recipe_id):
        recipe = (
            Recipe.objects.filter(user=request.user, id=recipe_id)
            .prefetch_related("recipe_ingredients__ingredient", "source_recipe__user")
            .first()
        )
        if not recipe:
            return Response({"detail": "Not found"}, status=404)
        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data)

    def put(self, request, recipe_id):
        recipe = (
            Recipe.objects.filter(user=request.user, id=recipe_id)
            .prefetch_related("recipe_ingredients__ingredient")
            .first()
        )
        if not recipe:
            return Response({"detail": "Not found"}, status=404)
        serializer = RecipeUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        recipe.name        = data["name"]
        recipe.description = data.get("description", "")
        recipe.save(update_fields=["name", "description"])
        recipe.recipe_ingredients.all().delete()
        for item in data["ingredients"]:
            ing, _ = Ingredient.objects.get_or_create(name=item["name"].strip().lower())
            RecipeIngredient.objects.create(
                recipe=recipe, ingredient=ing,
                quantity=float(item["quantity"]), unit=item.get("unit", "g"),
                calories_per_100g=float(item.get("calories_per_100g", 0)),
                protein_per_100g=float(item.get("protein_per_100g",   0)),
                carbs_per_100g=float(item.get("carbs_per_100g",       0)),
                fat_per_100g=float(item.get("fat_per_100g",           0)),
            )
        recipe = Recipe.objects.filter(user=request.user, id=recipe_id).prefetch_related("recipe_ingredients__ingredient").first()
        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data)

    def delete(self, request, recipe_id):
        recipe = Recipe.objects.filter(user=request.user, id=recipe_id).first()
        if not recipe:
            return Response({"detail": "Not found"}, status=404)
        recipe.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Visibility cycle: private → friends_only → public → private ──────────────

class RecipeToggleVisibilityView(APIView):
    """
    PATCH /recipe/<id>/visibility/
    Cycles: private -> friends_only -> public -> private
    """
    permission_classes = [IsAuthenticated]

    _CYCLE = ['private', 'friends_only', 'public']

    def patch(self, request, recipe_id):
        recipe = Recipe.objects.filter(user=request.user, id=recipe_id).first()
        if not recipe:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        current = recipe.visibility
        idx     = self._CYCLE.index(current) if current in self._CYCLE else 0
        recipe.visibility = self._CYCLE[(idx + 1) % len(self._CYCLE)]
        recipe.save(update_fields=["visibility"])
        recipe = (
            Recipe.objects.filter(id=recipe.id)
            .prefetch_related("recipe_ingredients__ingredient", "source_recipe__user")
            .first()
        )
        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data)


# ── Community browse — public recipes from other users ───────────────────────

class PublicRecipeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recipes = (
            Recipe.objects.filter(visibility='public')
            .exclude(user=request.user)
            .prefetch_related("recipe_ingredients__ingredient")
            .select_related("user")
            .order_by("-created_at")
        )
        for r in recipes:
            r.macros = compute_macros(r)
        return Response(PublicRecipeSerializer(recipes, many=True).data)


# ── Save a public recipe into your own library ────────────────────────────────

class SavePublicRecipeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, recipe_id):
        original = (
            Recipe.objects.filter(id=recipe_id, visibility='public')
            .prefetch_related("recipe_ingredients__ingredient")
            .select_related("user")
            .first()
        )
        if not original:
            return Response({"detail": "Recipe not found or is not public."}, status=status.HTTP_404_NOT_FOUND)
        if original.user == request.user:
            return Response({"detail": "You cannot save your own recipe."}, status=status.HTTP_400_BAD_REQUEST)
        if Recipe.objects.filter(user=request.user, source_recipe=original).exists():
            return Response({"detail": "You have already saved this recipe."}, status=status.HTTP_400_BAD_REQUEST)

        copy = Recipe.objects.create(
            user=request.user,
            name=original.name,
            description=original.description,
            servings=original.servings,
            visibility='private',
            source_recipe=original,
        )
        for ri in original.recipe_ingredients.all():
            RecipeIngredient.objects.create(
                recipe=copy, ingredient=ri.ingredient,
                quantity=ri.quantity, unit=ri.unit,
                calories_per_100g=ri.calories_per_100g,
                protein_per_100g=ri.protein_per_100g,
                carbs_per_100g=ri.carbs_per_100g,
                fat_per_100g=ri.fat_per_100g,
            )
        copy = Recipe.objects.filter(id=copy.id).prefetch_related("recipe_ingredients__ingredient", "source_recipe__user").first()
        copy.macros = compute_macros(copy)
        return Response(RecipeDetailSerializer(copy).data, status=status.HTTP_201_CREATED)


# ── USDA food search (unchanged) ──────────────────────────────────────────────

def _extract_macro(food, nutrient_number, nutrient_name):
    for nutrient in food.get("foodNutrients", []):
        number = str(nutrient.get("nutrientNumber", "")).strip()
        name   = str(nutrient.get("nutrientName",   "")).strip().lower()
        if number == nutrient_number or name == nutrient_name.lower():
            value = nutrient.get("value")
            if value is None:
                return 0.0
            try:
                return round(float(value), 2)
            except (TypeError, ValueError):
                return 0.0
    return 0.0


class FoodSearchView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "Missing query param: q"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = fdc_search(query=query, page_size=15, page_number=1)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=500)
        except RequestException as exc:
            return Response({"detail": f"USDA request failed: {exc}"}, status=502)
        except Exception as exc:
            return Response({"detail": f"Unexpected error: {exc}"}, status=500)

        results = []
        for food in data.get("foods", []):
            results.append({
                "fdcId":       food.get("fdcId"),
                "description": food.get("description"),
                "brandOwner":  food.get("brandOwner"),
                "dataType":    food.get("dataType"),
                "macros": {
                    "calories": _extract_macro(food, "208", "Energy"),
                    "protein":  _extract_macro(food, "203", "Protein"),
                    "carbs":    _extract_macro(food, "205", "Carbohydrate, by difference"),
                    "fat":      _extract_macro(food, "204", "Total lipid (fat)"),
                },
            })
        return Response({"results": results})
