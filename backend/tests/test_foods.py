from datetime import timedelta
from io import BytesIO

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
    assert food["image_url"] is None


def test_provider_uploads_image_for_ngo_listing(client, provider, ngo, food_payload, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    image_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 4
    response = client.post(
        "/api/foods",
        headers=provider,
        data={
            **food_payload,
            "quantity": str(food_payload["quantity"]),
            "image": (BytesIO(image_bytes), "rice.png"),
        },
    )

    assert response.status_code == 201
    food = response.get_json()["food"]
    assert food["image_url"] == f"/api/foods/{food['id']}/image"
    visible_food = client.get("/api/foods", headers=ngo).get_json()["foods"][0]
    assert visible_food["image_url"] == food["image_url"]

    image_response = client.get(food["image_url"])
    assert image_response.status_code == 200
    assert image_response.mimetype == "image/png"
    assert image_response.data == image_bytes
    assert image_response.headers["X-Content-Type-Options"] == "nosniff"


def test_provider_cannot_upload_non_image_content(client, provider, food_payload, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    response = client.post(
        "/api/foods",
        headers=provider,
        data={
            **food_payload,
            "quantity": str(food_payload["quantity"]),
            "image": (BytesIO(b"not an image"), "fake.png"),
        },
    )

    assert response.status_code == 400
    assert response.get_json()["details"]["image"] == "invalid image content"


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
