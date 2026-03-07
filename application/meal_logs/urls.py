from django.urls import path

from .views import MealLogListCreateView, MealLogDetailView

urlpatterns = [
    path("", MealLogListCreateView.as_view(), name="meal-log-list-create"),
    path("<int:log_id>/", MealLogDetailView.as_view(), name="meal-log-detail"),
]
