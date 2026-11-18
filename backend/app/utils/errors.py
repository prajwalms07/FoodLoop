from flask import jsonify


class APIError(Exception):
    def __init__(self, message, status=400, details=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.details = details


def register_error_handlers(app, jwt):
    @app.errorhandler(APIError)
    def handle_api_error(e):
        body = {"error": e.message}
        if e.details:
            body["details"] = e.details
        return jsonify(body), e.status

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Resource not found"), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify(error="Method not allowed"), 405

    @app.errorhandler(500)
    def server_error(_):
        return jsonify(error="Internal server error"), 500

    @jwt.unauthorized_loader
    def missing(msg):
        return jsonify(error="Authentication required"), 401

    @jwt.invalid_token_loader
    def invalid(msg):
        return jsonify(error="Invalid token"), 401

    @jwt.expired_token_loader
    def expired(h, p):
        return jsonify(error="Token has expired"), 401
