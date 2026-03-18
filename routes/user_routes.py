import os
from flask import Blueprint, render_template, request, current_app, jsonify, redirect, url_for
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename
from extensions import db, passhasher, limiter
from forms.update_profile_form import UpdateProfileForm, ChangePasswordForm

user_bp = Blueprint('user', __name__)

@user_bp.route('/')
def homepage():
    if current_user.is_authenticated:
        if current_user.role == 'admin':
            return redirect(url_for('admin.admin_dashboard'))
        
        return render_template('homepage.html')
    return render_template('homepage.html')

@user_bp.route('/user_products')
def user_products():
    return render_template('user_products.html')



@user_bp.route('/user_profile', methods=['GET', 'POST'])
@login_required
@limiter.limit("10 per minute")
def user_profile():
    profile_form = UpdateProfileForm()
    password_form = ChangePasswordForm()

    if request.method == "GET":
        profile_form.first_name.data = current_user.first_name
        profile_form.last_name.data = current_user.last_name
        profile_form.phone.data = current_user.phone
        profile_form.address.data = current_user.address
        
    if profile_form.validate_on_submit() and profile_form.submit_profile.data:
        current_user.first_name = profile_form.first_name.data.strip().title()
        current_user.last_name = profile_form.last_name.data.strip().title()
        current_user.phone = profile_form.phone.data.strip().title()
        current_user.address = profile_form.address.data.title()

        remove_photo_signal = request.form.get('remove_photo') == 'true'

        if remove_photo_signal:
            if current_user.profile_pic and not current_user.profile_pic.startswith('http'):
                old_file_path = os.path.join(current_app.root_path, 'static', current_user.profile_pic)
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)

            current_user.profile_pic = None

        else:
            file = profile_form.profile_pic.data
            if file:
                filename = secure_filename(f"{current_user.id}_{file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'profiles')

                if not os.path.exists(upload_folder):
                    os.makedirs(upload_folder)

                if current_user.profile_pic and not current_user.profile_pic.startswith('http'):
                    old_path = os.path.join(current_app.root_path, 'static', current_user.profile_pic)
                    if os.path.exists(old_path):
                        os.remove(old_path)

                file.save(os.path.join(upload_folder, filename))
                current_user.profile_pic = f"uploads/profiles/{filename}"

        try:
            db.session.commit()
            return jsonify(status="success", message="Profile updated successfully!")
        except:
            db.session.rollback()
            return jsonify(status="error", message="Failed to update profile.")

    return render_template(
        "user_profile.html",
        profile_form=profile_form,
        password_form=password_form
    )


@user_bp.route('/change_password', methods=['POST'])
@login_required
def change_password():
    form = ChangePasswordForm()
    if form.validate_on_submit():
        if current_user.password_hash:
            try:
                passhasher.verify(current_user.password_hash, form.current_password.data)
            except:
                return jsonify(status="error", errors={"current_password":["Current password is incorrect."]})

        current_user.password_hash = passhasher.hash(form.new_password.data)
        try:
            db.session.commit()
            return jsonify(status="success", message="Password updated successfully!")
        except:
            db.session.rollback()
            return jsonify(status="error", errors={"new_password":["An error occurred while updating password."]})
    else:
        errors = {}
        for field, msgs in form.errors.items():
            errors[field] = msgs
        return jsonify(status="error", errors=errors)