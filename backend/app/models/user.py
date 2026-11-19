from app import db
from app.utils.time import to_iso, utc_now

ROLES = ("provider", "ngo", "admin")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    capacity = db.Column(db.Integer)  # NGO: maximum kilograms it can collect
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)

    listings = db.relationship("FoodListing", back_populates="provider", cascade="all, delete-orphan")
    reservations = db.relationship(
        "Reservation", back_populates="volunteer", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "email": self.email, "role": self.role,
            "latitude": self.latitude, "longitude": self.longitude,
            "capacity": self.capacity, "created_at": to_iso(self.created_at),
        }
