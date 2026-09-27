import re
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import (DataRequired, Email, EqualTo, ValidationError)

def validate_gmail(form, field):
    if not re.match(r'^[a-zA-Z0-9._%+-]+@gmail\.com$', field.data):
        raise ValidationError("Only Gmail accounts are allowed.")


class LoginForm(FlaskForm):
    email = StringField("Email Address", validators=[DataRequired(), Email(), validate_gmail])
    
    password = PasswordField("Password", validators=[DataRequired()])
    
    remember_me = BooleanField("Remember me", default=False)
    
    
class ResetPasswordForm(FlaskForm):
    
    password = PasswordField('New Password', validators=[DataRequired()])
    
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    
    submit = SubmitField('Update Password')