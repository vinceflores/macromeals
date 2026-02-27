import os
import requests

FDC_BASE = "https://api.nal.usda.gov/fdc/v1"


def _api_key() -> str:
    key = os.getenv("USDA_API_KEY", "").strip()
    return key


def fdc_search(query: str, page_size: int = 10, page_number: int = 1):
    key = _api_key()
    if not key:
        raise RuntimeError("USDA_API_KEY is missing in environment")

    resp = requests.get(
        f"{FDC_BASE}/foods/search",
        params={
            "api_key": key,
            "query": query,
            "pageSize": page_size,
            "pageNumber": page_number,
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def fdc_food(fdc_id: int):
    key = _api_key()
    if not key:
        raise RuntimeError("USDA_API_KEY is missing in environment")

    resp = requests.get(
        f"{FDC_BASE}/food/{fdc_id}",
        params={"api_key": key},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()