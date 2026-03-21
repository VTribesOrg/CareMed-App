import re
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TelField, SubmitField
from wtforms.validators import (DataRequired, Length, Email, EqualTo, ValidationError)

def validate_name(form, field):
    if not re.match(r"^[A-Za-z\s'-]+$", field.data):
        raise ValidationError("Name must contain only letters.")


def validate_gmail(form, field):
    if not re.match(r'^[a-zA-Z0-9._%+-]+@gmail\.com$', field.data):
        raise ValidationError("Only Gmail accounts are allowed.")


def validate_phone(form, field):
    if not re.match(r'^(\+63|0)9\d{9}$', field.data):
        raise ValidationError("Enter a valid Philippine phone number.")


def validate_strong_password(form, field):
    password = field.data

    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters.")

    if not re.search(r'[A-Z]', password):
        raise ValidationError("Password must contain an uppercase letter.")

    if not re.search(r'[a-z]', password):
        raise ValidationError("Password must contain a lowercase letter.")

    if not re.search(r'\d', password):
        raise ValidationError("Password must contain a number.")

    if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
        raise ValidationError("Password must contain a special character.")


class RegisterForm(FlaskForm):

    first_name = StringField("First Name", validators=[DataRequired(), Length(min=2, max=50), validate_name])

    last_name = StringField("Last Name", validators=[DataRequired(), Length(min=2, max=50), validate_name])

    email = StringField("Email Address", validators=[DataRequired(), Email(), validate_gmail])

    phone = TelField("Phone Number", validators=[DataRequired(), validate_phone])

    address = StringField("Delivery Address", validators=[DataRequired(), Length(min=10, max=200)])

    password = PasswordField("Password", validators=[DataRequired(), validate_strong_password])

    confirm_password = PasswordField("Confirm Password", validators=[DataRequired(), EqualTo('password', message="Passwords must match.")])

    
class LoginForm(FlaskForm):
    email = StringField("Email Address", validators=[DataRequired(), Email(), validate_gmail])
    
    password = PasswordField("Password", validators=[DataRequired()])
    
    
class ResetPasswordForm(FlaskForm):
    
    password = PasswordField('New Password', validators=[DataRequired()])
    
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    
    submit = SubmitField('Update Password')