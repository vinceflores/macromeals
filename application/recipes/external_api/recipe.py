


import os
from fatsecret import Fatsecret
import requests
from requests_oauthlib import OAuth1

class RecipeAPI:
    # API_URL = "https://platform.fatsecret.com/rest/server.api"
    API_URL="https://platform.fatsecret.com/rest/recipes/search/v3"
    consumer_key = os.getenv("CUSTOMER_KEY")
    consumer_secret= os.getenv("CUSTOMER_SECRET")
    def __init__(self):
        fs = Fatsecret(self.consumer_key, self.consumer_secret)
        self.client = fs

    def _auth(self):
        """2-legged OAuth1 auth — all recipe endpoints are public (no user token needed)."""
        return OAuth1(
            client_key=self.consumer_key,
            client_secret=self.consumer_secret,
            signature_method="HMAC-SHA1",
            signature_type="QUERY",  # FatSecret expects params in URL, not Authorization header
        )

    # ── 1. Search recipes ─────────────────────────────────────────────────────────

    def search_recipes(self, query, recipe_type=None, page_number=0, max_results=20):
        """
        Returns a paginated list of recipes matching the search expression.

        recipe_type: optional filter e.g. "Main Dishes", "Soups", "Desserts"
        page_number: zero-based page offset
        max_results: results per page (default 20)
        """
        params = {
            "method": "recipes.search",
            "search_expression": query,
            "page_number": page_number,
            "max_results": max_results,
            "format": "json",
            "must_have_images": True, 
        }
        if recipe_type:
            params["recipe_type"] = recipe_type

        response = requests.get(self.API_URL, params=params, auth=self._auth())
        response.raise_for_status()
        data = response.json()

        # FatSecret wraps results — grab the inner list safely
        recipes = data.get("recipes", {})
        return {
            "total_results": int(recipes.get("total_results", 0)),
            "page_number": int(recipes.get("page_number", 0)),
            "max_results": int(recipes.get("max_results", 0)),
            # ⚠️ FatSecret only returns a list when >1 result — normalize to always be a list
            # "recipes": _as_list(recipes.get("recipe")),
            "recipes": recipes.get("recipe"),
        }
