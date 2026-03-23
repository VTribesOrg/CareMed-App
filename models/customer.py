from datetime import datetime
from extensions import db

class Customer(db.Model):
    __tablename__ = "customer"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    name = db.Column(db.String(150), nullable=False)
    contact = db.Column(db.String(50))
    address = db.Column(db.String(255))
    
    user = db.relationship("User", back_populates="customer_profile")
    purchases = db.relationship("Purchase", back_populates="customer")
    rentals = db.relationship("Rental", back_populates="customer")