from flask import Blueprint, jsonify, request

from app.services import auth_service

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    user = auth_service.register_user(request.get_json(silent=True))
    return jsonify(message="User registered successfully", user=user.to_dict()), 201


@bp.post("/login")
def login():
    user, token = auth_service.login_user(request.get_json(silent=True))
    return jsonify(access_token=token, token_type="Bearer", user=user.to_dict()), 200
