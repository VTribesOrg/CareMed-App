from datetime import datetime
from extensions import db

class Product(db.Model):
    __tablename__ = "product"

    id = db.Column(db.Integer, primary_key=True)
    asset_tag = db.Column(db.String(20), nullable=True, unique=True)
    equipment_type = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    stock = db.Column(db.Integer, default=0)
    
    sale_price = db.Column(db.Numeric(10, 2), nullable=False)
    rent_price = db.Column(db.Numeric(10, 2), nullable=False)
    
    image = db.Column(db.String(255))
    status = db.Column(db.String(50), default="Available")
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    purchases = db.relationship("Purchase", back_populates="product")
    rentals = db.relationship("Rental", back_populates="product")

class Purchase(db.Model):
    __tablename__ = "purchase"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"))
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"))

    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2))
    total_price = db.Column(db.Numeric(10, 2))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    product = db.relationship("Product", back_populates="purchases")
    customer = db.relationship("Customer", back_populates="purchases")

class Rental(db.Model):
    __tablename__ = "rental"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"))
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"))

    start_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date) 
    monthly_rate = db.Column(db.Numeric(10, 2))
    deposit = db.Column(db.Numeric(10, 2))
    
    status = db.Column(db.String(50), default="Active")
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    product = db.relationship("Product", back_populates="rentals")
    customer = db.relationship("Customer", back_populates="rentals")

class InventoryLog(db.Model):
    __tablename__ = "inventory_logs"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"))
    action = db.Column(db.String(100)) 
    quantity = db.Column(db.Integer)
    note = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    product = db.relationship("Product")