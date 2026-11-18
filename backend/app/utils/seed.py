from datetime import timedelta

from werkzeug.security import generate_password_hash

from app import db
from app.models import FoodListing, User
from app.utils.time import utc_now

SEED_PASSWORD = "Password123!"


def seed_database():
    if User.query.first():
        print("Database already has data - skipping seed.")
        return
    pw = generate_password_hash(SEED_PASSWORD)
    admin = User(name="Admin", email="admin@foodloop.test", password_hash=pw, role="admin")
    p1 = User(name="Green Bistro", email="bistro@foodloop.test", password_hash=pw, role="provider",
              latitude=12.2958, longitude=76.6394)
    p2 = User(name="Sunrise Bakery", email="bakery@foodloop.test", password_hash=pw, role="provider",
              latitude=12.3051, longitude=76.6551)
    n1 = User(name="Hope Foundation", email="hope@foodloop.test", password_hash=pw, role="ngo",
              latitude=12.3100, longitude=76.6500, capacity=200)
    n2 = User(name="Helping Hands", email="hands@foodloop.test", password_hash=pw, role="ngo",
              latitude=12.2800, longitude=76.6300, capacity=100)
    db.session.add_all([admin, p1, p2, n1, n2])
    db.session.flush()

    now = utc_now()
    db.session.add_all([
        FoodListing(provider_id=p1.id, food_name="Vegetable Biryani", category="cooked",
                    quantity=50, available_quantity=50, expiry_time=now + timedelta(hours=5),
                    pickup_location="12 MG Road, Mysuru", latitude=12.2958, longitude=76.6394),
        FoodListing(provider_id=p1.id, food_name="Chapati & Dal", category="cooked",
                    quantity=30, available_quantity=20, expiry_time=now + timedelta(hours=3),
                    pickup_location="12 MG Road, Mysuru", latitude=12.2958, longitude=76.6394),
        FoodListing(provider_id=p2.id, food_name="Bread Loaves", category="bakery",
                    quantity=40, available_quantity=40, expiry_time=now + timedelta(days=1),
                    pickup_location="5 Temple Street, Mysuru", latitude=12.3051, longitude=76.6551),
        FoodListing(provider_id=p2.id, food_name="Pastries", category="bakery",
                    quantity=25, available_quantity=25, expiry_time=now + timedelta(hours=8),
                    pickup_location="5 Temple Street, Mysuru", latitude=12.3051, longitude=76.6551),
    ])
    db.session.commit()
    print(f"Seeded. All users share the password: {SEED_PASSWORD}")
