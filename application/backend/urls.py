from app.usda_views import UsdaSearchView, UsdaFoodDetailView
from django.urls import path, include
from django.contrib import admin
from recipes.views import (
    RecipeListCreateView,
    RecipeDetailView,
    FoodSearchView,
    RecipeToggleVisibilityView,
    PublicRecipeListView,
    SavePublicRecipeView,
)
from recipes.external_api.views import RecipeAPISearchView
from analytics.views import CurrentDayProgressView

urlpatterns = [
    path("api/usda/search/",              UsdaSearchView.as_view()),
    path("api/usda/food/<int:fdc_id>/",   UsdaFoodDetailView.as_view()),

    # ── Recipes ───────────────────────────────────────────────────────────────
    path("recipe/",                              RecipeListCreateView.as_view()),
    path("recipe/<int:recipe_id>/",              RecipeDetailView.as_view()),
    path("recipe/<int:recipe_id>/visibility/",   RecipeToggleVisibilityView.as_view()),
    path("recipe/community/",                    PublicRecipeListView.as_view()),
    path("recipe/<int:recipe_id>/save/",         SavePublicRecipeView.as_view()),

    # ── Misc ──────────────────────────────────────────────────────────────────
    path("food/search/",                         FoodSearchView.as_view()),
    path("admin/",                               admin.site.urls),
    path("api-auth/",                            include("rest_framework.urls", namespace="rest_framework")),
    path("api/",                                 include("app.urls")),
    path("api/auth/",                            include("auths.urls")),
    path("api/accounts/",                        include("accounts.urls")),
    path("api/analytics/",                       include("analytics.urls")),
    path("api/logging/",                         include("meal_logs.urls")),
    path("api/external/recipe/search",           RecipeAPISearchView.as_view()),
]
