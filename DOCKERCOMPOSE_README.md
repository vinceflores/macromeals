
To run
```
docker compose up --build
```

# NOTE_1: Run `python manage.py migrate` inside of macromeals_backend when running for the first time

To shut down
```
docker compose down
```
if you delete the volumes
```
docker compose down -v
```
after this do
```
python manage.py makemigrations
python manage.py migrate
```


## USDA API Key Setup (Required)

This project uses the USDA FoodData Central API.

1. Open `docker-compose.yml`
2. In the `backend` service, set the environment variable:

   USDA_API_KEY=YOUR_KEY_HERE
