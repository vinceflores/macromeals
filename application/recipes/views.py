from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User

from .models import Recipe, Ingredient, RecipeIngredient
from .serializers import RecipeCreateSerializer, RecipeListSerializer, RecipeDetailSerializer

# Sprint 1 placeholder macro DB (per 100g)
NUTRITION_PER_100G = {
    "chicken breast": {"calories": 165, "protein": 31, "fat": 3.6, "carbs": 0},
    "rice": {"calories": 130, "protein": 2.7, "fat": 0.3, "carbs": 28},
    "egg": {"calories": 143, "protein": 13, "fat": 10, "carbs": 1.1},
}

def compute_macros(recipe: Recipe):
    total = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}

    for ri in recipe.recipe_ingredients.all():
        name = ri.ingredient.name.lower().strip()
        grams = ri.quantity  # assume grams for sprint 1
        per100 = NUTRITION_PER_100G.get(
            name, {"calories": 0, "protein": 0, "fat": 0, "carbs": 0}
        )
        factor = grams / 100.0
        for k in total:
            total[k] += per100[k] * factor

    total = {k: round(v, 2) for k, v in total.items()}
    servings = max(int(recipe.servings), 1)
    per = {k: round(v / servings, 2) for k, v in total.items()}
    return {"total": total, "perServing": per}

def get_effective_user(request):
    # If logged in, use that user; otherwise use first user (your superuser) for testing
    return request.user if request.user.is_authenticated else User.objects.first()

class RecipeListCreateView(APIView):
    def get(self, request):
        user = get_effective_user(request)
        if user is None:
            return Response({"detail": "Create a user first (py manage.py createsuperuser)."}, status=400)

        recipes = (
            Recipe.objects.filter(user=user)
            .prefetch_related("recipe_ingredients__ingredient")
            .order_by("-created_at")
        )

        for r in recipes:
            r.macros = compute_macros(r)

        return Response(RecipeListSerializer(recipes, many=True).data)

    def post(self, request):
        user = get_effective_user(request)
        if user is None:
            return Response({"detail": "Create a user first (py manage.py createsuperuser)."}, status=400)

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
            )

        recipe = (
            Recipe.objects.filter(id=recipe.id)
            .prefetch_related("recipe_ingredients__ingredient")
            .first()
        )
        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data, status=status.HTTP_201_CREATED)

class RecipeDetailView(APIView):
    def get(self, request, recipe_id: int):
        user = get_effective_user(request)
        if user is None:
            return Response({"detail": "Create a user first (py manage.py createsuperuser)."}, status=400)

        recipe = (
            Recipe.objects.filter(user=user, id=recipe_id)
            .prefetch_related("recipe_ingredients__ingredient")
            .first()
        )
        if not recipe:
            return Response({"detail": "Not found"}, status=404)

        recipe.macros = compute_macros(recipe)
        return Response(RecipeDetailSerializer(recipe).data)