from datetime import datetime
from flask_login import UserMixin
from extensions import db


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    contact = db.Column(db.String(50))
    address = db.Column(db.String(255))
    

class Rental(db.Model):
    __tablename__ = "rentals"

    id = db.Column(db.Integer, primary_key=True)

    product_id = db.Column(db.Integer, db.ForeignKey("products.id"))
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"))

    start_date = db.Column(db.Date)
    return_date = db.Column(db.Date)

    monthly_rate = db.Column(db.Float)
    deposit = db.Column(db.Float)

    status = db.Column(db.String(50), default="Active")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    product = db.relationship("Product")
    customer = db.relationship("Customer")