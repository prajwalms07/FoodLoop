# FoodLoop project report

## Frontend

- JavaScript and JSX with React 19.
- Vite 8 for development and production builds.
- React Router for page navigation and protected dashboard access.
- Tailwind CSS for styling.
- Axios for REST API calls.
- Lucide React for interface icons.
- Leaflet and React Leaflet for pickup maps.
- Recharts is listed as a dependency but is not currently imported by the frontend source.

## Backend

- Python 3.12 and Flask for the REST API.
- Flask-SQLAlchemy / SQLAlchemy for persistence, using SQLite by default.
- Flask-JWT-Extended for bearer-token authentication.
- Flask-CORS for browser access to the API.
- python-dotenv for environment configuration.
- Pytest for API and workflow tests.

## Other tools and integrations

- Docker and Docker Compose build and run the frontend and backend as separate services.
- Nginx serves the compiled single-page frontend; Gunicorn serves the Flask API.
- A named Docker volume persists the SQLite database and uploaded food photos across container restarts.
- OpenStreetMap supplies map tiles; the public OSRM service estimates road routes; Google Maps opens turn-by-turn directions.
- ESLint checks frontend source. npm and pip manage JavaScript and Python dependencies.

## Docker quick start

From the project root, run `docker compose up --build`. Open
`http://localhost:5173`; the API health endpoint is
`http://localhost:5000/api/health`. Use `docker compose down` to stop the
containers without removing the saved database volume.
