from datetime import datetime
from flask_login import UserMixin
from extensions import db


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    asset_tag = db.Column(db.String(50), unique=True, nullable=False)
    equipment_type = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)

    stock = db.Column(db.Integer, default=0)

    sale_price = db.Column(db.Float, nullable=False)
    rent_price = db.Column(db.Float, nullable=False)

    image = db.Column(db.String(255))

    status = db.Column(db.String(50), default="Available")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    
class Purchase(db.Model):
    __tablename__ = "purchases"

    id = db.Column(db.Integer, primary_key=True)

    product_id = db.Column(db.Integer, db.ForeignKey("products.id"))
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"))

    quantity = db.Column(db.Integer)
    unit_price = db.Column(db.Float)
    total_price = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    product = db.relationship("Product")
    customer = db.relationship("Customer")
    
class InventoryLog(db.Model):
    __tablename__ = "inventory_logs"

    id = db.Column(db.Integer, primary_key=True)

    product_id = db.Column(db.Integer, db.ForeignKey("products.id"))

    action = db.Column(db.String(100))  

    quantity = db.Column(db.Integer)
    note = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    product = db.relationship("Product")