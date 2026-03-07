from django.urls import path

from .views import  CurrentDayProgressView, CurrentDayLoggedMeals

urlpatterns = [
     
    path("progress/", CurrentDayProgressView.as_view()),
    path("meals/", CurrentDayLoggedMeals.as_view())
]
