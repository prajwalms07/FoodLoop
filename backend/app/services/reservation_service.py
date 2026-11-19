from sqlalchemy import case

from app import db
from app.models.food import FoodListing
from app.models.reservation import Reservation
from app.services.food_service import assert_reservable, get_visible, refresh_expired
from app.utils.errors import APIError
from app.utils.time import utc_now


def create_reservation(volunteer, food_id, quantity):
    listing = get_visible(volunteer, food_id)
    assert_reservable(listing, quantity)

    now = utc_now()
    updated = FoodListing.query.filter(
        FoodListing.id == food_id,
        FoodListing.status == "available",
        FoodListing.available_quantity >= quantity,
        FoodListing.expiry_time > now,
    ).update(
        {
            FoodListing.available_quantity: FoodListing.available_quantity - quantity,
            FoodListing.status: case(
                (FoodListing.available_quantity - quantity > 0, "available"),
                else_="reserved",
            ),
        },
        synchronize_session=False,
    )
    if not updated:
        db.session.rollback()
        raise APIError("The available quantity changed. Refresh and try again.", 409)

    reservation = Reservation(
        food_id=food_id,
        volunteer_id=volunteer.id,
        quantity=quantity,
    )
    db.session.add(reservation)
    db.session.commit()
    return reservation


def list_reservations(user):
    refresh_expired()
    query = Reservation.query
    if user.role == "ngo":
        query = query.filter(Reservation.volunteer_id == user.id)
    elif user.role == "provider":
        query = query.join(FoodListing).filter(FoodListing.provider_id == user.id)
    return query.order_by(Reservation.reserved_at.desc()).all()


def update_reservation(reservation_id, volunteer, next_status):
    reservation = db.session.get(Reservation, reservation_id)
    if not reservation:
        raise APIError("Reservation not found", 404)
    if reservation.volunteer_id != volunteer.id:
        raise APIError("You can only update your own reservations", 403)

    if next_status == "picked_up" and reservation.status == "reserved":
        reservation.status = "picked_up"
        reservation.picked_up_at = utc_now()
    elif next_status == "delivered" and reservation.status == "picked_up":
        reservation.status = "delivered"
        reservation.delivered_at = utc_now()
        db.session.flush()
        active = Reservation.query.filter(
            Reservation.food_id == reservation.food_id,
            Reservation.status.in_(("reserved", "picked_up")),
        ).count()
        if reservation.food.available_quantity == 0 and active == 0:
            reservation.food.status = "completed"
    elif next_status == "cancelled" and reservation.status == "reserved":
        reservation.status = "cancelled"
        reservation.cancelled_at = utc_now()
        FoodListing.query.filter_by(id=reservation.food_id).update(
            {
                FoodListing.available_quantity:
                    FoodListing.available_quantity + reservation.quantity,
                FoodListing.status: case(
                    (FoodListing.expiry_time > utc_now(), "available"),
                    else_="expired",
                ),
            },
            synchronize_session=False,
        )
    else:
        raise APIError(
            f"Cannot move a {reservation.status} reservation to {next_status}", 400
        )

    db.session.commit()
    return reservation
