# FoodLoop
A smart food redistribution platform connecting surplus food providers with NGOs and communities.

## Frontend authentication API contract

The frontend uses `VITE_API_BASE_URL` as the API base URL. It defaults to
`http://localhost:5000/api`, so the Flask service should expose:

- `POST /auth/register` with JSON `{ "name", "email", "password", "role" }`.
  `role` is `provider` or `ngo`; `capacity` is an optional integer for NGOs.
- `POST /auth/login` with JSON `{ "email", "password" }`.

Both endpoints return JSON. Login must include `access_token` and `user`.
Registration returns `message` and `user`; the new user is sent to the login
page after registration. Error responses use `error` and may include a
`details` object.
The Flask app must allow cross-origin requests from the frontend origin.

## Demo login accounts

The demo accounts use the shared password `Password123!`:

- Provider: `bistro@foodloop.test` or `bakery@foodloop.test`
- NGO: `hope@foodloop.test` or `hands@foodloop.test`

For a fresh, empty Docker database, create the demo accounts with
`docker compose exec backend flask --app run seed`. The seed command does not
replace existing account data.

To use a different backend URL, set `VITE_API_BASE_URL` in the frontend's
`.env.local`, for example `VITE_API_BASE_URL=http://localhost:5000/api`, then
restart the Vite development server.

## Run locally on Windows

The React app and Flask API must both be running. Start the backend in one
PowerShell terminal:

```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Start the frontend in a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

The backend health check is `http://localhost:5000/api/health`. Keep the Flask
terminal running while using login or registration.

## Run with Docker Compose

Docker Desktop is required. From the project root:

```powershell
docker compose up --build
```

Open the frontend at `http://localhost:5173`; the API health check is at
`http://localhost:5000/api/health`. Compose builds the React app and serves it
with Nginx, runs the Flask API with Gunicorn, waits for the API health check,
and stores SQLite data in a named Docker volume.
Food listing photos are stored in that same volume and remain available after
the containers restart.

Stop the containers with `Ctrl+C`, or run `docker compose down` in another
terminal. The database volume is retained. The default signing keys are for
local development only; set `SECRET_KEY` and `JWT_SECRET_KEY` in a local
`.env` file before using this setup outside a local machine. For a remote
deployment, also set `VITE_API_BASE_URL` and `CORS_ORIGINS` to the public
frontend and API origins, then rebuild the frontend image.

If ports 5000 or 5173 are already in use, set `API_PORT` and/or
`FRONTEND_PORT` in the project-root `.env` file. The API URL and default CORS
origin follow these port values automatically.
