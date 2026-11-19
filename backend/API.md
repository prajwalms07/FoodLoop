# FoodLoop API

Base URL: `http://localhost:5000` · Bodies are JSON except food creation with an image, which uses multipart form data · All timestamps are UTC ISO-8601 ending in `Z`.
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
`latitude`, `longitude`, `capacity` (whole-number kilograms the NGO can collect) optional.
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

Fields: `food_name`, `category`, `quantity` (whole-number kilograms, ≥ 1), `expiry_time` (future), `pickup_location` are required on create. An optional `image` upload accepts JPG, PNG, or WebP files up to 5 MB.
`available_quantity` defaults to `quantity` and may not exceed it. `latitude`/`longitude` default to the provider's; providers can set the pickup pin from the map in the dashboard.
Status values: `available`, `reserved`, `completed`, `expired` (expiry is applied automatically).

### POST /api/foods  (provider only)
Send `multipart/form-data` when attaching an image; the other fields keep the same names as the JSON format.
```sh
curl -X POST http://localhost:5000/api/foods \
  -H "Authorization: Bearer <access-token>" \
  -F "food_name=Vegetable Biryani" \
  -F "category=cooked" \
  -F "quantity=50" \
  -F "expiry_time=2026-11-20T18:00:00Z" \
  -F "pickup_location=12 MG Road, Mysuru" \
  -F "image=@biryani.jpg"
```
**201**
```json
{ "message": "Food listing created",
  "food": { "id": 1, "provider_id": 1, "food_name": "Vegetable Biryani", "category": "cooked",
            "quantity": 50, "available_quantity": 50, "expiry_time": "2026-11-18T18:00:00Z",
            "pickup_location": "12 MG Road, Mysuru", "latitude": 12.2958, "longitude": 76.6394,
            "image_url": "/api/foods/1/image",
            "status": "available", "created_at": "2026-11-18T10:05:00.000000Z" } }
```

Listings include `image_url` (null when no photo was uploaded). The image can be fetched from that URL; it is intentionally public so browsers can display it without an authorization header. Uploads accept JPG, PNG, or WebP up to 5 MB.

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

## Reservations and delivery tracking

### POST /api/foods/<id>/reservations (NGO / volunteer only)
Reserve a positive quantity in kilograms from an available listing. Stock is reduced immediately and concurrent reservations cannot claim more than the remaining quantity. A listing stays available while any kilograms remain.
```json
{ "quantity": 12 }
```
**201** `{ "message": "Food reserved successfully", "reservation": { "id": 1, "food_id": 1, "food_name": "Vegetable Biryani", "quantity": 12, "status": "reserved", "reserved_at": "...", "picked_up_at": null, "delivered_at": null } }`

### GET /api/reservations
- **NGO / volunteer:** their own reservations.
- **Provider:** reservations against their own food listings.
- **Admin:** all reservations.

Each reservation includes food, pickup location and coordinates, provider and volunteer names, quantity in kilograms, status and lifecycle timestamps.

### PATCH /api/reservations/<id> (owning NGO / volunteer only)
Move a reservation through `reserved` → `picked_up` → `delivered`. A reservation can instead be `cancelled` while still reserved; its quantity returns to the listing if the food has not expired.
```json
{ "status": "picked_up" }
```
**200** `{ "message": "Reservation updated", "reservation": { "...": "..." } }`

Food listings become `completed` once all kilograms have been reserved and every reservation has been delivered. A partially reserved listing remains available at its remaining kilogram quantity. Invalid transitions and attempts to update another volunteer's reservation are rejected.
