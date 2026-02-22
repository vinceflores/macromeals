"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.urls import path, include
from django.contrib import admin
from recipes.views import RecipeListCreateView, RecipeDetailView

urlpatterns = [
    path("recipe/", RecipeListCreateView.as_view()),
    path("recipe/<int:recipe_id>/", RecipeDetailView.as_view()),
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls"))
    #test
]