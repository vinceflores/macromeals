from django.urls import path

from .views import  CurrentDayProgressView

urlpatterns = [
     
    path("progress/", CurrentDayProgressView.as_view(), name="")
]
