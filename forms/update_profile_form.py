import re
from flask_wtf.file import FileField, FileAllowed
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TextAreaField, FileField, SubmitField, SelectField
from wtforms.validators import DataRequired, Length, Optional, EqualTo, ValidationError
from wtforms import BooleanField
from wtforms import StringField, TextAreaField, SubmitField, BooleanField



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


class UpdateProfileForm(FlaskForm):
    submit_profile_flag = BooleanField(default=False)
    
    first_name = StringField("First Name", validators=[DataRequired(), Length(max=50)])
    last_name = StringField("Last Name", validators=[DataRequired(), Length(max=50)])
    phone = StringField("Phone", validators=[Optional(), Length(max=20)])
    address = TextAreaField("Address", validators=[Optional(), Length(max=255)])
    
    profile_path = FileField('Profile Picture', validators=[
        FileAllowed(['jpg', 'png', 'jpeg'], 'Images only!')
    ])
    
    primary_id_type = SelectField('Primary ID Type', choices=[
        ('', 'Select ID Type'),
        ('National ID', 'National ID'),
        ('Drivers License', 'Driver\'s License'),
        ('Passport', 'Passport'),
        ('UMID', 'UMID'),
        ('SSS', 'SSS'),
        ('PRC ID', 'PRC ID')
    ])
    
    secondary_id_type = SelectField('Secondary ID Type', choices=[
        ('', 'Select ID Type'),
        ('Voters ID', 'Voter\'s ID'),
        ('Postal ID', 'Postal ID'),
        ('PhilHealth', 'PhilHealth'),
        ('TIN', 'TIN'),
        ('Barangay ID', 'Barangay ID'),
        ('Student ID', 'Student ID')
    ])
    
    valid_id_path = FileField('Primary ID Upload', validators=[
        FileAllowed(['jpg', 'png', 'jpeg', 'pdf'], 'Images or PDFs only!')
    ])
    
    secondary_id_path = FileField('Secondary ID Upload', validators=[
        FileAllowed(['jpg', 'png', 'jpeg', 'pdf'], 'Images or PDFs only!')
    ])
    # ---------------------

    submit_profile = SubmitField("Update Profile")



class ChangePasswordForm(FlaskForm):
    current_password = PasswordField("Current Password")
    
    new_password = PasswordField("New Password", validators=[DataRequired(), Length(min=8, message="Password must be at least 8 characters"), validate_strong_password])
    
    confirm_password = PasswordField("Confirm Password", validators=[DataRequired(), EqualTo("new_password", message="Passwords must match")])
    
    submit_password = SubmitField("Save Changes")