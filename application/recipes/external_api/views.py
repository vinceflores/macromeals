

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from .recipe import RecipeAPI

class RecipeAPIView(APIView):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.api = RecipeAPI()

class RecipeAPISearchView(RecipeAPIView):
    # permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]

    def get(self, request: Request):
        q = request.query_params.get("q", None)
        if q is None:
            return Response({"error": "Query param q is required"}, status=400)
        recipes = self.api.client.recipes_search(q, max_results=10)
        return Response({ "recipes": recipes })
