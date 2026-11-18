from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

from app.config import Config

db = SQLAlchemy()
jwt = JWTManager()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from app import models  # noqa: F401  (register models)
    from app.routes import auth, foods, users
    from app.utils.errors import register_error_handlers
    from app.utils.seed import seed_database

    for module in (auth, users, foods):
        app.register_blueprint(module.bp)
    register_error_handlers(app, jwt)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.cli.command("init-db")
    def init_db():
        db.create_all()
        print("Database initialised.")

    @app.cli.command("seed")
    def seed():
        db.create_all()
        seed_database()

    with app.app_context():
        db.create_all()

    return app
