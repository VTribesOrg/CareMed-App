import os
from flask import Flask
from extensions import db, migrate, login_manager, oauth, mail, csrf, limiter
from models.users import User
from config import DevConfig, Config
from flask_talisman import Talisman

app = Flask(__name__)

app = Flask(__name__)
if os.environ.get('FLASK_ENV') == 'development':
    app.config.from_object('config.DevConfig')
else:
    app.config.from_object('config.Config')

db.init_app(app)
migrate.init_app(app, db)
login_manager.init_app(app)
oauth.init_app(app)
mail.init_app(app)
csrf.init_app(app)
limiter.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)

csp = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "https://cdnjs.cloudflare.com", "https://www.gstatic.com"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
    "img-src": ["'self'", "data:", "https://www.google.com", "https://*.googleusercontent.com"],
    "connect-src": ["'self'"],
    "frame-ancestors": ["'self'"], 
    "object-src": ["'none'"]
 }

Talisman(
    app,
    content_security_policy=csp,
    content_security_policy_nonce_in=["script-src"],
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,
    strict_transport_security_include_subdomains=True,
    session_cookie_secure=False,
    session_cookie_http_only=True,
    frame_options="SAMEORIGIN",
)

from routes.user_routes import user_bp
app.register_blueprint(user_bp)

from routes.auth_routes import auth_bp
app.register_blueprint(auth_bp)

from routes.admin_routes import admin_bp
app.register_blueprint(admin_bp)


if __name__ == "__main__":
    debug = os.environ.get("DEBUG", "False") == "True"
    app.run(debug=debug)