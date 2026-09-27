from extensions import db
from models.dashboard_card import DashboardCardSetting


# Each card lists the ``/admin/dashboard/data`` fields it consumes. A field is
# only dropped from the JSON when every card that consumes it is hidden, so
# hiding one card cannot starve another card that shares the same number.
DASHBOARD_CARDS = (
    {
        "key": "overall_income",
        "label": "Overall Income + Net Profit",
        "hint": "Combined sales, rentals and refills, with net profit after expenses.",
        "fields": ("total_sales", "total_freight", "total_rentals",
                   "total_refill_income", "total_expenses"),
    },
    {
        "key": "sales_profit",
        "label": "Total Profit Sold + Net Profit Income",
        "hint": "Freight-adjusted sales figure and its gross/freight breakdown.",
        "fields": ("total_sales", "total_freight", "sales_net"),
    },
    {
        "key": "refill_income",
        "label": "Total Refill Income + Tanks Refilled",
        "hint": "Refill revenue and the number of tanks refilled.",
        "fields": ("total_refill_income", "total_refill_profit",
                   "total_refills_count"),
    },
    {
        "key": "rentals_income",
        "label": "Total Rentals Income",
        "hint": "Gross rental income for the selected range.",
        "fields": ("total_rentals",),
    },
    {
        "key": "rental_share",
        "label": "30% of Rental Income",
        "hint": "The split figure shown beside Total Rentals Income.",
        "fields": ("total_rentals",),
    },
    {
        "key": "expenses",
        "label": "Total Expenses",
        "hint": "All expenses recorded in the selected range.",
        "fields": ("total_expenses",),
    },
    {
        "key": "active_rentals",
        "label": "Active Rentals Units",
        "hint": "Units currently out on rent.",
        "fields": ("active_rentals_count",),
    },
    {
        "key": "inventory",
        "label": "Total Inventory",
        "hint": "Stock on hand plus the low-stock warning line.",
        "fields": ("total_inventory", "low_stock_count"),
    },
    {
        "key": "deposits",
        "label": "Customer Deposits",
        "hint": "Held deposits that are still refundable.",
        "fields": ("customer_deposits",),
    },
    {
        "key": "freight",
        "label": "Total Freight Expense",
        "hint": "Freight cost incurred in the selected range.",
        "fields": ("total_freight",),
    },
    {
        "key": "commission",
        "label": "Total Commission + Formula Breakdown",
        "hint": "30% rentals + refills x 100 + 50% sales.",
        "fields": ("total_sales", "total_rentals", "total_refills_count",
                   "total_freight"),
    },
    {
        "key": "oxygen_tracking",
        "label": "Oxygen Tank Tracking table",
        "hint": "Tank totals, rented, full and empty per variant.",
        "fields": ("tank_statuses",),
    },
    {
        "key": "standard_assets",
        "label": "Standard Equipment table",
        "hint": "Units per rental item, split by condition.",
        "fields": ("standard_assets",),
    },
)


ALL_CARD_KEYS = tuple(card["key"] for card in DASHBOARD_CARDS)

_CARDS_USING_FIELD = {}
for _card in DASHBOARD_CARDS:
    for _field in _card["fields"]:
        _CARDS_USING_FIELD.setdefault(_field, set()).add(_card["key"])


def hidden_card_keys(branch_id):
    """The card keys ``branch_id`` has switched off. Empty when unset."""
    if not branch_id:
        return set()
    rows = (
        DashboardCardSetting.query
        .filter_by(branch_id=branch_id, is_visible=False)
        .all()
    )
    return {row.card_key for row in rows}


def visible_card_keys(branch_id):
    """Keys the branch may render — every card unless it was hidden."""
    return {key for key in ALL_CARD_KEYS if key not in hidden_card_keys(branch_id)}


def card_options(branch_id):
    """Rows for the Edit Branch checkbox grid."""
    hidden = hidden_card_keys(branch_id)
    return [
        {**card, "checked": card["key"] not in hidden}
        for card in DASHBOARD_CARDS
    ]


def set_visible_cards(branch_id, visible_keys):
    """Replace the branch's hidden set with the complement of ``visible_keys``.

    Unrecognised keys are ignored so a stale form can never invent a card.
    """
    chosen = {key for key in (visible_keys or ()) if key in ALL_CARD_KEYS}
    DashboardCardSetting.query.filter_by(branch_id=branch_id).delete()
    for key in ALL_CARD_KEYS:
        if key not in chosen:
            db.session.add(
                DashboardCardSetting(
                    branch_id=branch_id, card_key=key, is_visible=False
                )
            )


def filter_dashboard_payload(payload, branch_id):
    """Drop JSON fields whose consuming cards are all hidden for the branch."""
    hidden = hidden_card_keys(branch_id)
    if not hidden:
        return payload
    visible = {key for key in ALL_CARD_KEYS if key not in hidden}
    return {
        field: value
        for field, value in payload.items()
        if field not in _CARDS_USING_FIELD
        or bool(_CARDS_USING_FIELD[field] & visible)
    }
