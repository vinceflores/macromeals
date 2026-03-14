


import os
from fatsecret import Fatsecret

class RecipeAPI:
    
    def __init__(self):
        consumer_key = os.getenv("CUSTOMER_KEY")
        consumer_secret= os.getenv("CUSTOMER_SECRET")
        fs = Fatsecret( consumer_key, consumer_secret)
        self.client = fs