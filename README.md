## General Setup Instructions
1. Prerequisites
Ensure the following are installed on your machine if not already:
- Docker Desktop (https://www.docker.com/)
- Git (https://git-scm.com/)
2. Clone our repository: `git clone https://github.com/vinceflores/macromeals.git`
3. `cd macromeals`
4. Ensure that Docker Desktop is open and running in the background, and then run `docker compose up --build -d `
5. The frontend will be available at http://localhost:5173, and the backend available at http://localhost:8000

## USDA API Key Setup (Required)

This project uses the USDA FoodData Central API.

1. Open `docker-compose.yml`
2. In the `backend` service, set the environment variable:

   USDA_API_KEY=YOUR_KEY_HERE
