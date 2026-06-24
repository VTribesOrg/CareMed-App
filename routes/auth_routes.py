from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from argon2.exceptions import VerifyMismatchError
from extensions import db, passhasher, oauth, mail, limiter, get_remote_address
from flask_mail import Message
from models.users import User, SecurityLog, BlockedIP
from models.customer import Customer
from datetime import datetime, timedelta
from forms.auth_forms import RegisterForm, LoginForm, ResetPasswordForm
from utils.security import generate_reset_token, verify_reset_token, email_verification_token, verify_email_token
import os
import re
import secrets


auth_bp = Blueprint("auth", __name__)


google = oauth.register(
    name="google",
    client_id=os.environ["GOOGLE_CLIENT_ID"],
    client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    api_base_url="https://www.googleapis.com/oauth2/v2/",
    client_kwargs={"scope": "openid email profile"}
)

RESET_LINK_EXPIRY = 3600
OTP_RESEND_COOLDOWN = 60  

def login_key():
    return request.remote_addr

BOT_PATTERNS = [
    'python-requests', 'curl', 'wget', 'httpie',
    'scrapy', 'bot', 'crawler', 'spider'
]

def is_strong_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, "OK"

def check_bot_user_agent():
    user_agent = request.headers.get('User-Agent', '').strip()

    if not user_agent:
        log_security_event(
            "Bot Detected",
            "Request with empty User-Agent string on login",
            is_suspicious=True,
            severity='High'
        )
        return True

    ua_lower = user_agent.lower()
    for pattern in BOT_PATTERNS:
        if pattern in ua_lower:
            log_security_event(
                "Bot Detected",
                f"Automated tool detected on login — User-Agent: {user_agent[:255]}",
                is_suspicious=True,
                severity='High'
            )
            return True

    return False

def create_customer_for_user(user):
    if not user.customer_profile:
        customer = Customer(
            user_id=user.id,
            name=f"{user.first_name or ''} {user.last_name or ''}".strip()
        )
        db.session.add(customer)

from datetime import datetime, timedelta # Ensure timedelta is imported

def log_security_event(event_type, description, user=None, is_suspicious=False, severity='Low'):
    """Log a security event with auto-block and email alert."""
    try:
        from models.users import SecurityLog, BlockedIP
        from extensions import db

        ip = request.remote_addr
        user_agent = request.headers.get('User-Agent', 'Unknown')[:255]

        entry = SecurityLog(
            ip_address=ip,
            event_type=event_type,
            description=description,
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            user_agent=user_agent,
            severity=severity,
            is_suspicious=is_suspicious
        )
        db.session.add(entry)
        db.session.commit()

        # Auto-block if 5+ suspicious events from same IP in 10 minutes
        if is_suspicious:
            cutoff = datetime.utcnow() - timedelta(minutes=10)
            recent_suspicious = SecurityLog.query.filter(
                SecurityLog.ip_address == ip,
                SecurityLog.is_suspicious == True,
                SecurityLog.created_at >= cutoff
            ).count()

            if recent_suspicious >= 5:
                # ── FIXED: upsert instead of insert to avoid duplicate key error ──
                existing_block = BlockedIP.query.filter_by(ip_address=ip).first()
                if existing_block:
                    existing_block.is_active = True
                    existing_block.reason = f"Auto-blocked: {recent_suspicious} suspicious events in 10 minutes"
                    existing_block.blocked_until = datetime.utcnow() + timedelta(hours=1)
                    existing_block.blocked_at = datetime.utcnow()
                    existing_block.blocked_by = None
                else:
                    block = BlockedIP(
                        ip_address=ip,
                        reason=f"Auto-blocked: {recent_suspicious} suspicious events in 10 minutes",
                        blocked_until=datetime.utcnow() + timedelta(hours=1),
                        is_active=True
                    )
                    db.session.add(block)

                auto_log = SecurityLog(
                    ip_address=ip,
                    event_type="Auto-Block Triggered",
                    description=f"IP auto-blocked after {recent_suspicious} suspicious events",
                    user_agent=user_agent,
                    severity='Critical',
                    is_suspicious=True
                )
                db.session.add(auto_log)
                db.session.commit()

                # Send alert email to admin
                try:
                    admin_email = current_app.config.get('MAIL_USERNAME')
                    if admin_email:
                        msg = Message(
                            subject="[CareMed IDS Alert] Suspicious IP Auto-Blocked",
                            sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
                            recipients=[admin_email]
                        )
                        msg.body = f"""
CareMed Intrusion Detection System - ALERT
==========================================
Action     : IP Address Auto-Blocked
IP Address : {ip}
Reason     : {recent_suspicious} suspicious events in 10 minutes
Last Event : {event_type}
Description: {description}
User       : {user.email if user else 'Unknown'}
User Agent : {user_agent}
Time       : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC

Please review the Security Center: /admin/security
                        """
                        mail.send(msg)
                except Exception as mail_err:
                    current_app.logger.warning(f"[IDS] Alert email failed: {mail_err}")

    except Exception as err:
        current_app.logger.error(f"[IDS] Logging failed: {err}")
        try:
            db.session.rollback()
        except Exception:
            pass


@auth_bp.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per 5 minute", key_func=login_key, methods=["POST"])
def login():
    form = LoginForm()
    now = datetime.utcnow()

    if request.method == "POST":
        check_bot_user_agent()

    email_value = session.pop('login_email', '') if request.method == "GET" else ''

    if form.validate_on_submit():
        email = form.email.data.strip().lower()
        password = form.password.data

        user = User.query.filter_by(email=email).first()

        # -- Unknown email
        if not user:
            passhasher.hash("dummy_password")

            cutoff = datetime.utcnow() - timedelta(minutes=10)
            recent_attempts = SecurityLog.query.filter(
                SecurityLog.ip_address == request.remote_addr,
                SecurityLog.event_type == "Failed Login",
                SecurityLog.created_at >= cutoff
            ).count()

            log_security_event(
                "Failed Login",
                f"Login attempt for unknown email: {email}",
                is_suspicious=recent_attempts >= 3,
                severity='High' if recent_attempts >= 3 else 'Low'
            )
            flash("Wrong email or password", "password-error")
            return redirect(url_for("auth.login"))

        # -- Auto-clear expired lock
        if user.account_locked_until and user.account_locked_until <= now:
            user.account_locked_until = None
            user.failed_login_attempts = 0
            user.lock_reason = None
            db.session.commit()

        # -- Account still locked
        if user.account_locked_until and user.account_locked_until > now:
            log_security_event(
                "Locked Account Access Attempt",
                f"Login attempted on locked account: {email}",
                user=user,
                is_suspicious=True,
                severity='High'
            )
            flash("Your account is temporarily locked. Please try again later.", "password-error")
            return redirect(url_for("auth.login"))

        # -- Email not verified
        if not user.is_verified:
            flash("Please verify your email before logging in.", "email-error")
            session['login_email'] = email
            return redirect(url_for("auth.login"))

        # -- Verify password
        try:
            is_valid = passhasher.verify(user.password_hash, password)
        except VerifyMismatchError:
            is_valid = False
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Login error for {email}: {e}")
            flash("An unexpected error occurred. Please try again.", "password-error")
            return redirect(url_for("auth.login"))

        # -- Wrong password
        if not is_valid:
            user.failed_login_attempts += 1

            if user.failed_login_attempts >= 5:
                user.account_locked_until = now + timedelta(minutes=15)
                user.lock_reason = "Too many failed login attempts"
                db.session.commit()

                try:
                    lock_msg = Message(
                        subject="CareMed — Account Temporarily Locked",
                        sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
                        recipients=[user.email]
                    )
                    lock_msg.body = f"""
Hello {user.first_name},

Your CareMed account has been temporarily locked
due to 5 consecutive failed login attempts.

It will be automatically unlocked after 15 minutes.

Time      : {datetime.utcnow().strftime('%B %d, %Y %I:%M %p')} UTC
IP Address: {request.remote_addr}

If this was not you, reset your password immediately.
                    """
                    mail.send(lock_msg)
                except Exception:
                    pass

                log_security_event(
                    "Account Lockout",
                    f"Account locked after 5 failed attempts: {user.email}",
                    user=user,
                    is_suspicious=True,
                    severity='Critical'
                )

            else:
                log_security_event(
                    "Failed Login",
                    f"Wrong password attempt #{user.failed_login_attempts} for: {email}",
                    user=user,
                    is_suspicious=(user.failed_login_attempts >= 3),
                    severity='Medium' if user.failed_login_attempts >= 3 else 'Low'
                )
                db.session.commit()

            flash("Wrong email or password", "password-error")
            return redirect(url_for("auth.login"))

        # -- Successful login
        prev_failures = user.failed_login_attempts

        # Check if this is a new/different device
        current_ua = request.headers.get('User-Agent', 'Unknown')
        last_ua = user.last_login_user_agent or ''
        is_new_device = last_ua == '' or last_ua != current_ua

        # Update last login info
        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.last_login_at = now
        user.last_login_user_agent = current_ua
        db.session.commit()

        if prev_failures >= 3:
            log_security_event(
                "Suspicious Login",
                f"Successful login after {prev_failures} failed attempts: {email}",
                user=user,
                is_suspicious=True,
                severity='High'
            )
 
        if user.role.strip() == 'Administrator':
            remember = False
            session.permanent = False
            # Log admin login with specific event type for Admin Activity tab
            event_type = 'Admin Login — New Device' if is_new_device else 'Admin Login'
            log_security_event(
                event_type,
                f"Admin logged in from {'new/unrecognized' if is_new_device else 'known'} device. "
                f"IP: {request.remote_addr}",
                user=user,
                is_suspicious=False,
                severity='Low'
            )
        else:
            remember = form.remember_me.data
            session.permanent = remember
            if prev_failures < 3:   # avoid double-logging suspicious logins
                log_security_event(
                    "Successful Login",
                    f"User logged in successfully: {email}",
                    user=user,
                    is_suspicious=False
                )
 
        login_user(user, remember=remember)

        # Only send email if different device or first ever login
        if is_new_device:
            try:
                login_msg = Message(
                    subject="CareMed — New Login From Unrecognized Device",
                    sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
                    recipients=[user.email]
                )

                ua = current_ua
                if 'Chrome' in ua and 'Edg' not in ua:
                    browser = 'Google Chrome'
                elif 'Firefox' in ua:
                    browser = 'Mozilla Firefox'
                elif 'Safari' in ua and 'Chrome' not in ua:
                    browser = 'Safari'
                elif 'Edg' in ua:
                    browser = 'Microsoft Edge'
                else:
                    browser = 'Unknown Browser'

                if 'Windows' in ua:
                    os_name = 'Windows'
                elif 'Mac' in ua:
                    os_name = 'macOS'
                elif 'iPhone' in ua or 'iPad' in ua:
                    os_name = 'iOS'
                elif 'Android' in ua:
                    os_name = 'Android'
                elif 'Linux' in ua:
                    os_name = 'Linux'
                else:
                    os_name = 'Unknown OS'

                login_time = now.strftime('%B %d, %Y at %I:%M %p UTC')

                reset_url = url_for('auth.forgot_password', _external=True)
                login_msg.html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; padding:40px 0;">
        <tr>
            <td align="center">
                <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#002347 0%,#1a4d7a 100%); padding:32px 40px; text-align:center;">
                            <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:800; letter-spacing:-0.5px;">
                                Care<span style="color:#52B788;">Med</span>
                            </h1>
                            <p style="margin:6px 0 0 0; color:#93c5fd; font-size:13px;">Medical Equipment Rental &amp; Sales</p>
                        </td>
                    </tr>

                    <!-- Alert Banner -->
                    <tr>
                        <td style="background:#fffbeb; border-bottom:3px solid #f59e0b; padding:16px 40px; text-align:center;">
                            <p style="margin:0; color:#92400e; font-size:14px; font-weight:700;">
                                &#9888;&nbsp; New Sign-In From an Unrecognized Device
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px;">
                            <p style="margin:0 0 8px 0; color:#1e293b; font-size:16px; font-weight:700;">
                                Hello {user.first_name},
                            </p>
                            <p style="margin:0 0 28px 0; color:#64748b; font-size:14px; line-height:1.6;">
                                We detected a sign-in to your CareMed account from a device we haven't seen before.
                                Here are the details:
                            </p>

                            <!-- Login Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0"
                                   style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:28px;">
                                <tr>
                                    <td style="padding:20px 24px; border-bottom:1px solid #e2e8f0; background:#f1f5f9;">
                                        <p style="margin:0; color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">
                                            Sign-In Details
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:20px 24px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #f1f5f9; width:40%;">
                                                    <span style="color:#64748b; font-size:13px;">&#128197; Date &amp; Time</span>
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">
                                                    <span style="color:#1e293b; font-size:13px; font-weight:600;">{login_time}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">
                                                    <span style="color:#64748b; font-size:13px;">&#127760; IP Address</span>
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">
                                                    <span style="color:#1e293b; font-size:13px; font-weight:600; font-family:monospace;">{request.remote_addr}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">
                                                    <span style="color:#64748b; font-size:13px;">&#128187; Browser</span>
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">
                                                    <span style="color:#1e293b; font-size:13px; font-weight:600;">{browser}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0;">
                                                    <span style="color:#64748b; font-size:13px;">&#128187; Operating System</span>
                                                </td>
                                                <td style="padding:8px 0;">
                                                    <span style="color:#1e293b; font-size:13px; font-weight:600;">{os_name}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Was it you? -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                                <tr>
                                    <td style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:16px 20px;">
                                        <p style="margin:0 0 4px 0; color:#166534; font-size:14px; font-weight:700;">
                                            &#10003;&nbsp; This was you?
                                        </p>
                                        <p style="margin:0; color:#166534; font-size:13px;">
                                            No action needed. You can safely ignore this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                    <td style="background:#fef2f2; border:1px solid #fca5a5; border-radius:10px; padding:16px 20px;">
                                        <p style="margin:0 0 4px 0; color:#991b1b; font-size:14px; font-weight:700;">
                                            &#10005;&nbsp; This wasn't you?
                                        </p>
                                        <p style="margin:0 0 12px 0; color:#991b1b; font-size:13px;">
                                            Your account may be compromised. Reset your password immediately.
                                        </p>
                                        <a href="{reset_url}"
                                           style="display:inline-block; background:#dc2626; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:700;">
                                            Reset Password Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:24px 40px; text-align:center;">
                            <p style="margin:0 0 4px 0; color:#94a3b8; font-size:12px;">
                                This is an automated security alert from CareMed.
                            </p>
                            <p style="margin:0; color:#94a3b8; font-size:12px;">
                                &copy; 2026 CareMed &mdash; Medical Equipment Rental &amp; Sales, Iloilo City, Philippines
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                """

                mail.send(login_msg)

            except Exception:
                pass  # Never break login if email fails

        if user.role.strip() in ['Administrator', 'Staff']:
            return redirect(url_for("admin.dashboard"))

        return redirect(url_for("user.homepage"))

    return render_template("authentication/login.html", form=form, email_value=email_value)

@auth_bp.route("/register", methods=["GET", "POST"])
@limiter.limit("5 per minute; 20 per hour")
def register():
    form = RegisterForm()

    if form.validate_on_submit():
        email = form.email.data.strip().lower()
        first_name = form.first_name.data.strip().title()
        last_name = form.last_name.data.strip().title()
        phone = form.phone.data.strip()
        address = form.address.data.strip().title()
        password = form.password.data
        strong, msg = is_strong_password(password)
        
        if not strong:
            flash(msg, "error")
            return render_template("authentication/registration.html", form=form)
        
        # IDS: log registration attempt
        log_security_event(
            "Registration Attempt",
            f"New account registration attempt for: {email}",
            is_suspicious=False,
            severity='Low'
        )

        password_regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$"
        if not re.match(password_regex, password):
            form.password.errors.append(
                "Password must be at least 8 characters and include uppercase, number, and special character."
            )
            return render_template("authentication/registration.html", form=form)

        try:
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                if not existing_user.is_active:
                    form.email.errors.append("This account is deactivated. Please contact support.")
                else:
                    form.email.errors.append("Email already registered.")
                return render_template("authentication/registration.html", form=form)

            hashed_password = passhasher.hash(password)

            new_user = User(
                email=email,
                password_hash=hashed_password,
                first_name=first_name,
                last_name=last_name,
                is_verified=False,
                is_active=True,        
                role="customer"
            )

            db.session.add(new_user)
            db.session.flush()

            new_customer = Customer(
                    user_id=new_user.id,
                    first_name=first_name, 
                    last_name=last_name,
                    contact_number=phone,
                    home_address=address,
                    is_id_verified=False 
            )
            
            db.session.add(new_customer)
            db.session.commit()

            try:
                verification_token = email_verification_token(new_user.email)
                verify_link = url_for(
                    "auth.verify_email",
                    token=verification_token,
                    _external=True
                )

                msg = Message(
                    subject="CareMed | Verify Your Email",
                    recipients=[new_user.email],
                    sender=current_app.config.get("MAIL_DEFAULT_SENDER")
                )

                msg.body = f"""
                    Hello {first_name},

                    Please verify your email to activate your CareMed account.

                    Click the link below:
                    {verify_link}

                    This link will expire in 24 hours.

                    CareMed Security Team
                    """

                mail.send(msg)
            except Exception as mail_error:
                current_app.logger.error(f"Mail failed for {email}: {mail_error}")
                flash("Account created, but we couldn't send a verification email. Please try 'Resend Email'.", "warning")
                return redirect(url_for('auth.login'))
            
            flash("Registration successful. Please check your email to verify your account.", "info")
            return redirect(url_for('auth.login', success='registered', email=email))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Registration error for {email}: {e}")
            flash("Registration failed. Please try again.", "danger")
            return render_template("authentication/registration.html", form=form)

    return render_template("authentication/registration.html", form=form)


@auth_bp.route("/verify-email/<token>")
def verify_email(token):

    email = verify_email_token(token)

    if not email:
        flash("Verification link is invalid or expired.", "danger")
        return redirect(url_for("auth.login"))

    user = User.query.filter_by(email=email).first()

    if not user:
        flash("Account not found.", "danger")
        return redirect(url_for("auth.login"))

    if user.is_verified:
        flash("Your email is already verified.", "info")
        return redirect(url_for("auth.login"))

    user.is_verified = True
    user.email_verified_at = datetime.utcnow()

    db.session.commit()

    flash("Email verified successfully! You can now login.", "success")

    return redirect(url_for("auth.login"))

@auth_bp.route("/google-login")
def google_login():
    nonce = secrets.token_urlsafe(16)
    state = secrets.token_urlsafe(16)
    session["nonce"] = nonce
    session["oauth_state"] = state
    redirect_uri = url_for("auth.callback", _external=True)

    return google.authorize_redirect(redirect_uri, nonce=nonce, state=state, prompt="select_account")


@auth_bp.route("/callback")
def callback():
    state = request.args.get("state")
    if not state or state != session.pop("oauth_state", None):
        log_security_event(
            "OAuth Failure",
            "Invalid OAuth state parameter — possible CSRF or token replay attempt",
            is_suspicious=True,
            severity='High'
        )
        flash("Invalid OAuth state")
        return redirect(url_for("auth.login"))

    try:
        token = google.authorize_access_token()
        user_info = google.parse_id_token(token, nonce=session.pop("nonce", None))
    except Exception as e:
        current_app.logger.error(f"OAuth Token Error: {e}")
        
        log_security_event(
            "OAuth Failure",
            f"Token exchange error during Google login: {str(e)[:200]}",
            is_suspicious=True,
            severity='High'
        )
        
        flash("Failed to retrieve user information from Google.", "danger")
        return redirect(url_for("auth.login"))

    if not user_info.get("email_verified"):
        log_security_event(
            "OAuth Failure",
            "Login attempt with unverified Google email",
            is_suspicious=True,
            severity='Medium'
        )
        flash("Google email not verified")
        return redirect(url_for("auth.login"))

    email = user_info["email"].lower()
    google_id = user_info["sub"]
    
    f_name = user_info.get("given_name", "Google").strip().title()
    l_name = user_info.get("family_name", "User").strip().title()

    if not email.endswith("@gmail.com"):
        flash("Only personal Gmail accounts are allowed for this service.", "warning")
        return redirect(url_for("auth.login"))

    try:
        user = User.query.filter_by(google_id=google_id).first()

        if not user:
            user = User.query.filter_by(email=email).first()

            if user:
                if user.google_id and user.google_id != google_id:
                    flash("This email is already linked to a different Google account.", "danger")
                    return redirect(url_for("auth.login"))
                
                user.google_id = google_id
                user.oauth_provider = "google"
                
                if not user.first_name: user.first_name = f_name
                if not user.last_name: user.last_name = l_name
            else:
                user = User(
                    email=email,
                    google_id=google_id,
                    first_name=f_name,
                    last_name=l_name,
                    is_verified=True,
                    email_verified_at=datetime.utcnow(),
                    role="customer",
                    oauth_provider="google",
                    is_active=True 
                )
                db.session.add(user)

        
        if not user.is_active:
            flash("This account has been deactivated. Please contact support.", "danger")
            return redirect(url_for("auth.login"))

        if not user.is_verified:
            user.is_verified = True
            user.email_verified_at = datetime.utcnow()

        db.session.flush()

        if user.role != "Administrator" and not user.customer_profile:
            customer = Customer(
                user_id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                is_id_verified=False
            )
            db.session.add(customer)
                
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"OAuth Callback Database Error: {e}")
        flash("An internal error occurred during login. Please try again.", "danger")
        return redirect(url_for("auth.login"))

    if user.role.strip() == 'Administrator':
        remember = False
        session.permanent = False
    else:
        remember = True
        session.permanent = True
 
    login_user(user, remember=remember)
    
    user.last_login_at = datetime.utcnow()
    db.session.commit()

    if user.role.strip() in ['Administrator', 'Staff']:
            return redirect(url_for("admin.dashboard"))

    return redirect(url_for("user.homepage"))

@auth_bp.route("/logout")
@login_required
def logout():
    # Log admin logout before the session is cleared
    if current_user.is_authenticated and current_user.role.strip() == 'Administrator':
        # Calculate session duration from last_active
        last_active = session.get('last_active')
        if last_active:
            try:
                last_active_dt = datetime.fromisoformat(last_active)
                duration_mins = int((datetime.utcnow() - last_active_dt).total_seconds() / 60)
                duration_str = f"Session duration: ~{duration_mins} min"
            except Exception:
                duration_str = "Session duration: unknown"
        else:
            duration_str = "Session duration: unknown"
 
        log_security_event(
            "Admin Logout",
            f"Admin manually logged out. {duration_str}. IP: {request.remote_addr}",
            user=current_user,
            is_suspicious=False,
            severity='Low'
        )
 
    logout_user()
    session.clear()
    session["force_account_select"] = True
    return redirect(url_for("auth.login"))


@auth_bp.route("/forgot-password", methods=["GET"])
def forgot_password():
    return redirect(url_for('auth.login', forgot='1'))

@auth_bp.route("/send-reset-link", methods=["POST"])
@limiter.limit("5 per minute", key_func=login_key, methods=["POST"])
def send_reset_link():
    email = request.form.get("email", "").strip().lower()
    now = datetime.utcnow()

    if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"success": False, "message": "Invalid email address."})

    user = User.query.filter_by(email=email).first()
    if user and user.last_otp_sent:
        seconds = (now - user.last_otp_sent).total_seconds()
        if seconds < OTP_RESEND_COOLDOWN:
            wait_time = int(OTP_RESEND_COOLDOWN - seconds)
            return jsonify({"success": False, "message": f"Please wait {wait_time}s before resending."})

    if user:
        log_security_event(
            "Password Reset Requested",
            f"Password reset link requested for: {email}",
            user=user,
            is_suspicious=False,
            severity='Low'
        )
        try:
            token = generate_reset_token(user.email, user.password_last_reset_at)
            user.last_otp_sent = now
            db.session.commit()

            reset_link = url_for('auth.reset_password', token=token, _external=True)
                        
            msg = Message(
                subject="CareMed | Password Reset Link",
                recipients=[email],
                sender=current_app.config.get('MAIL_DEFAULT_SENDER')
            )
            msg.html = render_template("authentication/reset_email_link.html", user=user, link=reset_link)
            msg.body = f"Hello {user.first_name}, reset your password here: {reset_link}"

            mail.send(msg)

        except Exception as e:
            current_app.logger.error(f"CRITICAL EMAIL ERROR: {str(e)}")
            return jsonify({"success": False, "message": "Email service is temporarily unavailable. Please try again later."})

    return jsonify({"success": True, "message": "Check your email. If registered, you'll receive a reset link shortly."})

@auth_bp.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    token_data = verify_reset_token(token, max_age=RESET_LINK_EXPIRY)
    if not token_data:
        flash("The reset link has expired or is invalid.", "danger")
        return redirect(url_for('auth.login'))

    email = token_data.get("email")
    token_last_reset_str = token_data.get("last_reset")

    user = User.query.filter_by(email=email).first()
    if not user:
        flash("Account not found.", "danger")
        return redirect(url_for('auth.login'))

    if token_last_reset_str and user.password_last_reset_at:
        token_last_reset = datetime.fromisoformat(token_last_reset_str)
        if token_last_reset < user.password_last_reset_at:
            log_security_event(
                "Reset Link Replayed",
                f"Already-used password reset link was submitted again for: {email}",
                user=user,
                is_suspicious=True,
                severity='High'
            )
            flash(
                "This password reset link has already been used. "
                "If you need a new password, please request a new reset link.",
                "info"
            )
            return redirect(url_for('auth.login'))

    form = ResetPasswordForm()

    if request.method == "POST" and form.validate_on_submit():
        new_password = form.password.data.strip()
        confirm_password = form.confirm_password.data.strip()

        if new_password != confirm_password:
            flash("Passwords do not match.", "warning")
            return render_template("authentication/reset_password.html", token=token, form=form)

        password_regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        if not re.match(password_regex, new_password):
            flash("Password must be at least 8 characters, include uppercase, number, and special character.", "warning")
            return render_template("authentication/reset_password.html", token=token, form=form)

        try:
            user.password_hash = passhasher.hash(new_password)
            user.password_last_reset_at = datetime.utcnow()
            db.session.commit()

            # IDS: log successful password reset
            log_security_event(
                "Password Reset Completed",
                f"Password successfully reset for: {email}",
                user=user,
                is_suspicious=False,
                severity='Low'
            )

            try:
                msg = Message(
                    "Security Alert: CareMed Password Changed",
                    sender=current_app.config['MAIL_DEFAULT_SENDER'],
                    recipients=[user.email]
                )
                msg.body = (
                    "Hello,\n\n"
                    "This is a confirmation that the password for your CareMed account has been successfully changed.\n"
                    "If you performed this action, you can safely ignore this email.\n\n"
                    "IF YOU DID NOT CHANGE YOUR PASSWORD:\n"
                    "Please contact support immediately.\n\n"
                    "Stay safe,\nThe CareMed Team"
                )
                mail.send(msg)
            except Exception as e:
                current_app.logger.warning(f"Could not send security email to {user.email}: {e}")

            flash("Success! Your password has been updated. You can now log in.", "success")
            return redirect(url_for('auth.login'))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating password for {email}: {e}")
            flash("A server error occurred. Please try again later.", "danger")
            return render_template("authentication/reset_password.html", token=token, form=form)

    return render_template("authentication/reset_password.html", token=token, form=form)