import os
from flask import Blueprint, render_template, request, current_app, jsonify, redirect, url_for, flash
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename
from extensions import db, passhasher, limiter
from forms.update_profile_form import UpdateProfileForm, ChangePasswordForm
from functools import wraps
from models.customer import Customer
from models.product import Product
import random

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
    all_products = Product.query.all()
    
    rent_only = [p for p in all_products if p.transaction_type == 'Rent']
    sale_only = [p for p in all_products if p.transaction_type == 'Sale']
    both_types = [p for p in all_products if p.transaction_type == 'Both']

    featured_products = []
    if rent_only:
        featured_products.append(random.choice(rent_only))
    if sale_only:
        featured_products.append(random.choice(sale_only))
    if both_types:
        featured_products.append(random.choice(both_types))

    return render_template('user/homepage.html', products=featured_products)


from flask import request, render_template
from sqlalchemy import or_

@user_bp.route('/products')
@admin_redirect
def products():
    # 1. Get filter parameters from the URL (e.g., /products?category=Hospital+Beds)
    category = request.args.get('category', 'All')
    search_query = request.args.get('search', '').strip()
    sort_option = request.args.get('sort', 'default')

    # 2. Start the base query
    query = Product.query

    # 3. Apply Category Filter
    if category != 'All':
        query = query.filter(Product.equipment_type == category)

    # 4. Apply Search Filter (Searches Name or Description)
    if search_query:
        query = query.filter(
            or_(
                Product.name.ilike(f'%{search_query}%'),
                Product.equipment_type.ilike(f'%{search_query}%'),
                Product.description.ilike(f'%{search_query}%')
            )
        )

    # 5. Apply Sorting
    if sort_option == 'price-low':
        # Sorts by Sale Price first, then Rent Price
        query = query.order_by(Product.sale_price.asc(), Product.rent_price.asc())
    elif sort_option == 'price-high':
        query = query.order_by(Product.sale_price.desc(), Product.rent_price.desc())

    # 6. Execute and Render
    all_products = query.all()
    return render_template('user/products.html', 
                           products=all_products, 
                           current_category=category)


@user_bp.route('/profile', methods=['GET', 'POST'])
@login_required
@customer_required
@limiter.limit("10 per minute")
def profile():
    profile_form = UpdateProfileForm()
    password_form = ChangePasswordForm()

    # Ensure the user has a customer profile
    if not current_user.customer_profile:
        current_user.customer_profile = Customer(user_id=current_user.id)
        db.session.add(current_user.customer_profile)
        db.session.commit()

    customer = current_user.customer_profile

    if request.method == "GET":
        profile_form.first_name.data = customer.first_name
        profile_form.last_name.data = customer.last_name
        profile_form.phone.data = customer.contact_number
        profile_form.address.data = customer.home_address

        return render_template("user/profile.html", profile_form=profile_form, password_form=password_form)

    if profile_form.validate_on_submit() and profile_form.submit_profile.data:
        try:
            # Update customer profile
            customer.first_name = profile_form.first_name.data.strip().title()
            customer.last_name = profile_form.last_name.data.strip().title()
            customer.contact_number = profile_form.phone.data.strip()
            customer.home_address = profile_form.address.data.title()

            # Handle profile photo
            remove_photo_signal = request.form.get('remove_photo') == 'true'
            new_file = profile_form.profile_path.data

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
            return jsonify(
                status="success",
                message="Your profile has been updated successfully!"
            )

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Profile update failed: {e}")
            return jsonify(status="error", message="Oops! We couldn’t update your profile. Please try again.",)

    if request.method == "POST":
        error_messages = []
        for field, errors in profile_form.errors.items():
            for error in errors:
                error_messages.append(f"{field.replace('_', ' ').title()}: {error}")

        return jsonify(status="error", message="Please correct the highlighted fields and try again.", errors=error_messages)

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