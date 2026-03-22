import os
from flask import Blueprint, render_template, request, current_app, jsonify, redirect, url_for, flash
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename
from extensions import db, passhasher, limiter
from forms.update_profile_form import UpdateProfileForm, ChangePasswordForm
from functools import wraps

user_bp = Blueprint('user', __name__, url_prefix='/customer')


def customer_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))

        if current_user.role == 'Administrator':
            return redirect(url_for('admin.dashboard'))

        return f(*args, **kwargs)
    return decorated_function


def admin_redirect(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.is_authenticated and current_user.role and current_user.role.strip()== 'Administrator':
            return redirect(url_for('admin.dashboard'))
        return f(*args, **kwargs)
    return decorated_function



@user_bp.route('/')
@admin_redirect
def homepage():
    return render_template('user/homepage.html')


@user_bp.route('/products')
@admin_redirect
def products():
    return render_template('user/products.html')


@user_bp.route('/profile', methods=['GET', 'POST'])
@login_required
@customer_required
@limiter.limit("10 per minute")
def profile():
    profile_form = UpdateProfileForm()
    password_form = ChangePasswordForm()

    if request.method == "GET":
        profile_form.first_name.data = current_user.first_name
        profile_form.last_name.data = current_user.last_name
        profile_form.phone.data = current_user.phone
        profile_form.address.data = current_user.address

        return render_template("user/profile.html", profile_form=profile_form, password_form=password_form)

    if profile_form.validate_on_submit() and profile_form.submit_profile.data:
            # Update text fields
            current_user.first_name = profile_form.first_name.data.strip().title()
            current_user.last_name = profile_form.last_name.data.strip().title()
            current_user.phone = profile_form.phone.data.strip()
            current_user.address = profile_form.address.data.title()

            remove_photo_signal = request.form.get('remove_photo') == 'true'
            new_file = profile_form.profile_path.data

            try:
                if remove_photo_signal and not new_file:
                    if current_user.profile_path:
                        old_path = os.path.join(current_app.root_path, 'static', current_user.profile_path)
                        if os.path.exists(old_path):
                            os.remove(old_path)
                        current_user.profile_path = None

                if new_file:
                    if current_user.profile_path:
                        old_path = os.path.join(current_app.root_path, 'static', current_user.profile_path)
                        if os.path.exists(old_path):
                            os.remove(old_path)

                    filename = secure_filename(f"user_{current_user.id}_{new_file.filename}")
                    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'profiles')
                    os.makedirs(upload_folder, exist_ok=True)
                    
                    new_file.save(os.path.join(upload_folder, filename))
                    current_user.profile_path = f"uploads/profiles/{filename}"

                db.session.commit()
                return jsonify(status="success", message="Profile updated successfully!")

            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Profile update failed: {e}")
                return jsonify(status="error", message="Failed to update profile.", detail=str(e))

    if request.method == "POST":
        return jsonify(status="error", message="Validation failed", errors=profile_form.errors)

    return render_template("user/profile.html", profile_form=profile_form, password_form=password_form)


@user_bp.route('/change_password', methods=['POST'])
@login_required
def change_password():
    form = ChangePasswordForm()

    if form.validate_on_submit():
        if current_user.password_hash:
            try:
                passhasher.verify(current_user.password_hash, form.current_password.data)
            except:
                return jsonify(status="error", errors={"current_password": ["Current password is incorrect."]})

        current_user.password_hash = passhasher.hash(form.new_password.data)

        try:
            db.session.commit()
            return jsonify(status="success", message="Password updated successfully!")
        except:
            db.session.rollback()
            return jsonify(status="error", errors={"new_password": ["An error occurred while updating password."]})

    else:
        errors = {}
        for field, msgs in form.errors.items():
            errors[field] = msgs

        return jsonify(status="error", errors=errors)