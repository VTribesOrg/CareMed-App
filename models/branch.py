from datetime import datetime

from sqlalchemy.orm import declared_attr

from extensions import db


class BranchScoped:

    @declared_attr
    def branch_id(cls):
        return db.Column(
            db.Integer,
            db.ForeignKey("branches.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        )


class Branch(db.Model):

    __tablename__ = "branches"

    id = db.Column(db.Integer, primary_key=True)

    branch_name = db.Column(db.String(120), nullable=False)
    location_code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    address = db.Column(db.Text, nullable=True)
    contact_number = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(120), nullable=True)

    theme_color = db.Column(db.String(20), nullable=False, default="#002347")
    accent_color = db.Column(db.String(20), nullable=False, default="#52B788")
    brand_name = db.Column(db.String(120), nullable=True)
    brand_logo = db.Column(db.String(255), nullable=True)
    tagline = db.Column(db.String(255), nullable=True)
    hero_title = db.Column(db.String(255), nullable=True)
    hero_subtitle = db.Column(db.Text, nullable=True)
    announcement = db.Column(db.Text, nullable=True)
    footer_text = db.Column(db.String(255), nullable=True)

    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    @property
    def display_name(self):
        return self.brand_name or self.branch_name

    @property
    def display_tagline(self):
        return self.tagline or "Medical Equipment Rental & Sales"

    def as_theme(self):
        """Return the values the templates need to theme this branch."""
        return {
            "id": self.id,
            "name": self.display_name,
            "branch_name": self.branch_name,
            "location_code": self.location_code,
            "theme_color": self.theme_color or "#002347",
            "accent_color": self.accent_color or "#52B788",
            "logo": self.brand_logo,
            "tagline": self.display_tagline,
            "hero_title": self.hero_title or self.display_name,
            "hero_subtitle": self.hero_subtitle or "",
            "announcement": self.announcement or "",
            "footer_text": self.footer_text
            or f"CareMed {self.display_name}",
            "contact_number": self.contact_number,
            "email": self.email,
            "address": self.address,
        }

    def __repr__(self):
        return f"<Branch {self.location_code} - {self.branch_name}>"