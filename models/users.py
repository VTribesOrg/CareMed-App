import uuid
from datetime import datetime
from flask_login import UserMixin
from extensions import db


class User(UserMixin, db.Model):

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(120), unique=True, nullable=False, index=True)

    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))

    phone = db.Column(db.String(20))
    address = db.Column(db.String(255))

    password_hash = db.Column(db.Text)

    google_id = db.Column(db.String(255), unique=True)
    oauth_provider = db.Column(db.String(50))

    profile_path = db.Column(db.String(255))
     
    is_verified = db.Column(db.Boolean, default=False)
    email_verified_at = db.Column(db.DateTime)

    failed_login_attempts = db.Column(db.Integer, default=0)
    account_locked_until = db.Column(db.DateTime)
    lock_reason = db.Column(db.String(255))

    reset_otp_code = db.Column(db.String(255), nullable=True)
    reset_code_expiry = db.Column(db.DateTime, nullable=True)
    reset_attempts = db.Column(db.Integer, default=0)
    last_otp_sent = db.Column(db.DateTime, nullable=True)
    
    password_last_reset_at = db.Column(db.DateTime, nullable=True)

    role = db.Column(db.String(20), default="customer")

    last_login_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)