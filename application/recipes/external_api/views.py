

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
        page = request.query_params.get("page", None)
        if q is None:
            return Response({"error": "Query param q is required"}, status=400)
        recipes = self.api.client.recipes_search(search_expression=q, page_number=page, max_results=10)
        # print(recipes[0])
        dto = []
        for r in recipes:
            recipe_dto = { 'macros':{
                            'calories' :r['recipe_nutrition']['calories'],
                            'carbohydrate' : r['recipe_nutrition']['carbohydrate'],
                            'fat' :  r['recipe_nutrition']['fat'],
                            'protein':r['recipe_nutrition']['protein'],
                                }, 
                            'name':r['recipe_name'], 
                            'description': r['recipe_description'],
                            'id': r['recipe_id'],
                            # 'image': r['recipe_image']
                }
            dto.append(recipe_dto)
        return Response({ "recipes": dto })