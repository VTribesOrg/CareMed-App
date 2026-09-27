"""Fallback response for unexpected server errors (HTTP 500).

A 500 page is the one screen a user has to get right, so everything here is
written to survive the failure that triggered it:

* the database session is rolled back first, because an aborted transaction
  turns every later query into ``PendingRollbackError`` and the error page would
  never render;
* the IDS write and the template render are best effort - if either one fails
  the handler still answers with a hand-written HTML page;
* the fallback page reads nothing from the database, and the two global context
  processors in ``app.py`` degrade instead of raising, so a dead database cannot
  take the error page down with it.

The traceback always goes to the application log next to a short reference code
that is also shown to the user. Log files get busy and rotate, but "reference
4F9C2A7E" makes the exact traceback findable.
"""
import uuid

from flask import current_app, jsonify, render_template, request, url_for
from flask_login import current_user

from extensions import db

# Long enough to be unique in practice, short enough to read out over the phone.
REFERENCE_LENGTH = 8

# A browser marks every subrequest it makes with Sec-Fetch-Dest, which is how a
# fetch()/XHR call is told apart from a page navigation without asking every
# caller to set a header by hand.
_FETCH_DESTINATIONS = {"fetch", "xhr"}


def new_error_reference():
    """Short, human-readable id tying the page to the logged traceback."""
    return uuid.uuid4().hex[:REFERENCE_LENGTH].upper()


def reset_db_session():
    """Roll the failed transaction back so later work can still use the session.

    ``db.session.remove()`` is the fallback because a rollback can itself fail
    once the connection is gone; either way the teardown handler must not inherit
    a broken session.
    """
    try:
        db.session.rollback()
    except Exception:  # pragma: no cover - only reachable with a dead connection
        try:
            db.session.remove()
        except Exception:
            pass


def wants_json_response():
    """True when the caller is a script rather than a browser navigation.

    ``fetch()`` calls in this app read the body with ``response.json()``, so
    handing them an HTML page turns a recoverable failure into a JavaScript
    parse error. Detection is header based (``Sec-Fetch-Dest`` from the browser,
    ``X-Requested-With`` from older callers, JSON content type, or an Accept
    header that prefers JSON) and defaults to HTML.
    """
    if (request.headers.get("Sec-Fetch-Dest") or "").lower() in _FETCH_DESTINATIONS:
        return True
    if (request.headers.get("X-Requested-With") or "").lower() == "xmlhttprequest":
        return True
    if request.is_json:
        return True
    # Deliberately a substring test rather than ``best_match``: a bare
    # ``Accept: */*`` (curl, health checks) would otherwise match JSON first and
    # a caller expecting to render HTML would get JSON back.
    return "json" in (request.headers.get("Accept") or "").lower()


def _request_summary():
    """One-line description of the failing request for the log and IDS entry."""
    try:
        who = current_user.email if current_user.is_authenticated else "anonymous"
    except Exception:
        who = "unknown"
    return "{method} {path} | endpoint={endpoint} | user={who}".format(
        method=request.method,
        path=request.path,
        endpoint=request.endpoint or "unrouted",
        who=who,
    )


def log_server_error(error, reference):
    """Write the traceback to the application log - this one must never raise."""
    message = "UNHANDLED_EXCEPTION | ref={ref} | {summary} | {cls}: {msg}".format(
        ref=reference,
        summary=_request_summary(),
        cls=type(error).__name__,
        msg=error,
    )
    try:
        current_app.logger.error(message, exc_info=error)
    except Exception:  # pragma: no cover - logger is gone, nothing left to do
        print(message)


def record_incident(error, reference):
    """Mirror the failure into the IDS log so admins can see it in the UI.

    Best effort on purpose: the database may be the thing that broke, and a
    failed audit write must never replace the user's error page.
    """
    from models.users import SecurityLog

    try:
        db.session.add(SecurityLog(
            ip_address=request.remote_addr,
            event_type="Server Error",
            description="500 ref={} {} | {}: {}".format(
                reference, _request_summary(), type(error).__name__, error)[:255],
            user_id=current_user.id if current_user.is_authenticated else None,
            user_email=current_user.email if current_user.is_authenticated else None,
            user_agent=(request.headers.get("User-Agent") or "Unknown")[:255],
            severity="High",
            is_suspicious=False,
        ))
        db.session.commit()
    except Exception:
        reset_db_session()


def _home_url():
    """Where the "Return to Home" button points; never depend on routing state."""
    try:
        return url_for("user.homepage")
    except Exception:
        return "/"


def _minimal_html(reference):
    """Last resort page used when even ``errors/500.html`` cannot render."""
    return (
        "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1'>"
        "<title>CareMed | Service Error</title></head>"
        "<body style=\"margin:0;background:#0f172a;color:#f1f5f9;"
        "font-family:system-ui,-apple-system,'Segoe UI',sans-serif;"
        "display:flex;align-items:center;justify-content:center;min-height:100vh\">"
        "<div style='text-align:center;max-width:520px;padding:40px 24px'>"
        "<div style='font-size:4.5rem;font-weight:800;color:#f87171;line-height:1'>"
        "500</div>"
        "<h1 style='font-size:1.2rem;margin:8px 0 12px'>"
        "Something went wrong on our side</h1>"
        "<p style='color:#94a3b8;font-size:.9rem;line-height:1.7'>"
        "The request could not be completed. Please try again, and contact your "
        "branch administrator if it keeps happening.</p>"
        "<p style='color:#64748b;font-size:.78rem'>Reference: {ref}</p>"
        "<a href='/' style='display:inline-block;margin-top:8px;padding:12px 28px;"
        "border-radius:8px;background:#f87171;color:#0f172a;font-weight:700;"
        "text-decoration:none'>Return to Home</a>"
        "</div></body></html>"
    ).format(ref=reference)


def _html_response(reference):
    try:
        return render_template(
            "errors/500.html",
            error_reference=reference,
            home_url=_home_url(),
        )
    except Exception:
        # A broken template must not become a blank screen.
        current_app.logger.exception(
            "ERROR_TEMPLATE_FAILED | ref=%s | falling back to inline page", reference
        )
        return _minimal_html(reference)


def server_error_response(error):
    """Build the 500 response for any unexpected failure.

    Returns JSON for API callers (so ``response.json()`` still works) and the
    branded fallback page for browsers - in both cases with the same reference
    code that leads to the logged traceback.
    """
    # Flask wraps unhandled exceptions in InternalServerError and keeps the real
    # one on ``original_exception``; the log and IDS entry must name the cause.
    original = getattr(error, "original_exception", None) or error
    reference = new_error_reference()

    reset_db_session()
    log_server_error(original, reference)
    record_incident(original, reference)
    reset_db_session()

    if wants_json_response():
        return jsonify({
            "success": False,
            "error": "internal_server_error",
            # No promise about what did or did not reach the database: a 500 can
            # fire after some work has already been committed. The html page
            # words the same caution as "check whether it went through".
            "message": ("The server could not complete this request. Check "
                        "whether the change went through before retrying."),
            "error_reference": reference,
        }), 500

    return (
        _html_response(reference),
        500,
        {"Content-Type": "text/html; charset=utf-8",
         "X-Error-Reference": reference},
    )
