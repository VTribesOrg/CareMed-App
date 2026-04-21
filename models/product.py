from extensions import db
from datetime import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta

class Product(db.Model):
    __tablename__ = "product"

    id = db.Column(db.Integer, primary_key=True)
    asset_tag = db.Column(db.String(20), nullable=True, unique=True)
    equipment_type = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True) 
    stock = db.Column(db.Integer, default=0)
    
    transaction_type = db.Column(db.String(20), nullable=True, default="both") 
    rent_period = db.Column(db.String(20), nullable=True, default="Month")
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
    
    payments = db.relationship("Payment", back_populates="transaction", cascade="all, delete-orphan")
    
    fulfillment_type = db.Column(db.String(20), default="Pickup") 
    delivery_status = db.Column(db.String(20), default="N/A") 
    delivery_address = db.Column(db.Text, nullable=True)
    landmark = db.Column(db.String(255), nullable=True) 


    def update_totals(self):

            total_paid = sum(
                (Decimal(str(p.amount)) for p in self.payments if p.status == "Completed"),
                Decimal("0.00")
            )
            self.amount_paid = total_paid

            if self.transaction_type == "Rental":
                total_invoice_sum = Decimal("0.00")
                for rental in self.rentals:
                    for inv in rental.invoices:
                        total_invoice_sum += Decimal(str(inv.amount_due or 0)) + Decimal(str(inv.late_fee or 0))

                self.total_amount = total_invoice_sum
            
            current_total = Decimal(str(self.total_amount or 0))

            self.balance_due = max(current_total - total_paid, Decimal("0.00"))

            if total_paid <= 0:
                self.payment_status = "Unpaid"
            elif total_paid < current_total:
                self.payment_status = "Partially Paid"
            else:
                self.payment_status = "Fully Paid"

            if self.payment_status == "Fully Paid":
                if self.transaction_type == "Sale":
                    if self.fulfillment_type == "Delivery":
                        if self.delivery_status == "Delivered":
                            self.status = "Closed"
                    else:  # Pickup
                        if self.delivery_status in ["Picked Up", "N/A"]:
                            self.status = "Closed"

                elif self.transaction_type == "Rental":
                    if self.rentals and all(r.status == "Returned" for r in self.rentals):
                        all_invoices_paid = all(
                            all(inv.status == "Paid" for inv in r.invoices) 
                            for r in self.rentals
                        )
                        if all_invoices_paid:
                            self.status = "Closed"
            else:
                if self.status == "Closed":
                    self.status = "Open"
                        

class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transaction.id", ondelete="CASCADE"), nullable=False)
    invoice_id = db.Column(db.Integer, db.ForeignKey("rental_invoice.id"), nullable=True)
    
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
    rental_invoice = db.relationship("RentalInvoice", back_populates="payments")



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

    quantity = db.Column(db.Integer, nullable=False)
    
    status = db.Column(db.String(50), default="Active")
    return_condition_notes = db.Column(db.Text)
    
    is_deposit_refunded = db.Column(db.Boolean, default=False)
    delivery_fee = db.Column(db.Numeric(10, 2), default=0.00)
    
    return_condition_img = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    transaction = db.relationship("Transaction", back_populates="rentals")
    product = db.relationship("Product", back_populates="rentals")
    customer = db.relationship("Customer", back_populates="rentals")
    
    invoices = db.relationship("RentalInvoice", backref="rental", cascade="all, delete-orphan", lazy=True)

    def generate_monthly_invoices(self):

        current_period_start = self.start_date
        
        while current_period_start < self.expected_return_date:
            next_period_start = current_period_start + relativedelta(months=1)
            
            actual_period_end = next_period_start if next_period_start < self.expected_return_date else self.expected_return_date

            new_invoice = RentalInvoice(
                rental_id=self.id,
                service_period_start=current_period_start,
                service_period_end=actual_period_end,
                amount_due=self.monthly_rate,
                status="Unpaid"
            )
            db.session.add(new_invoice)

            current_period_start = next_period_start


class RentalInvoice(db.Model):
    __tablename__ = "rental_invoice"
    
    id = db.Column(db.Integer, primary_key=True)
    rental_id = db.Column(db.Integer, db.ForeignKey("rental.id"), nullable=False)
    
    service_period_start = db.Column(db.Date, nullable=False)
    service_period_end = db.Column(db.Date, nullable=False)
    
    amount_due = db.Column(db.Numeric(10, 2), nullable=False)
    late_fee = db.Column(db.Numeric(10, 2), default=0.00)
    status = db.Column(db.String(20), default="Unpaid") 
    
    payments = db.relationship("Payment", back_populates="rental_invoice", lazy=True)

    @property
    def total_invoice_value(self):
        return Decimal(str(self.amount_due)) + Decimal(str(self.late_fee or 0))

    @property
    def amount_paid(self):
        return sum(
            (Decimal(str(p.amount)) for p in self.payments if p.status == "Completed"),
            Decimal("0.00")
        )

    @property
    def remaining_balance(self):
        return max(self.total_invoice_value - self.amount_paid, Decimal("0.00"))
    
    
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
    
    
class Cart(db.Model):
    __tablename__ = "cart"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")
    user = db.relationship("User", backref=db.backref("cart", uselist=False))

class CartItem(db.Model):
    __tablename__ = "cart_item"
    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("cart.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    
    quantity = db.Column(db.Integer, default=1)
    item_type = db.Column(db.String(20), nullable=False) 
    
    rental_start_date = db.Column(db.Date, nullable=True)
    rental_duration = db.Column(db.Integer, nullable=True)
    price_at_addition = db.Column(db.Numeric(10, 2))

    cart = db.relationship("Cart", back_populates="items")
    product = db.relationship("Product")