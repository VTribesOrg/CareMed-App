from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, current_app
from flask_login import login_user, logout_user, login_required
from extensions import db, passhasher, oauth, mail, limiter, get_remote_address
from flask_mail import Message
from models.users import User
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
    email = request.form.get("email", "").lower()
    return f"{request.remote_addr}:{email}"


@auth_bp.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per minute", key_func=login_key, methods=["POST"])
def login():
    form = LoginForm()
    now = datetime.utcnow()

    if request.method == "GET":
        email_value = session.pop('login_email', '') 
    else:
        email_value = ''
        
    if form.validate_on_submit():
        email = form.email.data.strip().lower()
        password = form.password.data

        user = User.query.filter_by(email=email).first()

        if not user:
            passhasher.hash("dummy_password")
            flash("Wrong email or password", "password_error")
            return redirect(url_for("auth.login"))

        if not user.is_verified:
            flash("Please verify your email before logging in.", "email-error")
            return redirect(url_for("auth.login"))

        if user.account_locked_until and user.account_locked_until > now:
            flash("Your account is temporarily locked due to multiple failed login attempts. Please try again later.", "password-error")
            return redirect(url_for("auth.login"))

        try:
            if not passhasher.verify(user.password_hash, password):
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.account_locked_until = now + timedelta(minutes=15)
                    user.failed_login_attempts = 0
                    user.lock_reason = "Too many failed login attempts"
                db.session.commit()
                flash("Wrong email or password", "password-error")
                return redirect(url_for("auth.login"))

            user.failed_login_attempts = 0
            user.account_locked_until = None
            user.last_login_at = now
            db.session.commit()
            
            login_user(user, remember=True)
            session.permanent = True
            
            if user.role == "administrator":
                return redirect(url_for("admin.admin_dashboard"))

            return redirect(url_for("user.homepage"))

        except Exception as e:
            current_app.logger.error(f"Login error for {email}: {e}")
            flash("Wrong email or password. Please try again.", "password-error")
            return redirect(url_for("auth.login"))

    return render_template("authentication/login.html", form=form, email_value=email_value)

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    form = RegisterForm()

    if form.validate_on_submit():

        email = form.email.data.strip().lower()
        first_name = form.first_name.data.strip().title()
        last_name = form.last_name.data.strip().title()
        phone = form.phone.data.strip()
        address = form.address.data.strip().title()
        password = form.password.data

        password_regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$"

        if not re.match(password_regex, password):
            form.password.errors.append(
                "Password must be at least 8 characters and include uppercase, number, and special character."
            )
            return render_template("registration.html", form=form)

        existing_user = User.query.filter_by(email=email).first()

        if existing_user:
            form.email.errors.append("Email already registered")
            return render_template("registration.html", form=form)

        try:
            hashed_password = passhasher.hash(password)

            new_user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                address=address,
                password_hash=hashed_password,
                created_at=datetime.utcnow(),
                is_verified=False
            )

            db.session.add(new_user)
            db.session.commit()

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
            Hello {new_user.first_name},

            Please verify your email to activate your CareMed account.

            Click the link below:
            {verify_link}

            This link will expire in 24 hours.

            CareMed Security Team
            """

            mail.send(msg)

            flash("Registration successful. Please check your email to verify your account.", "info")

            return redirect(url_for('auth.login', success='registered', email=email))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Registration error for {email}: {e}")
            flash("Registration failed. Please try again.", "danger")
            return render_template("registration.html", form=form)

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
    redirect_uri = url_for("auth.google_callback", _external=True)

    return google.authorize_redirect(redirect_uri, nonce=nonce, state=state)

@auth_bp.route("/google-callback")
def google_callback():

    state = request.args.get("state")
    if not state or state != session.pop("oauth_state", None):
        flash("Invalid OAuth state")
        return redirect(url_for("auth.login"))

    token = google.authorize_access_token()
    user_info = google.parse_id_token(token, nonce=session.pop("nonce", None))

    if not user_info.get("email_verified"):
        flash("Google email not verified")
        return redirect(url_for("auth.login"))

    email = user_info["email"].lower()
    google_id = user_info["sub"]
    profile_pic = user_info.get("picture")

    if not email.endswith("@gmail.com"):
        flash("Only Gmail accounts are allowed")
        return redirect(url_for("auth.login"))

    user = User.query.filter_by(google_id=google_id).first()

    if not user:
        user = User.query.filter_by(email=email).first()

        if user and user.google_id and user.google_id != google_id:
            flash("Account already linked with another Google account.")
            return redirect(url_for("auth.login"))

        if user:
            user.google_id = google_id
            user.profile_pic = profile_pic
            user.is_verified = True
            user.email_verified_at = datetime.utcnow()

        else:
            user = User(
                email=email,
                first_name=user_info.get("given_name"),
                last_name=user_info.get("family_name"),
                google_id=google_id,
                profile_pic=profile_pic,
                is_verified=True,
                email_verified_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                role="customer"
            )

        try:
            db.session.add(user)
            db.session.commit()

        except Exception:
            db.session.rollback()
            user = User.query.filter_by(email=email).first()

    login_user(user, remember=True)
    session.permanent = True

    if user.role == "administrator":
        return redirect(url_for("admin.admin_dashboard"))

    return redirect(url_for("user.homepage"))

@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))


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
            msg.html = render_template("reset_email_link.html", user=user, link=reset_link)
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
            return render_template("reset_password.html", token=token, form=form)

        password_regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        if not re.match(password_regex, new_password):
            flash("Password must be at least 8 characters, include uppercase, number, and special character.", "warning")
            return render_template("reset_password.html", token=token, form=form)

        try:
            user.password_hash = passhasher.hash(new_password)
            user.password_last_reset_at = datetime.utcnow()
            db.session.commit()

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
            return render_template("reset_password.html", token=token, form=form)

    return render_template("authentication/reset_password.html", token=token, form=form)