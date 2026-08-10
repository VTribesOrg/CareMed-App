from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from argon2 import PasswordHasher
from authlib.integrations.flask_client import OAuth
from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address



db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
passhasher = PasswordHasher(time_cost=2, memory_cost=102400, parallelism=8)
oauth = OAuth()
mail = Mail()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    # storage_uri="redis://redis:6379/0",
    default_limits=["200 per day", "50 per hour"]
)
login_manager.login_view = "auth.login"
login_manager.session_protection = "strong"