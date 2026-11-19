import re

from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models.user import User
from app.utils.errors import APIError

# Public sign-up is limited to these. Admins are created via seed/CLI only.
SELF_REGISTER_ROLES = ("provider", "ngo")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _opt_float(data, key, lo, hi, errors):
    v = data.get(key)
    if v is None:
        return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        errors[key] = "must be a number"
        return None
    if not lo <= v <= hi:
        errors[key] = f"must be between {lo} and {hi}"
    return v


def register_user(data):
    data = data or {}
    errors = {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role")

    if not name:
        errors["name"] = "is required"
    if not EMAIL_RE.match(email):
        errors["email"] = "must be a valid email address"
    if len(password) < 8:
        errors["password"] = "must be at least 8 characters"
    if role not in SELF_REGISTER_ROLES:
        errors["role"] = f"must be one of: {', '.join(SELF_REGISTER_ROLES)}"
    lat = _opt_float(data, "latitude", -90, 90, errors)
    lon = _opt_float(data, "longitude", -180, 180, errors)

    capacity = data.get("capacity")
    if capacity is not None:
        if isinstance(capacity, bool) or not isinstance(capacity, int) or capacity < 0:
            errors["capacity"] = "must be a non-negative whole number of kilograms"
    if errors:
        raise APIError("Validation failed", 400, errors)

    if User.query.filter_by(email=email).first():
        raise APIError("Email already registered", 409)

    user = User(name=name, email=email, role=role, latitude=lat, longitude=lon,
                capacity=capacity, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    return user


def login_user(data):
    data = data or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email=email).first()
    # Same message for both failures so we don't leak which emails exist.
    if not user or not check_password_hash(user.password_hash, password):
        raise APIError("Invalid email or password", 401)
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return user, token
