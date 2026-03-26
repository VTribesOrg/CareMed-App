from extensions import db


class Product(db.Model):
    __tablename__ = "product"

    id = db.Column(db.Integer, primary_key=True)
    asset_tag = db.Column(db.String(20), nullable=True, unique=True)
    equipment_type = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True) 
    stock = db.Column(db.Integer, default=0)
    sale_price = db.Column(db.Numeric(10, 2), nullable=False)
    rent_price = db.Column(db.Numeric(10, 2), nullable=False)
    image = db.Column(db.String(255))
    status = db.Column(db.String(50), default="Available")
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

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
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id", ondelete="SET NULL"), nullable=True)

    start_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date) 
    monthly_rate = db.Column(db.Numeric(10, 2))
    deposit = db.Column(db.Numeric(10, 2))
    status = db.Column(db.String(50), default="Active")
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    transaction = db.relationship("Transaction", back_populates="rentals")
    product = db.relationship("Product", back_populates="rentals")
    customer = db.relationship("Customer", back_populates="rentals")
    

class Transaction(db.Model):
    __tablename__ = "transaction"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id", ondelete="SET NULL"), nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    transaction_type = db.Column(db.String(20), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), default=0.00)
    payment_status = db.Column(db.String(50), default="Pending") 
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    customer = db.relationship("Customer", back_populates="transactions")
    admin = db.relationship("User", backref="processed_transactions")
    purchases = db.relationship("Purchase", back_populates="transaction")
    rentals = db.relationship("Rental", back_populates="transaction")
    
    

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