# FoodLoop API

Base URL: `http://localhost:5000` · All bodies are JSON · All timestamps are UTC ISO-8601 ending in `Z`.
Protected routes need `Authorization: Bearer <access_token>`.

Errors always look like `{"error": "message"}` (validation errors add `"details": {"field": "reason"}`).

| Status | Meaning |
|---|---|
| 400 | Validation failed |
| 401 | Missing/invalid/expired token or bad credentials |
| 403 | Role not allowed / not the owner |
| 404 | Not found |
| 409 | Email already registered |

## Auth

### POST /api/auth/register
Public. `role` must be `provider` or `ngo` (admins are created by seed only). Password ≥ 8 chars.
`latitude`, `longitude`, `capacity` optional.
```json
{ "name": "Green Bistro", "email": "bistro@example.com", "password": "Password123!",
  "role": "provider", "latitude": 12.2958, "longitude": 76.6394 }
```
**201**
```json
{ "message": "User registered successfully",
  "user": { "id": 1, "name": "Green Bistro", "email": "bistro@example.com", "role": "provider",
            "latitude": 12.2958, "longitude": 76.6394, "capacity": null,
            "created_at": "2026-11-18T10:00:00.123456Z" } }
```
Errors: **400** `{"error":"Validation failed","details":{"password":"must be at least 8 characters"}}`, **409** `{"error":"Email already registered"}`

### POST /api/auth/login
```json
{ "email": "bistro@example.com", "password": "Password123!" }
```
**200**
```json
{ "access_token": "eyJhbGciOi...", "token_type": "Bearer", "user": { "id": 1, "role": "provider", "...": "..." } }
```
**401** `{"error":"Invalid email or password"}`

### GET /api/users/me
Auth required. **200** `{ "user": { "id": 1, "name": "...", "email": "...", "role": "provider", ... } }`

## Food listings

Fields: `food_name`, `category`, `quantity` (int ≥ 1), `expiry_time` (future), `pickup_location` are required on create.
`available_quantity` defaults to `quantity` and may not exceed it. `latitude`/`longitude` default to the provider's.
Status values: `available`, `reserved`, `completed`, `expired` (expiry is applied automatically).

### POST /api/foods  (provider only)
```json
{ "food_name": "Vegetable Biryani", "category": "cooked", "quantity": 50,
  "expiry_time": "2026-11-18T18:00:00Z", "pickup_location": "12 MG Road, Mysuru" }
```
**201**
```json
{ "message": "Food listing created",
  "food": { "id": 1, "provider_id": 1, "food_name": "Vegetable Biryani", "category": "cooked",
            "quantity": 50, "available_quantity": 50, "expiry_time": "2026-11-18T18:00:00Z",
            "pickup_location": "12 MG Road, Mysuru", "latitude": 12.2958, "longitude": 76.6394,
            "status": "available", "created_at": "2026-11-18T10:05:00.000000Z" } }
```

### GET /api/foods
Optional query: `?category=cooked&status=available`.
- **NGO:** only available, unexpired listings with stock left.
- **Provider:** only their own listings (any status).
- **Admin:** everything.

**200** `{ "count": 1, "foods": [ { ...listing... } ] }`

### GET /api/foods/<id>
**200** `{ "food": { ...listing... } }` · Provider → own only (403 otherwise) · NGO → available only (else 404).

### PUT /api/foods/<id>  (owner provider or admin)
Send any editable fields.
```json
{ "available_quantity": 30, "pickup_location": "New address" }
```
**200** `{ "message": "Food listing updated", "food": { ... } }`
Setting a new future `expiry_time` on an expired listing reopens it.

### DELETE /api/foods/<id>  (owner provider or admin)
**200** `{ "message": "Food listing deleted" }`

## For Member 3 (reservations)
Use `app.services.food_service.assert_reservable(listing, quantity)` before reserving; it raises a 400 `APIError`
for expired, non-available or over-quantity requests. Decrement `available_quantity` yourself after it passes.
