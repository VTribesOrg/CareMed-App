from datetime import datetime
from extensions import db

class Customer(db.Model):
    __tablename__ = "customer"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(20), nullable=True) 

    contact_number = db.Column(db.String(50), nullable=True)
    secondary_contact_number = db.Column(db.String(50), nullable=True)
    home_address = db.Column(db.String(255), nullable=True)
    
    primary_id_type = db.Column(db.String(50), nullable=True)
    secondary_id_type = db.Column(db.String(50), nullable=True)
    
    valid_id_path = db.Column(db.String(255), nullable=True) 
    secondary_id_path = db.Column(db.String(255), nullable=True) 
    proof_of_billing_path = db.Column(db.String(255), nullable=True)
    
    id_uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_id_verified = db.Column(db.Boolean, default=False, nullable=False)

    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    is_active = db.Column(db.Boolean, default=True)
    
    creator = db.relationship("User", foreign_keys=[created_by_id])
    user = db.relationship("User", back_populates="customer_profile", uselist=False, foreign_keys=[user_id])
    
    purchases = db.relationship("Purchase", back_populates="customer")
    rentals = db.relationship("Rental", back_populates="customer")
    transactions = db.relationship("Transaction", back_populates="customer")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def masked_phone(self):
        return self._mask_phone_logic(self.contact_number)

    @property
    def masked_secondary_phone(self):
        return self._mask_phone_logic(self.secondary_contact_number)

    def _mask_phone_logic(self, target_number):
        if not target_number:
            return None
        try:
            phone = target_number.strip()
            digits = ''.join(filter(str.isdigit, phone))
            if len(digits) <= 4:
                return '*' * len(digits)
            return digits[:2] + '*' * (len(digits) - 4) + digits[-2:]
        except Exception:
            return None