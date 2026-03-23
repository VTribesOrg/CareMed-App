from datetime import datetime
from extensions import db

class Customer(db.Model):
    __tablename__ = "customer"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    contact_number = db.Column(db.String(50))
    home_address = db.Column(db.String(255))
    
    valid_id_path = db.Column(db.String(255), nullable=True)
    id_uploaded_at = db.Column(db.DateTime, nullable=True)
    is_id_verified = db.Column(db.Boolean, default=False) 
    

    user = db.relationship("User", back_populates="customer_profile")
    purchases = db.relationship("Purchase", back_populates="customer")
    rentals = db.relationship("Rental", back_populates="customer")