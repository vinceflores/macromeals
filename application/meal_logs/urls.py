from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MealLogListCreateView, MealLogDetailView, MealLogViewSet, WaterLogView, WaterTrendView

router = DefaultRouter()
router.register(r'logging', MealLogViewSet)

urlpatterns = [
    path("", MealLogListCreateView.as_view(), name="meal-log-list-create"),
    path("<int:log_id>/", MealLogDetailView.as_view(), name="meal-log-detail"),
    path("water/",WaterLogView.as_view(), name="water intake lg"),
    path('water/history/', WaterTrendView.as_view(), name='water-history'),
]
