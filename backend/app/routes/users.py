from flask import Blueprint, g, jsonify

from app.utils.decorators import login_required

bp = Blueprint("users", __name__, url_prefix="/api/users")


@bp.get("/me")
@login_required
def me():
    return jsonify(user=g.current_user.to_dict()), 200
