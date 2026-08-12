import os
import re
import secrets
from datetime import datetime, timedelta

from flask import (
    Blueprint, render_template, request, redirect, url_for,
    flash, session, jsonify, current_app
)
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Message
from argon2.exceptions import VerifyMismatchError

from extensions import db, passhasher, oauth, mail, limiter, get_remote_address
from models.users import User, SecurityLog, BlockedIP
from models.customer import Customer
from forms.auth_forms import RegisterForm, LoginForm, ResetPasswordForm
from utils.security import (
    generate_reset_token, verify_reset_token,
    email_verification_token, verify_email_token
)


# --------------------------------------------------------------------------- #
# Password policy
# --------------------------------------------------------------------------- #
class PasswordPolicy:
    """Password strength rules used at registration and reset time."""

    REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$"
    REGEX_STRICT_CHARSET = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"

    @staticmethod
    def is_strong(password: str):
        """Human-readable strength check used to produce a flash message."""
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r'[0-9]', password):
            return False, "Password must contain at least one number"
        if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
            return False, "Password must contain at least one special character"
        return True, "OK"

    @classmethod
    def matches_registration_regex(cls, password: str) -> bool:
        return bool(re.match(cls.REGEX, password))

    @classmethod
    def matches_reset_regex(cls, password: str) -> bool:
        return bool(re.match(cls.REGEX_STRICT_CHARSET, password))


# --------------------------------------------------------------------------- #
# Bot detection
# --------------------------------------------------------------------------- #
class BotDetector:
    """Flags obviously automated clients by User-Agent."""

    BOT_PATTERNS = [
        'python-requests', 'curl', 'wget', 'httpie',
        'scrapy', 'bot', 'crawler', 'spider'
    ]

    def __init__(self, audit_logger: "SecurityAuditLogger"):
        self.audit_logger = audit_logger

    def check(self) -> bool:
        user_agent = request.headers.get('User-Agent', '').strip()

        if not user_agent:
            self.audit_logger.log_event(
                "Bot Detected",
                "Request with empty User-Agent string on login",
                is_suspicious=True,
                severity='High'
            )
            return True

        ua_lower = user_agent.lower()
        for pattern in self.BOT_PATTERNS:
            if pattern in ua_lower:
                self.audit_logger.log_event(
                    "Bot Detected",
                    f"Automated tool detected on login — User-Agent: {user_agent[:255]}",
                    is_suspicious=True,
                    severity='High'
                )
                return True

        return False


# --------------------------------------------------------------------------- #
# Device info parsing
# --------------------------------------------------------------------------- #
class DeviceInfo:
    """Best-effort browser/OS labels parsed out of a User-Agent string."""

    def __init__(self, user_agent: str):
        self.user_agent = user_agent or ''
        self.browser = self._parse_browser()
        self.os_name = self._parse_os()

    def _parse_browser(self) -> str:
        ua = self.user_agent
        if 'Chrome' in ua and 'Edg' not in ua:
            return 'Google Chrome'
        if 'Firefox' in ua:
            return 'Mozilla Firefox'
        if 'Safari' in ua and 'Chrome' not in ua:
            return 'Safari'
        if 'Edg' in ua:
            return 'Microsoft Edge'
        return 'Unknown Browser'

    def _parse_os(self) -> str:
        ua = self.user_agent
        if 'Windows' in ua:
            return 'Windows'
        if 'Mac' in ua:
            return 'macOS'
        if 'iPhone' in ua or 'iPad' in ua:
            return 'iOS'
        if 'Android' in ua:
            return 'Android'
        if 'Linux' in ua:
            return 'Linux'
        return 'Unknown OS'


# --------------------------------------------------------------------------- #
# Security audit logging + auto-block
# --------------------------------------------------------------------------- #
class SecurityAuditLogger:
    """IDS-style event logging, auto-block on repeated suspicious activity,
    and the admin alert email that follows an auto-block."""

    AUTO_BLOCK_THRESHOLD = 5
    AUTO_BLOCK_WINDOW_MINUTES = 10
    AUTO_BLOCK_DURATION_HOURS = 1

    def log_event(self, event_type, description, user=None, is_suspicious=False, severity='Low'):
        try:
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

            if is_suspicious:
                self._maybe_auto_block(ip, user_agent, event_type, description, user)

        except Exception as err:
            current_app.logger.error(f"[IDS] Logging failed: {err}")
            try:
                db.session.rollback()
            except Exception:
                pass

    def _maybe_auto_block(self, ip, user_agent, event_type, description, user):
        cutoff = datetime.utcnow() - timedelta(minutes=self.AUTO_BLOCK_WINDOW_MINUTES)
        recent_suspicious = SecurityLog.query.filter(
            SecurityLog.ip_address == ip,
            SecurityLog.is_suspicious == True,
            SecurityLog.created_at >= cutoff
        ).count()

        if recent_suspicious < self.AUTO_BLOCK_THRESHOLD:
            return

        self._upsert_block(ip, recent_suspicious)

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

        self._send_block_alert(ip, recent_suspicious, event_type, description, user, user_agent)

    def _upsert_block(self, ip, recent_suspicious):
        existing_block = BlockedIP.query.filter_by(ip_address=ip).first()
        if existing_block:
            existing_block.is_active = True
            existing_block.reason = f"Auto-blocked: {recent_suspicious} suspicious events in 10 minutes"
            existing_block.blocked_until = datetime.utcnow() + timedelta(hours=self.AUTO_BLOCK_DURATION_HOURS)
            existing_block.blocked_at = datetime.utcnow()
            existing_block.blocked_by = None
        else:
            block = BlockedIP(
                ip_address=ip,
                reason=f"Auto-blocked: {recent_suspicious} suspicious events in 10 minutes",
                blocked_until=datetime.utcnow() + timedelta(hours=self.AUTO_BLOCK_DURATION_HOURS),
                is_active=True
            )
            db.session.add(block)

    def _send_block_alert(self, ip, recent_suspicious, event_type, description, user, user_agent):
        try:
            admin_email = current_app.config.get('MAIL_USERNAME')
            if not admin_email:
                return

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


# --------------------------------------------------------------------------- #
# Login lockout tracking
# --------------------------------------------------------------------------- #
class LoginAttemptGuard:
    """Encapsulates the failed-attempt counter and account lockout state."""

    MAX_ATTEMPTS = 5
    LOCK_DURATION_MINUTES = 15

    def __init__(self, audit_logger: SecurityAuditLogger, email_notifier: "EmailNotifier"):
        self.audit_logger = audit_logger
        self.email_notifier = email_notifier

    def clear_expired_lock(self, user: User, now: datetime):
        if user.account_locked_until and user.account_locked_until <= now:
            user.account_locked_until = None
            user.failed_login_attempts = 0
            user.lock_reason = None
            db.session.commit()

    def is_locked(self, user: User, now: datetime) -> bool:
        return bool(user.account_locked_until and user.account_locked_until > now)

    def register_unknown_email_attempt(self, email: str):
        # Constant-time-ish: hash a dummy password even though the user doesn't exist.
        passhasher.hash("dummy_password")

        cutoff = datetime.utcnow() - timedelta(minutes=10)
        recent_attempts = SecurityLog.query.filter(
            SecurityLog.ip_address == request.remote_addr,
            SecurityLog.event_type == "Failed Login",
            SecurityLog.created_at >= cutoff
        ).count()

        self.audit_logger.log_event(
            "Failed Login",
            f"Login attempt for unknown email: {email}",
            is_suspicious=recent_attempts >= 3,
            severity='High' if recent_attempts >= 3 else 'Low'
        )

    def register_locked_account_attempt(self, user: User, email: str):
        self.audit_logger.log_event(
            "Locked Account Access Attempt",
            f"Login attempted on locked account: {email}",
            user=user,
            is_suspicious=True,
            severity='High'
        )

    def register_wrong_password(self, user: User, email: str):
        """Increments the counter, locks the account if the threshold is hit,
        and returns True if the account just became locked."""
        user.failed_login_attempts += 1

        if user.failed_login_attempts >= self.MAX_ATTEMPTS:
            user.account_locked_until = datetime.utcnow() + timedelta(minutes=self.LOCK_DURATION_MINUTES)
            user.lock_reason = "Too many failed login attempts"
            db.session.commit()

            self.email_notifier.send_account_locked(user)

            self.audit_logger.log_event(
                "Account Lockout",
                f"Account locked after 5 failed attempts: {user.email}",
                user=user,
                is_suspicious=True,
                severity='Critical'
            )
            return True

        self.audit_logger.log_event(
            "Failed Login",
            f"Wrong password attempt #{user.failed_login_attempts} for: {email}",
            user=user,
            is_suspicious=(user.failed_login_attempts >= 3),
            severity='Medium' if user.failed_login_attempts >= 3 else 'Low'
        )
        db.session.commit()
        return False


# --------------------------------------------------------------------------- #
# Email notifications
# --------------------------------------------------------------------------- #
class EmailNotifier:
    """All outgoing transactional and security emails for the auth flow."""

    def send_account_locked(self, user: User):
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

    def send_new_device_login(self, user: User, now: datetime):
        try:
            current_ua = request.headers.get('User-Agent', 'Unknown')
            device = DeviceInfo(current_ua)
            login_time = now.strftime('%B %d, %Y at %I:%M %p UTC')
            reset_url = url_for('auth.forgot_password', _external=True)

            login_msg = Message(
                subject="CareMed — New Login From Unrecognized Device",
                sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
                recipients=[user.email]
            )
            login_msg.html = self._new_device_html(
                user=user,
                login_time=login_time,
                browser=device.browser,
                os_name=device.os_name,
                reset_url=reset_url
            )
            mail.send(login_msg)
        except Exception:
            pass  # Never break login if email fails

    def send_verification_email(self, user: User, first_name: str):
        verification_token = email_verification_token(user.email)
        verify_link = url_for("auth.verify_email", token=verification_token, _external=True)

        msg = Message(
            subject="CareMed | Verify Your Email",
            recipients=[user.email],
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

    def send_reset_link(self, user: User, token: str):
        reset_link = url_for('auth.reset_password', token=token, _external=True)

        msg = Message(
            subject="CareMed | Password Reset Link",
            recipients=[user.email],
            sender=current_app.config.get('MAIL_DEFAULT_SENDER')
        )
        msg.html = render_template("authentication/reset_email_link.html", user=user, link=reset_link)
        msg.body = f"Hello {user.first_name}, reset your password here: {reset_link}"
        mail.send(msg)

    def send_password_changed(self, user: User):
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

    @staticmethod
    def _new_device_html(user, login_time, browser, os_name, reset_url):
        return f"""
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


# --------------------------------------------------------------------------- #
# Google OAuth
# --------------------------------------------------------------------------- #
class GoogleOAuthService:
    """Wraps the authlib Google client plus the account-linking rules used
    in the OAuth callback."""

    def __init__(self, audit_logger: SecurityAuditLogger):
        self.audit_logger = audit_logger
        self.client = oauth.register(
            name="google",
            client_id=os.environ["GOOGLE_CLIENT_ID"],
            client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            api_base_url="https://www.googleapis.com/oauth2/v2/",
            client_kwargs={"scope": "openid email profile"}
        )

    def start_login(self):
        nonce = secrets.token_urlsafe(16)
        state = secrets.token_urlsafe(16)
        session["nonce"] = nonce
        session["oauth_state"] = state
        redirect_uri = url_for("auth.callback", _external=True)
        return self.client.authorize_redirect(redirect_uri, nonce=nonce, state=state, prompt="select_account")

    def validate_state(self) -> bool:
        state = request.args.get("state")
        if not state or state != session.pop("oauth_state", None):
            self.audit_logger.log_event(
                "OAuth Failure",
                "Invalid OAuth state parameter — possible CSRF or token replay attempt",
                is_suspicious=True,
                severity='High'
            )
            return False
        return True

    def exchange_token(self):
        """Returns parsed user_info, or None (and logs) on failure."""
        try:
            token = self.client.authorize_access_token()
            return self.client.parse_id_token(token, nonce=session.pop("nonce", None))
        except Exception as e:
            current_app.logger.error(f"OAuth Token Error: {e}")
            self.audit_logger.log_event(
                "OAuth Failure",
                f"Token exchange error during Google login: {str(e)[:200]}",
                is_suspicious=True,
                severity='High'
            )
            return None

    def is_email_verified(self, user_info: dict) -> bool:
        if not user_info.get("email_verified"):
            self.audit_logger.log_event(
                "OAuth Failure",
                "Login attempt with unverified Google email",
                is_suspicious=True,
                severity='Medium'
            )
            return False
        return True

    def find_or_create_user(self, user_info: dict):
        """Returns (user, error_flash_message_or_None)."""
        email = user_info["email"].lower()
        google_id = user_info["sub"]
        f_name = user_info.get("given_name", "Google").strip().title()
        l_name = user_info.get("family_name", "User").strip().title()

        user = User.query.filter_by(google_id=google_id).first()

        if not user:
            user = User.query.filter_by(email=email).first()

            if user:
                if user.google_id and user.google_id != google_id:
                    return None, "This email is already linked to a different Google account."

                user.google_id = google_id
                user.oauth_provider = "google"

                if not user.first_name:
                    user.first_name = f_name
                if not user.last_name:
                    user.last_name = l_name
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

        return user, None


# --------------------------------------------------------------------------- #
# Auth controller — Flask routes
# --------------------------------------------------------------------------- #
class AuthController:
    """Owns the auth Blueprint and exposes each route as a bound method.

    Usage:
        auth_controller = AuthController()
        app.register_blueprint(auth_controller.blueprint)
    """

    RESET_LINK_EXPIRY = 3600
    OTP_RESEND_COOLDOWN = 60

    def __init__(self):
        self.blueprint = Blueprint("auth", __name__)

        self.audit_logger = SecurityAuditLogger()
        self.bot_detector = BotDetector(self.audit_logger)
        self.email_notifier = EmailNotifier()
        self.login_guard = LoginAttemptGuard(self.audit_logger, self.email_notifier)
        self.google_oauth = GoogleOAuthService(self.audit_logger)

        self._register_routes()

    # -- helpers ----------------------------------------------------------- #

    @staticmethod
    def _login_rate_limit_key():
        return request.remote_addr

    @staticmethod
    def _create_customer_for_user(user: User):
        if not user.customer_profile:
            customer = Customer(
                user_id=user.id,
                name=f"{user.first_name or ''} {user.last_name or ''}".strip()
            )
            db.session.add(customer)

    def _register_routes(self):
        bp = self.blueprint

        bp.add_url_rule(
            "/login", view_func=limiter.limit(
                "5 per 5 minute", key_func=self._login_rate_limit_key, methods=["POST"]
            )(self.login),
            methods=["GET", "POST"]
        )
        bp.add_url_rule(
            "/register", view_func=limiter.limit("5 per minute; 20 per hour")(self.register),
            methods=["GET", "POST"]
        )
        bp.add_url_rule("/verify-email/<token>", view_func=self.verify_email)
        bp.add_url_rule("/google-login", view_func=self.google_login)
        bp.add_url_rule("/callback", view_func=self.callback)
        bp.add_url_rule("/logout", view_func=login_required(self.logout))
        bp.add_url_rule("/forgot-password", view_func=self.forgot_password, methods=["GET"])
        bp.add_url_rule(
            "/send-reset-link", view_func=limiter.limit(
                "5 per minute", key_func=self._login_rate_limit_key, methods=["POST"]
            )(self.send_reset_link),
            methods=["POST"]
        )
        bp.add_url_rule(
            "/reset-password/<token>", view_func=self.reset_password, methods=["GET", "POST"]
        )

    # -- routes -------------------------------------------------------------- #

    def login(self):
        form = LoginForm()
        now = datetime.utcnow()

        if request.method == "POST":
            self.bot_detector.check()

        email_value = session.pop('login_email', '') if request.method == "GET" else ''

        if form.validate_on_submit():
            email = form.email.data.strip().lower()
            password = form.password.data

            user = User.query.filter_by(email=email).first()

            if not user:
                self.login_guard.register_unknown_email_attempt(email)
                flash("Wrong email or password", "password-error")
                return redirect(url_for("auth.login"))

            self.login_guard.clear_expired_lock(user, now)

            if self.login_guard.is_locked(user, now):
                self.login_guard.register_locked_account_attempt(user, email)
                flash("Your account is temporarily locked. Please try again later.", "password-error")
                return redirect(url_for("auth.login"))

            if not user.is_verified:
                flash("Please verify your email before logging in.", "email-error")
                session['login_email'] = email
                return redirect(url_for("auth.login"))

            try:
                is_valid = passhasher.verify(user.password_hash, password)
            except VerifyMismatchError:
                is_valid = False
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Login error for {email}: {e}")
                flash("An unexpected error occurred. Please try again.", "password-error")
                return redirect(url_for("auth.login"))

            if not is_valid:
                self.login_guard.register_wrong_password(user, email)
                flash("Wrong email or password", "password-error")
                return redirect(url_for("auth.login"))

            return self._complete_login(user, now, form.remember_me.data)

        return render_template("authentication/login.html", form=form, email_value=email_value)

    def _complete_login(self, user: User, now: datetime, remember_me_requested: bool):
        prev_failures = user.failed_login_attempts

        current_ua = request.headers.get('User-Agent', 'Unknown')
        last_ua = user.last_login_user_agent or ''
        is_new_device = last_ua == '' or last_ua != current_ua

        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.last_login_at = now
        user.last_login_user_agent = current_ua
        db.session.commit()

        if prev_failures >= 3:
            self.audit_logger.log_event(
                "Suspicious Login",
                f"Successful login after {prev_failures} failed attempts: {user.email}",
                user=user,
                is_suspicious=True,
                severity='High'
            )

        if user.role.strip() == 'Administrator':
            remember = False
            session.permanent = False
            event_type = 'Admin Login — New Device' if is_new_device else 'Admin Login'
            self.audit_logger.log_event(
                event_type,
                f"Admin logged in from {'new/unrecognized' if is_new_device else 'known'} device. "
                f"IP: {request.remote_addr}",
                user=user,
                is_suspicious=False,
                severity='Low'
            )
        else:
            remember = remember_me_requested
            session.permanent = remember
            if prev_failures < 3:  # avoid double-logging suspicious logins
                event_type = (
                    ('Staff Login — New Device' if is_new_device else 'Staff Login')
                    if user.role.strip() == 'Staff'
                    else 'Successful Login'
                )
                self.audit_logger.log_event(
                    event_type,
                    f"{user.role.strip()} logged in successfully: {user.email}",
                    user=user,
                    is_suspicious=False,
                    severity='Low'
                )

        login_user(user, remember=remember)

        if is_new_device:
            self.email_notifier.send_new_device_login(user, now)

        if user.role.strip() in ['Administrator', 'Staff']:
            return redirect(url_for("admin.dashboard"))
        return redirect(url_for("user.homepage"))

    def register(self):
        form = RegisterForm()

        if form.validate_on_submit():
            email = form.email.data.strip().lower()
            first_name = form.first_name.data.strip().title()
            last_name = form.last_name.data.strip().title()
            phone = form.phone.data.strip()
            address = form.address.data.strip().title()
            password = form.password.data
            strong, msg = PasswordPolicy.is_strong(password)

            if not strong:
                flash(msg, "error")
                return render_template("authentication/registration.html", form=form)

            self.audit_logger.log_event(
                "Registration Attempt",
                f"New account registration attempt for: {email}",
                is_suspicious=False,
                severity='Low'
            )

            if not PasswordPolicy.matches_registration_regex(password):
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
                    self.email_notifier.send_verification_email(new_user, first_name)
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

    def verify_email(self, token):
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

    def google_login(self):
        return self.google_oauth.start_login()

    def callback(self):
        if not self.google_oauth.validate_state():
            flash("Invalid OAuth state")
            return redirect(url_for("auth.login"))

        user_info = self.google_oauth.exchange_token()
        if user_info is None:
            flash("Failed to retrieve user information from Google.", "danger")
            return redirect(url_for("auth.login"))

        if not self.google_oauth.is_email_verified(user_info):
            flash("Google email not verified")
            return redirect(url_for("auth.login"))

        email = user_info["email"].lower()
        if not email.endswith("@gmail.com"):
            flash("Only personal Gmail accounts are allowed for this service.", "warning")
            return redirect(url_for("auth.login"))

        try:
            user, error = self.google_oauth.find_or_create_user(user_info)
            if error:
                flash(error, "danger")
                return redirect(url_for("auth.login"))

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

    def logout(self):
        if current_user.is_authenticated and current_user.role.strip() == 'Administrator':
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

            self.audit_logger.log_event(
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

    def forgot_password(self):
        return redirect(url_for('auth.login', forgot='1'))

    def send_reset_link(self):
        email = request.form.get("email", "").strip().lower()
        now = datetime.utcnow()

        if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"success": False, "message": "Invalid email address."})

        user = User.query.filter_by(email=email).first()
        if user and user.last_otp_sent:
            seconds = (now - user.last_otp_sent).total_seconds()
            if seconds < self.OTP_RESEND_COOLDOWN:
                wait_time = int(self.OTP_RESEND_COOLDOWN - seconds)
                return jsonify({"success": False, "message": f"Please wait {wait_time}s before resending."})

        if user:
            self.audit_logger.log_event(
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

                self.email_notifier.send_reset_link(user, token)

            except Exception as e:
                current_app.logger.error(f"CRITICAL EMAIL ERROR: {str(e)}")
                return jsonify({"success": False, "message": "Email service is temporarily unavailable. Please try again later."})

        return jsonify({"success": True, "message": "Check your email. If registered, you'll receive a reset link shortly."})

    def reset_password(self, token):
        token_data = verify_reset_token(token, max_age=self.RESET_LINK_EXPIRY)
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
                self.audit_logger.log_event(
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

            if not PasswordPolicy.matches_reset_regex(new_password):
                flash("Password must be at least 8 characters, include uppercase, number, and special character.", "warning")
                return render_template("authentication/reset_password.html", token=token, form=form)

            try:
                user.password_hash = passhasher.hash(new_password)
                user.password_last_reset_at = datetime.utcnow()
                db.session.commit()

                self.audit_logger.log_event(
                    "Password Reset Completed",
                    f"Password successfully reset for: {email}",
                    user=user,
                    is_suspicious=False,
                    severity='Low'
                )

                self.email_notifier.send_password_changed(user)

                flash("Success! Your password has been updated. You can now log in.", "success")
                return redirect(url_for('auth.login'))

            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Error updating password for {email}: {e}")
                flash("A server error occurred. Please try again later.", "danger")
                return render_template("authentication/reset_password.html", token=token, form=form)

        return render_template("authentication/reset_password.html", token=token, form=form)


# --------------------------------------------------------------------------- #
# Module-level wiring — keeps `from auth_routes import auth_bp` working
# unchanged for whatever registers blueprints in app.py.
# --------------------------------------------------------------------------- #
auth_controller = AuthController()
auth_bp = auth_controller.blueprint