from flask import Blueprint, render_template, url_for, redirect, flash, request, jsonify, current_app
from flask_login import current_user
from extensions import db, limiter
from flask_login import login_required
from functools import wraps
from models.product import Product
from models.customer import Customer
from models.users import User
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid



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
    
    birthday_str = request.form.get('birthday')
    gender = request.form.get('gender')
    
    file = request.files.get('valid_id')


    if not all([full_name, contact_number, home_address, birthday_str, gender]):
        flash("All fields are required.", "error")
        return redirect(request.referrer)

    parts = full_name.strip().split()
    if len(parts) < 2:
        flash("Please enter full name (first and last).", "error")
        return redirect(request.referrer)

    first_name = parts[0]
    last_name = " ".join(parts[1:])

    try:
        birthday = datetime.strptime(birthday_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        flash("Invalid birthday format.", "error")
        return redirect(request.referrer)

    file_path = None
    if file and file.filename:
        filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        upload_folder = os.path.join('static', 'uploads', 'ids')
        os.makedirs(upload_folder, exist_ok=True)
        
        file.save(os.path.join(upload_folder, filename))
        file_path = f"uploads/ids/{filename}"

    customer = Customer(
        user_id=None,
        first_name=first_name.title(),
        last_name=last_name.title(),
        birthday=birthday,        
        gender=gender.title(),            
        contact_number=contact_number,
        home_address=home_address,
        created_by_id=current_user.id,
        valid_id_path=file_path,
        id_uploaded_at=datetime.utcnow() if file_path else None
    )

    try:
        db.session.add(customer)
        db.session.commit()
        flash("Customer registered successfully!", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"An error occurred: {str(e)}", "error")

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
                "full_name": f"{customer.first_name} {customer.last_name}",
                "phone": customer.contact_number,
                "address": customer.home_address,
                
                "birthday": customer.birthday.strftime('%Y-%m-%d') if customer.birthday else "",
                "gender": customer.gender or "",

                "valid_id_path": url_for('static', filename=customer.valid_id_path) if customer.valid_id_path else None,
                "profile_path": url_for('static', filename=customer.user.profile_path) if customer.user and customer.user.profile_path else None
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching customer {id}: {e}")
        return jsonify({
            "status": "error",
            "message": "Something went wrong while loading customer details. Please try again later."
        }), 500



@admin_bp.route('/update-customer', methods=['POST'])
@login_required
@administrator_required
def update_customer():
    customer_id = request.form.get("customer_id")
    customer = Customer.query.get_or_404(customer_id)

    full_name = request.form.get("full_name", "").strip()
    if full_name:
        parts = full_name.split()
        customer.first_name = parts[0]
        customer.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    customer.home_address = request.form.get("home_address", "").strip()
    customer.contact_number = request.form.get("contact_number", "").strip()
    customer.gender = request.form.get("gender").title()

    birthday_str = request.form.get("birthday")
    if birthday_str:
        try:
            customer.birthday = datetime.strptime(birthday_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            flash("Invalid birthday format.", "error")
            return redirect(request.referrer)

    image_file = request.files.get("valid_id")
    if image_file and image_file.filename != '':
        ext = os.path.splitext(image_file.filename)[1]
        random_name = f"ID_{uuid.uuid4().hex[:10]}{ext}"
        
        upload_folder = os.path.join("static", "uploads", "ids")
        os.makedirs(upload_folder, exist_ok=True)
        
        if customer.valid_id_path:
            old_full_path = os.path.join("static", customer.valid_id_path)
            if os.path.exists(old_full_path):
                try:
                    os.remove(old_full_path)
                except Exception as e:
                    print(f"Failed to delete old image: {e}")

        image_path = f"uploads/ids/{random_name}"
        image_file.save(os.path.join("static", image_path))
        
        customer.valid_id_path = image_path
        customer.id_uploaded_at = datetime.utcnow()

    try:
        db.session.commit()
        flash("Customer profile updated successfully!", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Error updating: {str(e)}", "error")

    return redirect(url_for('admin.customers'))


@admin_bp.route('/products')
@limiter.exempt
@login_required
@administrator_required
def products():
    
    products = Product.query.all()
    return render_template("admin/products.html", products=products)


@admin_bp.route('/add-product', methods=['POST'])
@login_required
@administrator_required
def add_product():
    equipment_type = request.form.get("equipment_type", "").strip()
    model = request.form.get("model", "").strip()
    
    description = request.form.get("description", "").strip()
    
    stock = request.form.get("stock")
    rent_price = request.form.get("rent_price")
    sale_price = request.form.get("sale_price")
    image_file = request.files.get("image")

    if not equipment_type:
        flash("Equipment Type is required.", "error")
        return redirect(request.referrer)

    image_path = None
    if image_file and image_file.filename != '':
        ext = os.path.splitext(image_file.filename)[1].lower()
        
        random_name = f"{uuid.uuid4().hex}{ext}"
        
        upload_folder = os.path.join("static", "uploads", "products")
        os.makedirs(upload_folder, exist_ok=True)
        
        image_path = f"uploads/products/{random_name}"
        full_path = os.path.join("static", image_path)
        
        try:
            image_file.save(full_path)
        except Exception as e:
            flash(f"Failed to save image: {str(e)}", "error")
            return redirect(request.referrer)

    try:
        new_product = Product(
            asset_tag=None, 
            equipment_type=equipment_type,
            model=model,
            description=description, 
            stock=int(stock) if stock else 0,
            rent_price=float(rent_price) if rent_price else 0.0,
            sale_price=float(sale_price) if sale_price else 0.0,
            image=image_path
        )
        db.session.add(new_product)
        db.session.commit()
        flash(f"Product '{equipment_type}' added successfully!", "success")
        
    except Exception as e:
        db.session.rollback()
        if image_path:
            abs_image_path = os.path.join("static", image_path)
            if os.path.exists(abs_image_path):
                os.remove(abs_image_path)
        flash(f"Error saving product: {str(e)}", "error")

    return redirect(url_for('admin.products'))

@admin_bp.route('/edit-product/<int:product_id>', methods=['POST'])
@login_required
@administrator_required
def edit_product(product_id):
    # 1. Fetch the existing product or return 404 if not found
    product = Product.query.get_or_404(product_id)
    
    # 2. Retrieve and sanitize text data from the form
    equipment_type = request.form.get("equipment_type", "").strip()
    model = request.form.get("model", "").strip()
    description = request.form.get("description", "").strip()
    
    # 3. Basic Validation
    if not equipment_type:
        flash("Equipment Type is required.", "error")
        return redirect(url_for('admin.products'))

    # 4. Handle Numeric Conversions (with defaults)
    try:
        product.equipment_type = equipment_type
        product.model = model
        product.description = description
        product.stock = int(request.form.get("stock") or 0)
        product.rent_price = float(request.form.get("rent_price") or 0.0)
        product.sale_price = float(request.form.get("sale_price") or 0.0)
    except ValueError:
        flash("Invalid numeric value provided for stock or price.", "error")
        return redirect(url_for('admin.products'))

    # 5. Handle Image Update
    image_file = request.files.get("image")
    if image_file and image_file.filename != '':
        # Delete the old image file if a new one is being uploaded
        if product.image:
            old_path = os.path.join("static", product.image)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    print(f"Warning: Could not delete old image {old_path}: {e}")

        # Save the new image with a unique filename
        ext = os.path.splitext(image_file.filename)[1].lower()
        random_name = f"{uuid.uuid4().hex}{ext}"
        
        upload_folder = os.path.join("static", "uploads", "products")
        os.makedirs(upload_folder, exist_ok=True)
        
        new_image_rel_path = f"uploads/products/{random_name}"
        full_path = os.path.join("static", new_image_rel_path)
        
        image_file.save(full_path)
        product.image = new_image_rel_path

    # 6. Commit changes to the database
    try:
        db.session.commit()
        flash(f"Updated {product.equipment_type} successfully!", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Database error: {str(e)}", "error")

    return redirect(url_for('admin.products'))

@admin_bp.route('/delete-product/<int:product_id>', methods=['POST'])
@login_required
@administrator_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    try:
        if product.image:
            image_full_path = os.path.join(current_app.root_path, 'static', product.image)
            if os.path.exists(image_full_path):
                os.remove(image_full_path)
        
        db.session.delete(product)
        db.session.commit()
        
        flash(f"Product '{product.equipment_type}' deleted successfully.", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Error deleting product: {str(e)}", "error")
        
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