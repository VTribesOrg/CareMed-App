"""One-off helper to bring existing data under branch isolation.

Run it once, from a Flask shell or a management command::

    from utils.branch_backfill import backfill_default_branch
    backfill_default_branch(name="Main Branch", location_code="MAIN")

    other option:
from app import app
from utils.branch_backfill import backfill_default_branch

# Wrap execution inside the Flask application context
with app.app_context():
    print("Starting branch backfill...")
    summary = backfill_default_branch(name="Main Branch", location_code="MAIN")
    print("Backfill completed successfully!")
    print("Summary:", summary)

It is idempotent: running it again only fills rows that are still unscoped.
"""

from extensions import db
from models.branch import Branch
from models.users import User
from models.customer import Customer
from models.product import (
    Product,
    Purchase,
    Transaction,
    Payment,
    CustomerDeposit,
    Rental,
    RentalInvoice,
    InventoryLog,
    Expense,
)
from models.product import PaymentProof
from models.product import TankStatus
from utils.branch_scope import bypass_branch_filter


# Every model that carries a branch_id.
SCOPED_MODELS = [
    User,
    Customer,
    Product,
    Purchase,
    Transaction,
    Payment,
    CustomerDeposit,
    Rental,
    RentalInvoice,
    InventoryLog,
    Expense,
    PaymentProof,
    TankStatus,
]


def ensure_default_branch(
    name: str = "Main Branch",
    location_code: str = "MAIN",
    **branding,
) -> Branch:
    """Return the default branch, creating it if it does not exist yet."""
    with bypass_branch_filter():
        branch = Branch.query.filter_by(location_code=location_code).first()
        if branch:
            return branch

        branch = Branch(
            branch_name=name,
            location_code=location_code,
            brand_name=name,
            tagline=branding.get("tagline"),
            theme_color=branding.get("theme_color", "#002347"),
            accent_color=branding.get("accent_color", "#52B788"),
            is_active=True,
        )
        db.session.add(branch)
        db.session.commit()
        return branch


def backfill_default_branch(
    name: str = "Main Branch",
    location_code: str = "MAIN",
    **branding,
) -> dict:
    """Assign all currently unscoped rows to the default branch.

    Returns a summary ``{model_name: rows_updated}``.
    """
    with bypass_branch_filter():
        branch = ensure_default_branch(name, location_code, **branding)
        summary = {}

        for model in SCOPED_MODELS:
            updated = (
                model.query.filter(model.branch_id.is_(None))
                .update(
                    {model.branch_id: branch.id},
                    synchronize_session=False,
                )
            )
            summary[model.__name__] = updated

        db.session.commit()
        summary["_branch_id"] = branch.id
        return summary