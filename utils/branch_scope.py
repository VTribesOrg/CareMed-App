from contextlib import contextmanager

from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

from extensions import db
from models.branch import BranchScoped

# Key used on ``session.info`` to hold the active branch id.
_BRANCH_KEY = "caremed_branch_id"
_FILTER_KEY = "caremed_branch_filter"


def _session():
    return db.session


def get_active_branch_id():
    """Return the id of the branch currently in context, or ``None``."""
    return _session().info.get(_BRANCH_KEY)


def branch_filter_active() -> bool:
    """True when query filtering / row stamping should happen."""
    info = _session().info
    return bool(info.get(_FILTER_KEY)) and info.get(_BRANCH_KEY) is not None


def set_active_branch(branch_id, enable_filter: bool = True):
    """Activate a branch for the current session.

    Returns an opaque token that must be passed to :func:`reset_active_branch`
    when the context ends (typically in ``teardown_request``).
    """
    info = _session().info
    token = (info.get(_BRANCH_KEY), info.get(_FILTER_KEY))
    info[_BRANCH_KEY] = branch_id
    info[_FILTER_KEY] = bool(enable_filter) and branch_id is not None
    return token


def reset_active_branch(token):
    """Undo a previous :func:`set_active_branch` call."""
    info = _session().info
    if token:
        prev_branch, prev_filter = token
        info[_BRANCH_KEY] = prev_branch
        info[_FILTER_KEY] = prev_filter
    else:
        info.pop(_BRANCH_KEY, None)
        info.pop(_FILTER_KEY, None)


@contextmanager
def bypass_branch_filter():
    """Temporarily disable isolation (developer console, backfills, reports).

    Example::

        with bypass_branch_filter():
            all_products = Product.query.all()   # every branch
    """
    info = _session().info
    prev = info.get(_FILTER_KEY)
    info[_FILTER_KEY] = False
    try:
        yield
    finally:
        info[_FILTER_KEY] = prev


@contextmanager
def use_branch(branch_id):
    """Run a block explicitly scoped to another branch."""
    token = set_active_branch(branch_id, enable_filter=True)
    try:
        yield
    finally:
        reset_active_branch(token)


# ── SQLAlchemy session events ────────────────────────────────────────────
def _install_events():
    @event.listens_for(Session, "do_orm_execute")
    def _apply_branch_filter(execute_state):  # noqa: ANN001
        if execute_state.execution_options.get("skip_branch_filter"):
            return
        if not execute_state.is_select:
            return
        if execute_state.is_column_load or execute_state.is_relationship_load:
            return
        if not branch_filter_active():
            return

        branch_id = execute_state.session.info.get(_BRANCH_KEY)
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                BranchScoped,
                lambda cls: cls.branch_id == branch_id,
                include_aliases=True,
            )
        )

    @event.listens_for(Session, "before_flush")
    def _stamp_branch_on_new(session, flush_context, instances):  # noqa: ANN001
        if not branch_filter_active():
            return
        branch_id = session.info.get(_BRANCH_KEY)
        for obj in session.new:
            if isinstance(obj, BranchScoped) and getattr(obj, "branch_id", None) is None:
                obj.branch_id = branch_id


_install_events()