from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
from flask import current_app
from datetime import datetime
from models.users import User

def generate_reset_token(email, last_reset=None):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    data = {"email": email}
    if last_reset:
        data["last_reset"] = last_reset.isoformat()
    return serializer.dumps(data, salt='password-reset-salt')

def verify_reset_token(token, max_age=3600):

    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        data = serializer.loads(token, salt='password-reset-salt', max_age=max_age)
        email = data.get("email")
        token_last_reset_str = data.get("last_reset")

        user = User.query.filter_by(email=email).first()
        if not user:
            return None

        if token_last_reset_str:
            token_last_reset = datetime.fromisoformat(token_last_reset_str)
            if user.password_last_reset_at and user.password_last_reset_at > token_last_reset:
                current_app.logger.warning(f"Token reuse attempt detected for user {email}")
                return None

        return {"email": email}

    except SignatureExpired:
        current_app.logger.info(f"Expired reset token used: {token}")
        return None
    except BadTimeSignature:
        current_app.logger.info(f"Invalid reset token signature: {token}")
        return None
    except Exception as e:
        current_app.logger.error(f"Error verifying token: {e}")
        return None


def email_verification_token(email):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt="email-verification")

def verify_email_token(token, max_age=86400):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(token, salt="email-verification", max_age=max_age)
        return email
    except Exception:
        return None
    

