from datetime import timedelta

from app.utils.time import utc_now
from tests.conftest import make_user


def create_food(client, provider, food_payload):
    response = client.post("/api/foods", json=food_payload, headers=provider)
    assert response.status_code == 201
    return response.get_json()["food"]["id"]


def reserve(client, ngo, food_id, quantity):
    return client.post(
        f"/api/foods/{food_id}/reservations",
        json={"quantity": quantity},
        headers=ngo,
    )


def test_reservation_updates_stock_and_tracks_delivery(
    client, provider, ngo, food_payload
):
    food_id = create_food(
        client,
        provider,
        {**food_payload, "latitude": 12.31, "longitude": 76.64},
    )
    response = reserve(client, ngo, food_id, 10)

    assert response.status_code == 201
    reservation = response.get_json()["reservation"]
    assert reservation["status"] == "reserved"
    assert reservation["food_name"] == "Rice"
    assert reservation["latitude"] == 12.31
    assert reservation["longitude"] == 76.64

    listing = client.get(f"/api/foods/{food_id}", headers=provider).get_json()["food"]
    assert listing["available_quantity"] == 0
    assert listing["status"] == "reserved"

    pickup = client.patch(
        f"/api/reservations/{reservation['id']}",
        json={"status": "picked_up"},
        headers=ngo,
    )
    assert pickup.status_code == 200
    assert pickup.get_json()["reservation"]["picked_up_at"]

    delivery = client.patch(
        f"/api/reservations/{reservation['id']}",
        json={"status": "delivered"},
        headers=ngo,
    )
    assert delivery.status_code == 200
    delivered = delivery.get_json()["reservation"]
    assert delivered["status"] == "delivered"
    assert delivered["delivered_at"]

    listing = client.get(f"/api/foods/{food_id}", headers=provider).get_json()["food"]
    assert listing["status"] == "completed"
    assert client.get("/api/foods", headers=ngo).get_json()["count"] == 0
    tracked = client.get("/api/reservations", headers=provider).get_json()
    assert tracked["count"] == 1
    assert tracked["reservations"][0]["id"] == reservation["id"]


def test_cancelled_reservation_restores_stock(client, provider, ngo, food_payload):
    food_id = create_food(client, provider, food_payload)
    reservation = reserve(client, ngo, food_id, 4).get_json()["reservation"]

    response = client.patch(
        f"/api/reservations/{reservation['id']}",
        json={"status": "cancelled"},
        headers=ngo,
    )
    assert response.status_code == 200
    assert response.get_json()["reservation"]["status"] == "cancelled"

    listing = client.get(f"/api/foods/{food_id}", headers=provider).get_json()["food"]
    assert listing["available_quantity"] == 10
    assert listing["status"] == "available"


def test_partial_delivery_keeps_only_remaining_kg_bookable(
    client, provider, ngo, food_payload
):
    food_id = create_food(client, provider, food_payload)
    reservation = reserve(client, ngo, food_id, 2).get_json()["reservation"]
    reservation_id = reservation["id"]

    client.patch(
        f"/api/reservations/{reservation_id}",
        json={"status": "picked_up"},
        headers=ngo,
    )
    delivered = client.patch(
        f"/api/reservations/{reservation_id}",
        json={"status": "delivered"},
        headers=ngo,
    )

    assert delivered.status_code == 200
    available = client.get("/api/foods", headers=ngo).get_json()["foods"]
    assert len(available) == 1
    assert available[0]["available_quantity"] == 8
    assert available[0]["status"] == "available"
    assert reserve(client, ngo, food_id, 9).status_code == 400


def test_reservations_enforce_role_ownership_and_valid_transitions(
    client, provider, ngo, food_payload
):
    food_id = create_food(client, provider, food_payload)
    assert reserve(client, provider, food_id, 1).status_code == 403
    reservation = reserve(client, ngo, food_id, 1).get_json()["reservation"]
    other_ngo = make_user(client, "ngo", "other-ngo@example.com")

    assert client.patch(
        f"/api/reservations/{reservation['id']}",
        json={"status": "picked_up"},
        headers=other_ngo,
    ).status_code == 403
    assert client.patch(
        f"/api/reservations/{reservation['id']}",
        json={"status": "delivered"},
        headers=ngo,
    ).status_code == 400
    assert client.post(
        f"/api/foods/{food_id}/reservations",
        json={"quantity": 99},
        headers=ngo,
    ).status_code == 400


def test_expired_food_cannot_be_reserved(client, provider, ngo, food_payload):
    expired_payload = {
        **food_payload,
        "expiry_time": (utc_now() + timedelta(minutes=1)).isoformat() + "Z",
    }
    food_id = create_food(client, provider, expired_payload)
    from app import db
    from app.models import FoodListing

    listing = db.session.get(FoodListing, food_id)
    listing.expiry_time = utc_now() - timedelta(minutes=1)
    db.session.commit()

    assert reserve(client, ngo, food_id, 1).status_code == 404
