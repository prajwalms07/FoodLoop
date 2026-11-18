from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app import db
from app.models.user import User
from app.utils.errors import APIError


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            raise APIError("User no longer exists", 401)
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper


def roles_required(*roles):
    def decorator(fn):
        @wraps(fn)
        @login_required
        def wrapper(*args, **kwargs):
            if g.current_user.role not in roles:
                raise APIError("You do not have permission to perform this action", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
