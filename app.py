import os
from flask import Flask, request, redirect, url_for, flash, render_template, abort
from flask_login import current_user
from extensions import db, migrate, login_manager, oauth, mail, csrf, limiter
from models.users import User
from models.customer import Customer
from models.product import Product, Purchase, Rental, InventoryLog
from flask_talisman import Talisman
from models.users import SecurityLog, BlockedIP
from apscheduler.schedulers.background import BackgroundScheduler
import atexit

app = Flask(__name__)

if os.environ.get('FLASK_ENV') == 'development':
    app.config.from_object('config.DevConfig')
else:
    app.config.from_object('config.Config')

db.init_app(app)
migrate.init_app(app, db)
login_manager.init_app(app)
oauth.init_app(app)
mail.init_app(app)
csrf.init_app(app)
limiter.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, user_id)


login_manager.login_view = 'auth.login'

csp = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "https://cdnjs.cloudflare.com", "https://www.gstatic.com"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
    "img-src": ["'self'", "data:", "https://www.google.com", "https://*.googleusercontent.com"],
    "connect-src": ["'self'"],
    "frame-ancestors": ["'self'"],
    "object-src": ["'none'"]
}
Talisman(
    app,
    content_security_policy=csp,
    content_security_policy_nonce_in=["script-src"],
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,
    strict_transport_security_include_subdomains=True,
    session_cookie_secure=False,
    session_cookie_http_only=True,
    frame_options="SAMEORIGIN",
)


# IDS: Block requests from blocked IPs before they reach any route 
@app.before_request
def check_blocked_ip():
    ip = request.remote_addr
    blocked = BlockedIP.query.filter_by(ip_address=ip, is_active=True).first()
    if blocked:
        from datetime import datetime
        if blocked.blocked_until and blocked.blocked_until < datetime.utcnow():
            # Temporary block has expired — deactivate it
            blocked.is_active = False
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
        else:
            abort(403)


# Rate-limit handler: log to IDS + return user-friendly response 
@app.errorhandler(429)
def ratelimit_handler(e):
    try:
        new_log = SecurityLog(
            ip_address=request.remote_addr,
            event_type="Rate Limit Violation",
            description=f"IDS: IP hit rate limit at endpoint '{request.endpoint}'",
            user_agent=request.headers.get('User-Agent', 'Unknown')[:255],
            severity='High',
            is_suspicious=True
        )
        db.session.add(new_log)
        db.session.commit()
    except Exception as err:
        print(f"IDS logging failed: {err}")
        db.session.rollback()

    import time
    server_time = int(time.time()) 

    if request.endpoint == "auth.login":
        message = "Too many login attempts were made from your IP address. For your security, please wait 5 minutes before trying again."
        back_url = url_for("auth.login")
        back_label = "Back to Login"
    else:
        message = "Our system detected an unusual number of requests from your IP address. Access has been temporarily restricted to protect the platform."
        back_url = url_for("user.homepage")
        back_label = "Return to Home"

    return render_template(
        'errors/429.html',
        message=message,
        back_url=back_url,
        back_label=back_label
    ), 429

@app.template_filter('currency')
def currency(value):
    from decimal import Decimal
    try:
        value = value or Decimal("0.00")
        return f"₱{value:,.2f}"
    except Exception:
        return "₱0.00"
    
@app.route('/')
def root():
    if current_user.is_authenticated:
        if current_user.role == 'Administrator':
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('user.products'))
    return redirect(url_for('user.homepage'))


from routes.user_routes import user_bp
app.register_blueprint(user_bp)

from routes.auth_routes import auth_bp
app.register_blueprint(auth_bp)

from routes.admin_routes import admin_bp
app.register_blueprint(admin_bp)

# ── Auto Backup Scheduler ──────────────────────
from utils.backup import auto_backup
if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=auto_backup,
        trigger='cron',
        hour=0,
        minute=0,
        id='daily_backup',
        replace_existing=True
    )
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown())
    print("[Backup] Scheduler started — auto backup runs every midnight")


if __name__ == "__main__":
    debug = os.environ.get("DEBUG", "False") == "True"
    app.run(debug=debug)