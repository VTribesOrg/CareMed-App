from extensions import db
from datetime import datetime


class Product(db.Model):
    __tablename__ = "product"

    id = db.Column(db.Integer, primary_key=True)
    asset_tag = db.Column(db.String(20), nullable=True, unique=True)
    equipment_type = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True) 
    stock = db.Column(db.Integer, default=0)
    sale_price = db.Column(db.Numeric(10, 2), nullable=True)
    rent_price = db.Column(db.Numeric(10, 2), nullable=True)
    image = db.Column(db.String(255))
    status = db.Column(db.String(50), default="Available")
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    stock_empty = db.Column(db.Integer, default=0) 
    is_refillable = db.Column(db.Boolean, default=False) 
    
    category = db.Column(db.String(50), nullable=True) 

    purchases = db.relationship("Purchase", back_populates="product")
    rentals = db.relationship("Rental", back_populates="product")
    inventory_logs = db.relationship("InventoryLog", back_populates="product", passive_deletes=True)


class Purchase(db.Model):
    __tablename__ = "purchase"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transaction.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id", ondelete="SET NULL"), nullable=True)

    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2))
    total_price = db.Column(db.Numeric(10, 2))
    warranty_or_notes = db.Column(db.Text, nullable=True) 
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    transaction = db.relationship("Transaction", back_populates="purchases")
    product = db.relationship("Product", back_populates="purchases")
    customer = db.relationship("Customer", back_populates="purchases")


class Rental(db.Model):
    __tablename__ = "rental"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transaction.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"))
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"))

    start_date = db.Column(db.Date, nullable=False)
    expected_return_date = db.Column(db.Date, nullable=False) 
    actual_return_date = db.Column(db.Date, nullable=True) 

    monthly_rate = db.Column(db.Numeric(10, 2))
    deposit_amount = db.Column(db.Numeric(10, 2))
    deposit_status = db.Column(db.String(20), default="Held") 
    late_fees_incurred = db.Column(db.Numeric(10, 2), default=0.00)

    status = db.Column(db.String(50), default="Active")
    return_condition_notes = db.Column(db.Text)
    
    is_deposit_refunded = db.Column(db.Boolean, default=False)
    delivery_fee = db.Column(db.Numeric(10, 2), default=0.00)
    
    return_condition_img = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    transaction = db.relationship("Transaction", back_populates="rentals")
    product = db.relationship("Product", back_populates="rentals")
    customer = db.relationship("Customer", back_populates="rentals")
    

class Transaction(db.Model):
    __tablename__ = "transaction"

    id = db.Column(db.Integer, primary_key=True)
    reference_no = db.Column(db.String(36), unique=True, nullable=False, index=True)
    
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id", ondelete="SET NULL"), nullable=True)
    customer_name = db.Column(db.String(255))
    processed_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    transaction_type = db.Column(db.String(20), nullable=False) 
    
    total_amount = db.Column(db.Numeric(10, 2), default=0.00)
    amount_paid = db.Column(db.Numeric(10, 2), default=0.00)
    balance_due = db.Column(db.Numeric(10, 2), default=0.00)
    
    payment_status = db.Column(db.String(50), default="Unpaid") 
    status = db.Column(db.String(20), default="Open")
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    customer = db.relationship("Customer", back_populates="transactions")
    admin = db.relationship("User", backref="processed_transactions")
    purchases = db.relationship("Purchase", back_populates="transaction", cascade="all, delete-orphan")
    rentals = db.relationship("Rental", back_populates="transaction", cascade="all, delete-orphan")
    
    payments = db.relationship("Payment", back_populates="transaction")
    fulfillment_type = db.Column(db.String(20), default="Pickup") 
    delivery_status = db.Column(db.String(20), default="N/A") 
    delivery_address = db.Column(db.Text, nullable=True)
    landmark = db.Column(db.String(255), nullable=True) 
    
    

class InventoryLog(db.Model):
    __tablename__ = "inventory_logs"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id", ondelete="SET NULL"), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=True)
    note = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp(), nullable=False)

    product = db.relationship("Product", back_populates="inventory_logs")
    user = db.relationship("User", backref=db.backref("inventory_logs", lazy="dynamic"))
    
    
class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transaction.id"), nullable=False)
    
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    reference_number = db.Column(db.String(100), unique=True, index=True) 
    receipt_image_path = db.Column(db.String(255))
    
    status = db.Column(db.String(20), default="Pending") 
    verified_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    verified_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    transaction = db.relationship("Transaction", back_populates="payments")
    verified_by = db.relationship("User", foreign_keys=[verified_by_id])
    
    
class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.String(255))
    attachment_path = db.Column(db.String(255)) 
    
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    date_incurred = db.Column(db.Date, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)