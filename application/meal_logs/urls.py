from django.urls import path

from .views import MealLogListCreateView, MealLogDetailView, WaterLogView

urlpatterns = [
    path("", MealLogListCreateView.as_view(), name="meal-log-list-create"),
    path("<int:log_id>/", MealLogDetailView.as_view(), name="meal-log-detail"),
    path("water/",WaterLogView.as_view(), name="water intake lg" )
]
