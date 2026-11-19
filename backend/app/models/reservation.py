from app import db
from app.utils.time import to_iso, utc_now


class Reservation(db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.Integer, primary_key=True)
    food_id = db.Column(db.Integer, db.ForeignKey("food_listings.id"), nullable=False, index=True)
    volunteer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="reserved", index=True)
    reserved_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    picked_up_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)

    food = db.relationship("FoodListing", back_populates="reservations")
    volunteer = db.relationship("User", back_populates="reservations")

    def to_dict(self):
        return {
            "id": self.id,
            "food_id": self.food_id,
            "food_name": self.food.food_name,
            "pickup_location": self.food.pickup_location,
            "latitude": self.food.latitude,
            "longitude": self.food.longitude,
            "provider_name": self.food.provider.name,
            "volunteer_id": self.volunteer_id,
            "volunteer_name": self.volunteer.name,
            "quantity": self.quantity,
            "status": self.status,
            "reserved_at": to_iso(self.reserved_at),
            "picked_up_at": to_iso(self.picked_up_at),
            "delivered_at": to_iso(self.delivered_at),
            "cancelled_at": to_iso(self.cancelled_at),
        }
