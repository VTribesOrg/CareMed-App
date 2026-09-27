from datetime import datetime

from extensions import db


class DashboardCardSetting(db.Model):

    __tablename__ = "dashboard_card_settings"

    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    card_key = db.Column(db.String(40), nullable=False)
    is_visible = db.Column(db.Boolean, default=False, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        db.UniqueConstraint(
            "branch_id", "card_key", name="uq_dashboard_card_branch_key"
        ),
    )

    def __repr__(self):
        return (
            f"<DashboardCardSetting branch={self.branch_id} "
            f"{self.card_key} visible={self.is_visible}>"
        )
