from app import db
from app.utils.time import to_iso, utc_now

STATUSES = ("available", "reserved", "completed", "expired")


class FoodListing(db.Model):
    __tablename__ = "food_listings"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    food_name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    available_quantity = db.Column(db.Integer, nullable=False)
    expiry_time = db.Column(db.DateTime, nullable=False)  # UTC
    pickup_location = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    status = db.Column(db.String(20), nullable=False, default="available", index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)

    provider = db.relationship("User", back_populates="listings")

    @property
    def is_expired(self):
        return self.expiry_time <= utc_now()

    def to_dict(self):
        return {
            "id": self.id, "provider_id": self.provider_id, "food_name": self.food_name,
            "category": self.category, "quantity": self.quantity,
            "available_quantity": self.available_quantity,
            "expiry_time": to_iso(self.expiry_time), "pickup_location": self.pickup_location,
            "latitude": self.latitude, "longitude": self.longitude,
            "status": self.status, "created_at": to_iso(self.created_at),
        }
