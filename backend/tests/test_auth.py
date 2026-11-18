from app.models import User


def test_register_success_and_hash(client):
    res = client.post("/api/auth/register", json={
        "name": "A", "email": "A@Example.com", "password": "Password123!", "role": "provider"})
    assert res.status_code == 201
    user = User.query.filter_by(email="a@example.com").first()
    assert user and user.password_hash != "Password123!"
    assert "password" not in res.get_json()["user"]


def test_duplicate_email(client):
    body = {"name": "A", "email": "a@example.com", "password": "Password123!", "role": "ngo"}
    client.post("/api/auth/register", json=body)
    assert client.post("/api/auth/register", json=body).status_code == 409


def test_invalid_role_and_short_password(client):
    res = client.post("/api/auth/register", json={
        "name": "A", "email": "a@example.com", "password": "123", "role": "admin"})
    assert res.status_code == 400
    assert {"role", "password"} <= set(res.get_json()["details"])


def test_login_and_me(client, provider):
    res = client.get("/api/users/me", headers=provider)
    assert res.status_code == 200
    assert res.get_json()["user"]["role"] == "provider"


def test_login_wrong_password(client, provider):
    res = client.post("/api/auth/login", json={"email": "provider@example.com", "password": "nope"})
    assert res.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/users/me").status_code == 401
    assert client.get("/api/users/me", headers={"Authorization": "Bearer junk"}).status_code == 401
