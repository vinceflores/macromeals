from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.request import Request
from .recipe import RecipeAPI
# Import the specific error so we can catch it
from fatsecret.errors import AuthenticationError

class RecipeAPIView(APIView):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.api = RecipeAPI()

class RecipeAPISearchView(RecipeAPIView):
    permission_classes = [AllowAny]

    def get(self, request: Request):
        q = request.query_params.get("q", None)
        # Convert page to int and default to 0 to prevent signature issues
        try:
            page = int(request.query_params.get("page", 0))
        except (ValueError, TypeError):
            page = 0

        if q is None:
            return Response({"error": "Query param q is required"}, status=400)

        try:
            # 1. Fetch from FatSecret
            recipes = self.api.client.recipes_search(
                search_expression=q, 
                page_number=page, 
                max_results=10
            )

            # 2. Handle empty results
            if not recipes:
                return Response({"recipes": []})

            dto = []
            for r in recipes:
                # 3. Use .get() to avoid KeyError if nutrition is missing
                nutrition = r.get('recipe_nutrition', {})
                
                recipe_dto = {
                    'macros': {
                        'calories': nutrition.get('calories', '0'),
                        'carbohydrate': nutrition.get('carbohydrate', '0'),
                        'fat': nutrition.get('fat', '0'),
                        'protein': nutrition.get('protein', '0'),
                    },
                    'name': r.get('recipe_name', 'Unknown Recipe'),
                    'description': r.get('recipe_description', ''),
                    'id': r.get('recipe_id'),
                }
                dto.append(recipe_dto)

            return Response({"recipes": dto})

        except AuthenticationError as e:
            # Printing to terminal so you can see it in 'docker compose logs'
            print(f"FATSECRET AUTH ERROR: {e}")
            return Response({"error": f"Auth failed: {str(e)}"}, status=401)
        except Exception as e:
            print(f"GENERAL BACKEND ERROR: {e}")
            # This will show you the actual Python error on your frontend screen
            return Response({"error": f"Backend Error: {type(e).__name__} - {str(e)}"}, status=500)