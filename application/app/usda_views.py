from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .usda import fdc_search, fdc_food


class UsdaSearchView(APIView):
    """
    GET /api/usda/search/?q=chicken
    Returns small list for dropdown: fdcId + name + brand + datatype
    """

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"detail": "Missing query param: q"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = fdc_search(q, page_size=10, page_number=1)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        results = []
        for f in data.get("foods", []):
            results.append({
                "fdcId": f.get("fdcId"),
                "description": f.get("description"),
                "brandOwner": f.get("brandOwner"),
                "dataType": f.get("dataType"),
            })

        return Response({"results": results}, status=status.HTTP_200_OK)


class UsdaFoodDetailView(APIView):
    """
    GET /api/usda/food/<fdc_id>/
    Returns basic macros if present.
    """

    def get(self, request, fdc_id: int):
        try:
            data = fdc_food(fdc_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        nutrients = data.get("foodNutrients", [])

        def find_nutrient(target_names):
            """
            USDA nutrients can appear in slightly different shapes depending on food type.
            We try common fields safely.
            """
            for n in nutrients:
                nutrient_obj = n.get("nutrient") or {}
                name = nutrient_obj.get("name") or n.get("nutrientName")
                unit = nutrient_obj.get("unitName") or n.get("unitName")
                amount = n.get("amount")
                if not name:
                    continue
                for t in target_names:
                    if name.lower() == t.lower():
                        return {"name": name, "amount": amount, "unit": unit}
            return None

        return Response({
            "fdcId": data.get("fdcId"),
            "description": data.get("description"),
            "brandOwner": data.get("brandOwner"),
            "calories": find_nutrient(["Energy"]),
            "protein": find_nutrient(["Protein"]),
            "carbs": find_nutrient(["Carbohydrate, by difference"]),
            "fat": find_nutrient(["Total lipid (fat)"]),
        }, status=status.HTTP_200_OK)