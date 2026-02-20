

# MacroMeals Application layer

# Set up
Create a python virtual environment

```
python -m venv venv
source venv/bin/activate
```

install dependenciees
```
pip install -r requirements.txt
```

when adding a new dependency remember to update `requirements.txt` before commiting to git
```
pip freeze > requirements.txt
```

# Running the server
posgesql is not configured yet so default is sqlite
```
python manage.py migrate
```
```
python manage.py runserver
```

# Create superuser
Create a superuser to create recipes under
```
python manage.py createsuperuser
```
Example:
```
Username:
Email Address: test@gmail.com
Password: test123123
```
# Resources 
- [django](https://docs.djangoproject.com/en/6.0/)
- [django-restframework](https://www.django-rest-framework.org/tutorial/quickstart/)
- [react + django article](https://www.digitalocean.com/community/tutorials/build-a-to-do-application-using-django-and-react#step-1-setting-up-the-backend)
- [django + react tutorial sample code](https://github.com/do-community/django-todo-react)