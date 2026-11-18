from datetime import timedelta

import pytest

from app import db
from app.models import FoodListing
from app.services.food_service import assert_reservable
from app.utils.errors import APIError
from app.utils.time import utc_now
from tests.conftest import make_user


def create(client, headers, payload):
    return client.post("/api/foods", json=payload, headers=headers)


def test_provider_creates_listing(client, provider, food_payload):
    res = create(client, provider, food_payload)
    assert res.status_code == 201
    food = res.get_json()["food"]
    assert food["available_quantity"] == 10 and food["status"] == "available"


def test_ngo_cannot_create(client, ngo, food_payload):
    assert create(client, ngo, food_payload).status_code == 403


def test_validation(client, provider, food_payload):
    assert create(client, provider, {**food_payload, "quantity": -1}).status_code == 400
    assert create(client, provider, {}).status_code == 400
    past = {**food_payload, "expiry_time": (utc_now() - timedelta(hours=1)).isoformat() + "Z"}
    assert create(client, provider, past).status_code == 400
    assert create(client, provider, {**food_payload, "available_quantity": 99}).status_code == 400


def test_ngo_sees_only_available(client, provider, ngo, food_payload):
    create(client, provider, food_payload)
    create(client, provider, {**food_payload, "food_name": "Gone", "available_quantity": 0})
    foods = client.get("/api/foods", headers=ngo).get_json()["foods"]
    assert [f["food_name"] for f in foods] == ["Rice"]


def test_provider_only_manages_own(client, provider, food_payload):
    fid = create(client, provider, food_payload).get_json()["food"]["id"]
    other = make_user(client, "provider", "other@example.com")
    assert client.put(f"/api/foods/{fid}", json={"quantity": 5}, headers=other).status_code == 403
    assert client.delete(f"/api/foods/{fid}", headers=other).status_code == 403
    res = client.put(f"/api/foods/{fid}", json={"quantity": 20}, headers=provider)
    assert res.status_code == 200 and res.get_json()["food"]["quantity"] == 20
    assert client.delete(f"/api/foods/{fid}", headers=provider).status_code == 200
    assert client.get(f"/api/foods/{fid}", headers=provider).status_code == 404


def test_expired_listing_hidden_and_not_reservable(client, provider, ngo, food_payload):
    fid = create(client, provider, food_payload).get_json()["food"]["id"]
    listing = db.session.get(FoodListing, fid)
    listing.expiry_time = utc_now() - timedelta(minutes=1)
    db.session.commit()
    assert client.get("/api/foods", headers=ngo).get_json()["count"] == 0
    listing = db.session.get(FoodListing, fid)
    assert listing.status == "expired"
    with pytest.raises(APIError):
        assert_reservable(listing, 1)
