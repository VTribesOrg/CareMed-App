from flask import Blueprint, render_template, url_for, redirect, flash, request, jsonify, current_app
from flask_login import current_user
from extensions import db, limiter, csrf
from flask_login import login_required
from functools import wraps
from models.product import Product, InventoryLog, Transaction, Purchase
from models.customer import Customer
from models.users import User
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid
from decimal import Decimal



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
    first_name = request.form.get('first_name')
    last_name = request.form.get('last_name')
    contact_number = request.form.get('contact_number')
    home_address = request.form.get('home_address')

    birthday_str = request.form.get('birthday')
    gender = request.form.get('gender')

    primary_id_type = request.form.get('primary_id_type')
    secondary_id_type = request.form.get('secondary_id_type')

    valid_id_file = request.files.get('valid_id')
    secondary_id_file = request.files.get('secondary_id')

    if not all([
        first_name, last_name, contact_number, home_address,
        birthday_str, gender, primary_id_type, secondary_id_type,
        valid_id_file, secondary_id_file
    ]):
        flash("All fields including ID uploads are required.", "error")
        return redirect(request.referrer)

    try:
        birthday = datetime.strptime(birthday_str, '%Y-%m-%d').date()
    except ValueError:
        flash("Invalid birthday format.", "error")
        return redirect(request.referrer)

    upload_folder = os.path.join('static', 'uploads', 'ids')
    os.makedirs(upload_folder, exist_ok=True)

    def save_file(file):
        filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        return f"uploads/ids/{filename}"

    try:
        valid_id_path = save_file(valid_id_file)
        secondary_id_path = save_file(secondary_id_file)
    except Exception as e:
        flash("Error uploading files.", "error")
        return redirect(request.referrer)

    customer = Customer(
        user_id=None,
        first_name=first_name.strip().title(),
        last_name=last_name.strip().title(),
        birthday=birthday,
        gender=gender.title(),
        contact_number=contact_number.strip(),
        home_address=home_address.strip(),
        primary_id_type=primary_id_type,
        secondary_id_type=secondary_id_type,
        valid_id_path=valid_id_path,
        secondary_id_path=secondary_id_path,
        id_uploaded_at=datetime.utcnow(),
        is_id_verified=False,
        created_by_id=current_user.id
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
                "first_name": customer.first_name or "N/A",
                "last_name": customer.last_name or "N/A",
                "full_name": f"{customer.first_name} {customer.last_name}",

                "contact_number": customer.contact_number or "N/A",
                "home_address": customer.home_address or "N/A",

                "birthday": customer.birthday.strftime('%Y-%m-%d') if customer.birthday else "",
                "gender": customer.gender or "N/A",

                "primary_id_type": customer.primary_id_type or "N/A",
                "secondary_id_type": customer.secondary_id_type or "N/A",

                "valid_id_path": url_for('static', filename=customer.valid_id_path) if customer.valid_id_path else None,
                "secondary_id_path": url_for('static', filename=customer.secondary_id_path) if customer.secondary_id_path else None,

                "is_id_verified": customer.is_id_verified,
                "id_uploaded_at": customer.id_uploaded_at.strftime('%Y-%m-%d %H:%M:%S') if customer.id_uploaded_at else None,

                "profile_path": url_for('static', filename=customer.user.profile_path)
                    if customer.user and customer.user.profile_path else None
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

    first_name = request.form.get("first_name", "").strip()
    last_name = request.form.get("last_name", "").strip()
    if first_name:
        customer.first_name = first_name.capitalize()
    if last_name:
        customer.last_name = " ".join([part.capitalize() for part in last_name.split()])

    gender = request.form.get("gender", "").strip()
    if gender:
        customer.gender = gender[0].upper() + gender[1:].lower()

    customer.home_address = request.form.get("home_address", "").strip().title()
    customer.contact_number = request.form.get("contact_number", "").strip()

    birthday_str = request.form.get("birthday")
    if birthday_str:
        try:
            customer.birthday = datetime.strptime(birthday_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            flash("Invalid birthday format.", "error")
            return redirect(request.referrer)

    def handle_id(file_key, old_path_attr, remove_flag_name):
        remove_flag = request.form.get(remove_flag_name)
        image_file = request.files.get(file_key)
        old_path = getattr(customer, old_path_attr)

        if remove_flag == "true" and old_path:
            old_full = os.path.join("static", old_path)
            if os.path.exists(old_full):
                try:
                    os.remove(old_full)
                except Exception as e:
                    current_app.logger.error(f"Failed to delete old ID: {e}")
            setattr(customer, old_path_attr, None)

        elif image_file and image_file.filename:
            ext = os.path.splitext(image_file.filename)[1].lower()
            random_name = f"ID_{uuid.uuid4().hex[:10]}{ext}"
            upload_folder = os.path.join("static", "uploads", "ids")
            os.makedirs(upload_folder, exist_ok=True)

            if old_path:
                old_full = os.path.join("static", old_path)
                if os.path.exists(old_full):
                    try:
                        os.remove(old_full)
                    except Exception as e:
                        current_app.logger.error(f"Failed to delete old ID: {e}")

            image_path = f"uploads/ids/{random_name}"
            image_file.save(os.path.join("static", image_path))
            setattr(customer, old_path_attr, image_path)
            if file_key == "valid_id":
                customer.id_uploaded_at = datetime.utcnow()


    handle_id("valid_id", "valid_id_path", "remove_valid_id")
    handle_id("secondary_id", "secondary_id_path", "remove_secondary_id")


    customer.primary_id_type = request.form.get("primary_id_type", "").strip()
    customer.secondary_id_type = request.form.get("secondary_id_type", "").strip()

    try:
        db.session.commit()
        flash("Customer profile updated successfully!", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Error updating customer: {str(e)}", "error")

    return redirect(url_for("admin.customers"))


@admin_bp.route('/products')
@limiter.exempt
@login_required
@administrator_required
def products():
    
    products = Product.query.all()
    customers = Customer.query.order_by(Customer.last_name).all() 
    
    return render_template("admin/products.html", products=products, customers=customers)


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
        db.session.flush()  

        log = InventoryLog(
            product_id=new_product.id,
            action="Add Product",
            quantity=new_product.stock,
            note=f"Initial product added: {equipment_type}",
            user_id=current_user.id,
            user_name=f"{current_user.first_name} {current_user.last_name}"
        )
        db.session.add(log)
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
    product = Product.query.get_or_404(product_id)
    
    new_type = request.form.get("equipment_type", "").strip()
    new_model = request.form.get("model", "").strip()
    new_description = request.form.get("description", "").strip()
    
    if not new_type:
        flash("Equipment Type is required.", "error")
        return redirect(url_for('admin.products'))

    changes = []

    try:
        if product.equipment_type != new_type:
            changes.append(f"Type: {product.equipment_type} → {new_type}")
            product.equipment_type = new_type

        if (product.model or "") != new_model:
            changes.append(f"Model: {product.model or 'N/A'} → {new_model}")
            product.model = new_model

        if (product.description or "").strip() != new_description:
            changes.append("Description updated")
            product.description = new_description

        new_stock = int(request.form.get("stock") or 0)
        if product.stock != new_stock:
            changes.append(f"Stock: {product.stock} → {new_stock}")
            product.stock = new_stock

        new_rent = float(request.form.get("rent_price") or 0.0)
        if float(product.rent_price or 0.0) != new_rent:
            changes.append(f"Rent: ₱{product.rent_price} → ₱{new_rent}")
            product.rent_price = new_rent

        new_sale = float(request.form.get("sale_price") or 0.0)
        if float(product.sale_price or 0.0) != new_sale:
            changes.append(f"Price: ₱{product.sale_price} → ₱{new_sale}")
            product.sale_price = new_sale

    except ValueError:
        flash("Invalid numeric value provided for stock or price.", "error")
        return redirect(url_for('admin.products'))

    image_file = request.files.get("image")
    if image_file and image_file.filename != '':
        if product.image:
            old_path = os.path.join("static", product.image)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    print(f"Warning: Could not delete old image: {e}")

        ext = os.path.splitext(image_file.filename)[1].lower()
        random_name = f"{uuid.uuid4().hex}{ext}"
        upload_folder = os.path.join("static", "uploads", "products")
        os.makedirs(upload_folder, exist_ok=True)
        
        new_image_rel_path = f"uploads/products/{random_name}"
        image_file.save(os.path.join("static", new_image_rel_path))
        
        product.image = new_image_rel_path
        changes.append("Product image updated")

    try:
        if changes:
            log_note = f"Changes: {'; '.join(changes)}"
            
            inventory_log = InventoryLog(
                product_id=product.id,
                action="Product Edited",
                quantity=product.stock,
                note=log_note,
                user_id=current_user.id,
                user_name=f"{current_user.first_name} {current_user.last_name}"
            )
            db.session.add(inventory_log)
        
        db.session.commit()
        flash(f"Updated {product.equipment_type} successfully!", "success")

    except Exception as e:
        db.session.rollback()
        flash(f"Database error: {str(e)}", "error")

    return redirect(url_for('admin.products'))

@admin_bp.route('/update_stock/<int:product_id>', methods=['POST'])
@login_required
@csrf.exempt
def update_stock(product_id):
    data = request.get_json()
    product = Product.query.get_or_404(product_id)
    
    increment = int(data.get('increment', 0))
    reason = data.get('reason', 'No reason provided')

    if increment <= 0:
        return jsonify({
            "success": False,
            "message": "Quantity must be greater than 0."
        }), 400

    try:
        product.stock += increment
        db.session.flush()  

        log = InventoryLog(
            product_id=product.id,
            action="Restock",
            quantity=increment,
            note=reason,
            user_id=current_user.id if current_user.is_authenticated else None,
            user_name=f"{current_user.first_name} {current_user.last_name}" 
                      if current_user.is_authenticated else "Unknown"
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({
            "success": True,
            "new_stock": product.stock,
            "message": f"Successfully added {increment} units to '{product.equipment_type}'."
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to update stock: {str(e)}"}), 500
    
        
@admin_bp.route('/delete-product/<int:product_id>', methods=['POST'])
@login_required
@administrator_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)

    try:
        log_note = f"Product deleted by {current_user.first_name} {current_user.last_name} (ID: {current_user.id})"
        inventory_log = InventoryLog(
            product_id=product.id,           
            action="Deleted Product",      
            quantity=product.stock,          
            note=log_note,                   
            user_id=current_user.id,
            user_name=f"{current_user.first_name} {current_user.last_name}"
        )
        db.session.add(inventory_log)
        db.session.flush() 

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


@admin_bp.route('/process-purchase', methods=['POST'])
@login_required
@administrator_required
def process_purchase():
    try:
        data = request.get_json()

        product_id = int(data.get('product_id')) if data.get('product_id') else None
        customer_id = int(data.get('customer_id')) if data.get('customer_id') else None
        quantity = int(data.get('quantity', 0))
        unit_price = Decimal(str(data.get('unit_price', 0)))
        total_price = unit_price * quantity
        warranty_or_notes = data.get('warranty_or_notes', '').strip() 

        if not product_id or not customer_id or quantity <= 0:
            return jsonify({"success": False, "message": "Missing product, customer, or quantity."}), 400

        product = Product.query.get(product_id)
        customer = Customer.query.get(customer_id)

        if not product:
            return jsonify({"success": False, "message": "Product not found."}), 404
        
        if not customer:
            return jsonify({"success": False, "message": "Customer not found in the database."}), 404

        if product.stock < quantity:
            return jsonify({"success": False, "message": f"Insufficient stock. Only {product.stock} units left."}), 400

        new_transaction = Transaction(
            customer_id=customer_id,
            transaction_type='Purchase',
            total_amount=total_price,
            payment_status='Paid'
        )
        db.session.add(new_transaction)
        db.session.flush()

        new_purchase = Purchase(
            transaction_id=new_transaction.id,
            product_id=product.id,
            customer_id=customer_id,
            quantity=quantity,
            unit_price=unit_price,
            total_price=total_price,
            warranty_or_notes=warranty_or_notes
        )
        db.session.add(new_purchase)


        product.stock -= quantity

        p_name = f"{product.equipment_type} ({product.model})" if product.model else product.equipment_type
        

        log_note = f"Sold {quantity} unit(s) of {p_name} to {customer.full_name}."
        if warranty_or_notes:
            log_note += f" Ref: {warranty_or_notes}"

        inventory_log = InventoryLog(
            product_id=product.id,
            action="Sale",
            quantity=-quantity,
            note=log_note,
            user_id=current_user.id,
            user_name=f"{current_user.first_name} {current_user.last_name}"
        )
        db.session.add(inventory_log)

        db.session.commit()
        return jsonify({"success": True, "message": f"Sale processed for {customer.full_name}"})

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Purchase Error: {str(e)}")
        return jsonify({"success": False, "message": f"Server Error: {str(e)}"}), 500
    

@admin_bp.route('/product/<int:product_id>/history')
@login_required
@administrator_required
def product_history(product_id):
    logs = InventoryLog.query.filter_by(product_id=product_id)\
        .order_by(InventoryLog.created_at.desc()).all()

    result = []
    for log in logs:
        result.append({
            "type": "log",
            "action": log.action,
            "quantity": log.quantity,
            "note": log.note,
            "user": log.user_name,
            "date": log.created_at.strftime("%b %d, %Y %I:%M %p")
        })

    return jsonify(result)

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