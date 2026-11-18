from app import db
from app.models.food import FoodListing
from app.utils.errors import APIError
from app.utils.time import parse_iso, utc_now

REQUIRED = ("food_name", "category", "quantity", "expiry_time", "pickup_location")
EDITABLE = ("food_name", "category", "quantity", "available_quantity", "expiry_time",
            "pickup_location", "latitude", "longitude", "status")
MANUAL_STATUSES = ("available", "reserved", "completed")


def refresh_expired():
    """Mark every still-open listing past its expiry time as expired."""
    FoodListing.query.filter(
        FoodListing.status.in_(["available", "reserved"]),
        FoodListing.expiry_time <= utc_now(),
    ).update({"status": "expired"}, synchronize_session=False)
    db.session.commit()


def _int(value, field, errors, minimum):
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        errors[field] = f"must be an integer >= {minimum}"
        return None
    return value


def _validate(data, errors):
    clean = {}
    for f in ("food_name", "category", "pickup_location"):
        if f in data:
            v = data[f].strip() if isinstance(data[f], str) else ""
            if not v:
                errors[f] = "must be a non-empty string"
            clean[f] = v
    if "quantity" in data:
        clean["quantity"] = _int(data["quantity"], "quantity", errors, 1)
    if "available_quantity" in data:
        clean["available_quantity"] = _int(data["available_quantity"], "available_quantity", errors, 0)
    if "expiry_time" in data:
        try:
            clean["expiry_time"] = parse_iso(data["expiry_time"])
        except (TypeError, ValueError, AttributeError):
            errors["expiry_time"] = "must be an ISO-8601 datetime, e.g. 2026-11-20T18:00:00Z"
    for f, lim in (("latitude", 90), ("longitude", 180)):
        if f in data and data[f] is not None:
            try:
                v = float(data[f])
                if abs(v) > lim:
                    raise ValueError
                clean[f] = v
            except (TypeError, ValueError):
                errors[f] = f"must be a number between -{lim} and {lim}"
        elif f in data:
            clean[f] = None
    if "status" in data:
        if data["status"] not in MANUAL_STATUSES:
            errors["status"] = f"must be one of: {', '.join(MANUAL_STATUSES)}"
        clean["status"] = data["status"]
    return clean


def create_listing(provider, data):
    data = data or {}
    errors = {f: "is required" for f in REQUIRED if f not in data or data[f] in (None, "")}
    clean = _validate({k: v for k, v in data.items() if k not in errors and k in EDITABLE}, errors)
    if errors:
        raise APIError("Validation failed", 400, errors)

    if clean["expiry_time"] <= utc_now():
        raise APIError("Validation failed", 400, {"expiry_time": "must be in the future"})
    clean.setdefault("available_quantity", clean["quantity"])
    if clean["available_quantity"] > clean["quantity"]:
        raise APIError("Validation failed", 400, {"available_quantity": "cannot exceed quantity"})
    clean.setdefault("latitude", provider.latitude)
    clean.setdefault("longitude", provider.longitude)
    clean.pop("status", None)

    listing = FoodListing(provider_id=provider.id, status="available", **clean)
    db.session.add(listing)
    db.session.commit()
    return listing


def update_listing(listing, data):
    data = {k: v for k, v in (data or {}).items() if k in EDITABLE}
    if not data:
        raise APIError("No editable fields supplied", 400)
    errors = {}
    clean = _validate(data, errors)
    if errors:
        raise APIError("Validation failed", 400, errors)

    qty = clean.get("quantity", listing.quantity)
    avail = clean.get("available_quantity", listing.available_quantity)
    if avail > qty:
        raise APIError("Validation failed", 400, {"available_quantity": "cannot exceed quantity"})
    if "expiry_time" in clean and clean["expiry_time"] <= utc_now():
        raise APIError("Validation failed", 400, {"expiry_time": "must be in the future"})
    if listing.status == "expired" and clean.get("status") and "expiry_time" not in clean:
        raise APIError("Expired listing: extend expiry_time to reopen it", 400)

    for k, v in clean.items():
        setattr(listing, k, v)
    if "expiry_time" in clean and listing.status == "expired" and "status" not in clean:
        listing.status = "available"
    db.session.commit()
    return listing


def delete_listing(listing):
    db.session.delete(listing)
    db.session.commit()


def list_for_user(user, args):
    refresh_expired()
    q = FoodListing.query
    if user.role == "ngo":
        q = q.filter(FoodListing.status == "available", FoodListing.available_quantity > 0)
    else:
        if user.role == "provider":
            q = q.filter(FoodListing.provider_id == user.id)
        if args.get("status"):
            q = q.filter(FoodListing.status == args["status"])
    if args.get("category"):
        q = q.filter(FoodListing.category.ilike(args["category"]))
    return q.order_by(FoodListing.expiry_time.asc()).all()


def get_visible(user, listing_id):
    refresh_expired()
    listing = db.session.get(FoodListing, listing_id)
    if not listing:
        raise APIError("Food listing not found", 404)
    if user.role == "provider" and listing.provider_id != user.id:
        raise APIError("You can only view your own listings", 403)
    if user.role == "ngo" and listing.status != "available":
        raise APIError("Food listing not found", 404)
    return listing


def get_manageable(user, listing_id):
    refresh_expired()
    listing = db.session.get(FoodListing, listing_id)
    if not listing:
        raise APIError("Food listing not found", 404)
    if user.role != "admin" and listing.provider_id != user.id:
        raise APIError("You can only manage your own listings", 403)
    return listing


# ---- Helper for Member 3 (reservations) ----
def assert_reservable(listing, quantity):
    """Raise APIError unless `quantity` can be reserved from this listing right now."""
    if listing.is_expired or listing.status == "expired":
        listing.status = "expired"
        db.session.commit()
        raise APIError("This food listing has expired and cannot be reserved", 400)
    if listing.status != "available":
        raise APIError(f"Listing is {listing.status}", 400)
    if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity < 1:
        raise APIError("Quantity must be a positive integer", 400)
    if quantity > listing.available_quantity:
        raise APIError("Requested quantity exceeds available quantity", 400)
