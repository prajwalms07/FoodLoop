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

To use a different backend URL, set `VITE_API_BASE_URL` in the frontend's
`.env.local`, for example `VITE_API_BASE_URL=http://localhost:5000/api`, then
restart the Vite development server.
