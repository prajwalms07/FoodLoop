from datetime import timedelta

import pytest

from app import create_app, db
from app.config import TestConfig
from app.utils.time import utc_now


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def make_user(client, role="provider", email=None, name="Test"):
    email = email or f"{role}@example.com"
    client.post("/api/auth/register", json={
        "name": name, "email": email, "password": "Password123!", "role": role})
    res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    return {"Authorization": f"Bearer {res.get_json()['access_token']}"}


@pytest.fixture()
def provider(client):
    return make_user(client, "provider")


@pytest.fixture()
def ngo(client):
    return make_user(client, "ngo")


@pytest.fixture()
def food_payload():
    return {
        "food_name": "Rice", "category": "cooked", "quantity": 10,
        "expiry_time": (utc_now() + timedelta(hours=4)).isoformat() + "Z",
        "pickup_location": "1 Main St",
    }
