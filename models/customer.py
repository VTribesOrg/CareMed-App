from datetime import datetime
from extensions import db

class Customer(db.Model):
    __tablename__ = "customer"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    
    birthday = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(20), nullable=True) 

    contact_number = db.Column(db.String(50), nullable=True)
    home_address = db.Column(db.String(255), nullable=True)
    
    primary_id_type = db.Column(db.String(50), nullable=True)
    secondary_id_type = db.Column(db.String(50), nullable=True)
    
    valid_id_path = db.Column(db.String(255), nullable=True) 
    secondary_id_path = db.Column(db.String(255), nullable=True) 
    
    id_uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_id_verified = db.Column(db.Boolean, default=False, nullable=False)

    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


    creator = db.relationship("User", foreign_keys=[created_by_id])
    user = db.relationship("User", back_populates="customer_profile", uselist=False, foreign_keys=[user_id])
    purchases = db.relationship("Purchase", back_populates="customer", cascade="all, delete-orphan")
    rentals = db.relationship("Rental", back_populates="customer", cascade="all, delete-orphan")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
