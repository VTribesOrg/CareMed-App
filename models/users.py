from datetime import datetime
from flask_login import UserMixin
from extensions import db

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.Text)
    
    first_name = db.Column(db.String(100)) 
    last_name = db.Column(db.String(100))
    
    profile_path = db.Column(db.String(255), nullable=True)
    
    role = db.Column(db.String(20), default="customer") 
    
    google_id = db.Column(db.String(255), unique=True)
    oauth_provider = db.Column(db.String(50))
    
    is_verified = db.Column(db.Boolean, default=False)
    email_verified_at = db.Column(db.DateTime)
    failed_login_attempts = db.Column(db.Integer, default=0)
    account_locked_until = db.Column(db.DateTime)
    lock_reason = db.Column(db.String(255))
    
    reset_otp_code = db.Column(db.String(255), nullable=True)
    reset_code_expiry = db.Column(db.DateTime, nullable=True)
    last_otp_sent = db.Column(db.DateTime, nullable=True)
    
    last_login_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer_profile = db.relationship("Customer", back_populates="user", uselist=False, foreign_keys="[Customer.user_id]")