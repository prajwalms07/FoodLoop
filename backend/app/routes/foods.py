from flask import Blueprint, current_app, g, jsonify, request, send_from_directory

from app import db
from app.models.food import FoodListing
from app.services import food_service as svc
from app.utils.decorators import login_required, roles_required
from app.utils.errors import APIError

bp = Blueprint("foods", __name__, url_prefix="/api/foods")


@bp.get("")
@login_required
def list_foods():
    items = svc.list_for_user(g.current_user, request.args)
    return jsonify(count=len(items), foods=[i.to_dict() for i in items]), 200


@bp.post("")
@roles_required("provider")
def create_food():
    if request.mimetype == "multipart/form-data":
        data = request.form.to_dict()
        if "quantity" in data:
            try:
                data["quantity"] = int(data["quantity"])
            except ValueError:
                pass
        image_file = request.files.get("image")
    else:
        data = request.get_json(silent=True)
        image_file = None
    listing = svc.create_listing(g.current_user, data, image_file)
    return jsonify(message="Food listing created", food=listing.to_dict()), 201


@bp.get("/<int:food_id>/image")
def get_food_image(food_id):
    listing = db.session.get(FoodListing, food_id)
    if not listing or not listing.image_filename:
        raise APIError("Food image not found", 404)

    response = send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        listing.image_filename,
        conditional=True,
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@bp.get("/<int:food_id>")
@login_required
def get_food(food_id):
    return jsonify(food=svc.get_visible(g.current_user, food_id).to_dict()), 200


@bp.put("/<int:food_id>")
@roles_required("provider", "admin")
def update_food(food_id):
    listing = svc.get_manageable(g.current_user, food_id)
    listing = svc.update_listing(listing, request.get_json(silent=True))
    return jsonify(message="Food listing updated", food=listing.to_dict()), 200


@bp.delete("/<int:food_id>")
@roles_required("provider", "admin")
def delete_food(food_id):
    svc.delete_listing(svc.get_manageable(g.current_user, food_id))
    return jsonify(message="Food listing deleted"), 200
