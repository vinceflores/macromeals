
from django.urls import path
# from rest_framework.urlpatterns import format_suffix_patterns

from app import views

urlpatterns = [
    path("me/", views.MeView.as_view() )
]


