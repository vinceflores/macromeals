from django.urls import path

from .views import MealLogListCreateView

urlpatterns = [
    path("", MealLogListCreateView.as_view(), name="meal-log-list-create"),
]
