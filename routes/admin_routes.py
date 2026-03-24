import datetime

from flask import Blueprint, render_template, url_for, redirect, flash, request, jsonify, current_app
from flask_login import current_user
from extensions import db, limiter
from flask_login import login_required
from functools import wraps
from models.product import Product
from models.customer import Customer
from models.users import User
from werkzeug.utils import secure_filename
import os



admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def administrator_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.role.strip() != 'Administrator':
            flash("Unauthorized access.", "error")
            return redirect(url_for('user.homepage'))
        return f(*args, **kwargs)
    return decorated_function




@admin_bp.route('dashboard')
@limiter.exempt
@login_required
@administrator_required
def dashboard():
    
    return render_template("admin/dashboard.html")

@admin_bp.route('/customers')
@limiter.exempt
@login_required
@administrator_required
def customers():
 
    customers = Customer.query.options(db.joinedload(Customer.creator)).all()
    return render_template("admin/customers.html", customers=customers)

@admin_bp.route('/admin/add-customer', methods=['POST'])
@login_required
def add_customer():
    full_name = request.form.get('full_name')
    contact_number = request.form.get('contact_number')
    home_address = request.form.get('home_address')
    file = request.files.get('valid_id')

    if not full_name or not contact_number or not home_address:
        flash("All fields are required.", "error")
        return redirect(request.referrer)

    parts = full_name.strip().split()
    if len(parts) < 2:
        flash("Please enter full name (first and last).", "error")
        return redirect(request.referrer)

    first_name = parts[0]
    last_name = " ".join(parts[1:])

    file_path = None
    if file and file.filename:
        filename = secure_filename(file.filename)

        upload_folder = os.path.join('static', 'uploads', 'ids')
        os.makedirs(upload_folder, exist_ok=True)

        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

    customer = Customer(
        user_id=None,
        first_name=first_name,
        last_name=last_name,
        contact_number=contact_number,
        home_address=home_address,
        created_by_id=current_user.id,
        valid_id_path=file_path,
        id_uploaded_at=datetime.utcnow() if file_path else None
        
    )

    db.session.add(customer)
    db.session.commit()

    flash("Customer registered successfully!", "success")
    return redirect(url_for('admin.customers'))


@admin_bp.route('/get_customer/<int:id>')
@login_required
@administrator_required
def get_customer(id):
    try:
        customer = Customer.query.options(
            db.joinedload(Customer.user)
        ).get(id)

        if not customer:
            return jsonify({
                "status": "error",
                "message": "We couldn’t find the selected customer. Please refresh and try again."
            }), 404

        return jsonify({
            "status": "success",
            "data": {
                "id": customer.id,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "contact_number": customer.contact_number,
                "home_address": customer.home_address,
                "valid_id_path": customer.valid_id_path,
                "profile_path": customer.user.profile_path if customer.user else None
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching customer {id}: {e}")
        return jsonify({
            "status": "error",
            "message": "Something went wrong while loading customer details. Please try again later."
        }), 500



@admin_bp.route('/products')
@limiter.exempt
@login_required
@administrator_required
def products():
    return render_template("admin/products.html")

@admin_bp.route('/add-product', methods=['POST'])
@login_required
@administrator_required
def add_product():
    
    equipment_type = request.form.get("equipment_type")
    model = request.form.get("model")
    stock = request.form.get("stock")
    rent_price = request.form.get("rent_price")
    sale_price = request.form.get("sale_price")

    image_file = request.files.get("image")

    asset_tag = f"{equipment_type[:3].upper()}-{os.urandom(3).hex()}"

    image_path = None

    if image_file:
        filename = secure_filename(image_file.filename)
        image_path = f"uploads/products/{filename}"
        save_path = os.path.join("static", image_path)
        image_file.save(save_path)

    new_product = Product(
        asset_tag=asset_tag,
        equipment_type=equipment_type,
        model=model,
        stock=int(stock or 0),
        rent_price=float(rent_price or 0),
        sale_price=float(sale_price or 0),
        image=image_path
    )

    db.session.add(new_product)
    db.session.commit()

    flash("Product added successfully!", "success")
    return redirect(url_for('admin.products'))


@admin_bp.route('/orders')
@limiter.exempt
@login_required
@administrator_required
def orders():

    
    return render_template("admin/orders.html")


@admin_bp.route('/payments')
@limiter.exempt
@login_required
@administrator_required
def payments():

    
    return render_template("admin/payments.html")

@admin_bp.route('/profile')
@limiter.exempt
@login_required
@administrator_required
def profile():

    
    return render_template("admin/profile.html")

@admin_bp.route('/reports')
@limiter.exempt
@login_required
@administrator_required
def reports():

    
    return render_template("admin/reports.html")