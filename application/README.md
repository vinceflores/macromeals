
# Application Layer / Backend Server

## Modules
| name | description | type |
| ---- | ----------- | ----- |
| backend | django project configuration folder | project |
| accounts | CRUD for account | app |
| recipes | CRUD for recipes and integration for external recipe APIs| app |
| auths | JWT auth and reset password | app |

A typical folder structure per type

Type `app` django term for module
- `models.py`: Data Model/ORM model definitions 
- `serializer.py`: DTO, DAO, Validators
- `views.py`: Controller definitions
- `urls.py`: lists of HTTP endpoints
- `app.py`: module config

Type `project`
- `settings.py`: Project Configurations
- `urls.py`: list of HTTP endpoints for the backend server

## Enpoints

### `/accounts`
### `/auths`
### `/recipes`

## Testing
```
docker exec -it macromeals_backend python /app/application/manage.py test accounts recipes meal_logs analytics --verbosity=2
```


