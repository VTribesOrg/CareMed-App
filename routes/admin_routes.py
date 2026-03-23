from flask import Blueprint, render_template, url_for, redirect, flash, request
from flask_login import current_user
from extensions import db, limiter
from flask_login import login_required
from functools import wraps
from models.product import Product
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
    return render_template("admin/customers.html")




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
        image_path = f"uploads/{filename}"
        image_file.save(os.path.join("static", image_path))

    new_product = Products(
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