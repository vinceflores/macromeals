from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated  # ✅ require login for recipes
from requests import RequestException

from .models import Recipe, Ingredient, RecipeIngredient
from .serializers import RecipeCreateSerializer, RecipeListSerializer, RecipeDetailSerializer
from app.usda import fdc_search

# Sprint 1 placeholder macro DB (per 100g)
NUTRITION_PER_100G = {
    "chicken breast": {"calories": 165, "protein": 31, "fat": 3.6, "carbs": 0},
    "rice": {"calories": 130, "protein": 2.7, "fat": 0.3, "carbs": 28},
    "egg": {"calories": 143, "protein": 13, "fat": 10, "carbs": 1.1},
}


def compute_macros(recipe: Recipe):
    total = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}

    for ri in recipe.recipe_ingredients.all():
        # Use saved USDA macros first; fallback to placeholder map for legacy rows.
        per100 = {
            "calories": float(ri.calories_per_100g or 0),
            "protein": float(ri.protein_per_100g or 0),
            "fat": float(ri.fat_per_100g or 0),
            "carbs": float(ri.carbs_per_100g or 0),
        }
        if not any(per100.values()):
            name = (ri.ingredient.name or "").strip().lower()
            per100 = NUTRITION_PER_100G.get(
                name,
                {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0},
            )

        qty = float(ri.quantity or 0)  # assumed grams if unit == "g"
        factor = qty / 100.0

        total["calories"] += float(per100.get("calories", 0)) * factor
        total["protein"] += float(per100.get("protein", 0)) * factor
        total["fat"] += float(per100.get("fat", 0)) * factor
        total["carbs"] += float(per100.get("carbs", 0)) * factor

    # Round for nicer output
    return {k: round(v, 2) for k, v in total.items()}


class RecipeListCreateView(APIView):
    permission_classes = [IsAuthenticated]  # ✅ must be logged in

    def get(self, request):
        user = request.user

        recipes = (
            Recipe.objects.filter(user=user)
            .prefetch_related("recipe_ingredients__ingredient")
            .order_by("-created_at")
        )

        for r in recipes:
            r.macros = compute_macros(r)

        return Response(RecipeListSerializer(recipes, many=True).data)

    def post(self, request):
        user = request.user

        ser = RecipeCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        recipe = Recipe.objects.create(
            user=user,
            name=data["name"],
            description=data.get("description", ""),
            servings=data["servings"],
        )

        for item in data["ingredients"]:
            ing_name = item["name"].strip().lower()
            ing, _ = Ingredient.objects.get_or_create(name=ing_name)
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ing,
                quantity=float(item["quantity"]),
                unit=item.get("unit", "g"),
                calories_per_100g=float(item.get("calories_per_100g", 0)),
                protein_per_100g=float(item.get("protein_per_100g", 0)),
                carbs_per_100g=float(item.get("carbs_per_100g", 0)),
                fat_per_100g=float(item.get("fat_per_100g", 0)),
            )

        recipe = (
            Recipe.objects.filter(id=recipe.id)
            .prefetch_related("recipe_ingredients__ingredient")
            .first()
        )
        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data, status=status.HTTP_201_CREATED)


class RecipeDetailView(APIView):
    permission_classes = [IsAuthenticated]  # ✅ must be logged in

    def get(self, request, recipe_id: int):
        user = request.user

        recipe = (
            Recipe.objects.filter(user=user, id=recipe_id)
            .prefetch_related("recipe_ingredients__ingredient")
            .first()
        )
        if not recipe:
            return Response({"detail": "Not found"}, status=404)

        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data)


def _extract_macro(food: dict, nutrient_number: str, nutrient_name: str):
    for nutrient in food.get("foodNutrients", []):
        number = str(nutrient.get("nutrientNumber", "")).strip()
        name = str(nutrient.get("nutrientName", "")).strip().lower()
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
    """
    GET /food/search/?q=chicken
    Returns USDA search results with macro fields for quick ingredient selection.
    """

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "Missing query param: q"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = fdc_search(query=query, page_size=15, page_number=1)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except RequestException as exc:
            return Response({"detail": f"USDA request failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as exc:
            return Response({"detail": f"Unexpected error: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        results = []
        for food in data.get("foods", []):
            results.append(
                {
                    "fdcId": food.get("fdcId"),
                    "description": food.get("description"),
                    "brandOwner": food.get("brandOwner"),
                    "dataType": food.get("dataType"),
                    "macros": {
                        "calories": _extract_macro(food, "208", "Energy"),
                        "protein": _extract_macro(food, "203", "Protein"),
                        "carbs": _extract_macro(food, "205", "Carbohydrate, by difference"),
                        "fat": _extract_macro(food, "204", "Total lipid (fat)"),
                    },
                }
            )

        return Response({"results": results}, status=status.HTTP_200_OK)
