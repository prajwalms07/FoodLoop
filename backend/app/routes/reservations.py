from flask import Blueprint, g, jsonify, request

from app.services import reservation_service as svc
from app.utils.decorators import login_required, roles_required
from app.utils.errors import APIError

bp = Blueprint("reservations", __name__, url_prefix="/api")


@bp.get("/reservations")
@login_required
def list_reservations():
    items = svc.list_reservations(g.current_user)
    return jsonify(count=len(items), reservations=[item.to_dict() for item in items]), 200


@bp.post("/foods/<int:food_id>/reservations")
@roles_required("ngo")
def create_reservation(food_id):
    body = request.get_json(silent=True) or {}
    if "quantity" not in body:
        raise APIError("Validation failed", 400, {"quantity": "is required"})
    reservation = svc.create_reservation(g.current_user, food_id, body["quantity"])
    return jsonify(
        message="Food reserved successfully",
        reservation=reservation.to_dict(),
    ), 201


@bp.patch("/reservations/<int:reservation_id>")
@roles_required("ngo")
def update_reservation(reservation_id):
    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status not in ("picked_up", "delivered", "cancelled"):
        raise APIError(
            "Validation failed",
            400,
            {"status": "must be picked_up, delivered, or cancelled"},
        )
    reservation = svc.update_reservation(
        reservation_id, g.current_user, status
    )
    return jsonify(
        message="Reservation updated",
        reservation=reservation.to_dict(),
    ), 200
