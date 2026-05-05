from flask import Blueprint, render_template, url_for, redirect, flash, request, jsonify, current_app
from flask_login import current_user
from extensions import db, limiter, csrf
from sqlalchemy.orm import joinedload
from sqlalchemy import func, or_
from flask_login import login_required
from functools import wraps
from models.product import Product, InventoryLog, Transaction, Purchase, Payment, Rental, RentalInvoice
from models.customer import Customer
from models.users import User, SecurityLog, BlockedIP
from flask_mail import Message
from flask import current_app
from werkzeug.utils import secure_filename
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import joinedload, selectinload
import os
import uuid
import random, string

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def administrator_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.role.strip() != 'Administrator':
            flash("Unauthorized access.", "error")
            return redirect(url_for('user.homepage'))
        return f(*args, **kwargs)
    return decorated_function



@admin_bp.route('/dashboard')
@login_required
def dashboard():
    total_sales = db.session.query(func.sum(Transaction.amount_paid)).filter_by(transaction_type='Sale').scalar() or 0
    total_rentals = db.session.query(func.sum(Payment.amount)).join(Transaction).filter(
        Transaction.transaction_type == 'Rental',
        Payment.status == 'Completed'
    ).scalar() or 0
    active_rentals_count = Rental.query.filter_by(status='Active').count()
    total_inventory = db.session.query(func.sum(Product.stock + Product.stock_empty)).scalar() or 0
    low_stock_count = Product.query.filter(Product.stock <= 5).count()

    recent_logs = InventoryLog.query.order_by(InventoryLog.created_at.desc()).limit(5).all()

    security_alerts = SecurityLog.query.order_by(SecurityLog.created_at.desc()).limit(3).all()

    return render_template('admin/dashboard.html', 
                           total_sales=total_sales,
                           total_rentals=total_rentals,
                           active_rentals_count=active_rentals_count,
                           total_inventory=total_inventory,
                           low_stock_count=low_stock_count,
                           recent_logs=recent_logs,
                           security_alerts=security_alerts)

@admin_bp.route('/customers')
@login_required
@administrator_required
def customers():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search_query = request.args.get('q', '').strip()

    query = Customer.query

    if search_query:
        query = query.filter(or_(
            Customer.first_name.ilike(f"%{search_query}%"),
            Customer.last_name.ilike(f"%{search_query}%"),
            Customer.contact_number.ilike(f"%{search_query}%")
        ))

    pagination = query.order_by(Customer.last_name.asc()).paginate(
        page=page,
        per_page=limit,
        error_out=False
    )

    return render_template(
        "admin/customers.html",
        customers=pagination.items,
        pagination=pagination,
        search_query=search_query,
        current_limit=limit
    )


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
                "message": "Customer record not found."
            }), 404


        profile_url = None
        if customer.user and customer.user.profile_path:
            if customer.user.profile_path.startswith(('http://', 'https://')):
                profile_url = customer.user.profile_path
            else:
                profile_url = url_for('static', filename=customer.user.profile_path)

        return jsonify({
            "status": "success",
            "data": {
                "id": customer.id,
                "first_name": customer.first_name or "N/A",
                "last_name": customer.last_name or "N/A",
                "full_name": customer.full_name, 
                
                "contact_number": customer.contact_number or "N/A",
                "home_address": customer.home_address or "N/A",
                
                "birthday": customer.birthday.strftime('%Y-%m-%d') if customer.birthday else "N/A",
                "gender": customer.gender or "N/A",
                
                "is_active": customer.is_active,
                
                "is_id_verified": customer.is_id_verified,
                "primary_id_type": customer.primary_id_type or "Not Set",
                "secondary_id_type": customer.secondary_id_type or "Not Set",
                
                "valid_id_path": url_for('static', filename=customer.valid_id_path) if customer.valid_id_path else None,
                "secondary_id_path": url_for('static', filename=customer.secondary_id_path) if customer.secondary_id_path else None,
                
                "id_uploaded_at": customer.id_uploaded_at.strftime('%b %d, %Y %I:%M %p') if customer.id_uploaded_at else "Never",
                
                "has_online_account": True if customer.user_id else False,
                "email": customer.user.email if customer.user else "Walk-in / No Email",
                "profile_path": profile_url,
                
                "created_at": customer.created_at.strftime('%Y-%m-%d %H:%M:%S') if customer.created_at else None
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching customer {id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An internal server error occurred while retrieving customer data."
        }), 500


@admin_bp.route('/customers/<int:id>')
def customer_details(id):
    customer = Customer.query.get_or_404(id)

    transactions = (Transaction.query .filter_by(customer_id=id) .order_by(Transaction.created_at.desc()).all())

    return render_template('admin/customer_details.html', customer=customer, transactions=transactions)

@admin_bp.route('/customers/<int:id>/verify', methods=['POST'])
def verify_customer(id):
    customer = Customer.query.get_or_404(id)
    
    if customer.is_id_verified:
        flash(f"Notice: {customer.full_name} is already a verified user.", "info")
        return redirect(url_for('admin.customer_details', id=id))

    try:
        customer.is_id_verified = True
        db.session.commit()
        flash(f"Identity Verification Complete: {customer.full_name} has been successfully verified.", "success")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Verification Failed for ID {id}: {str(e)}") 
        flash("An internal error occurred while processing the verification. Please refresh and try again.", "danger")
        
    return redirect(url_for('admin.customer_details', id=id))

@admin_bp.route('/customers/<int:id>/unverify', methods=['POST'])
def unverify_customer(id):
    customer = Customer.query.get_or_404(id)
    
    try:
        customer.is_id_verified = False
        db.session.commit()
        flash(f"Verification Revoked: {customer.full_name}'s identity status has been reset to unverified.", "warning")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Revoke Error for ID {id}: {str(e)}")
        flash("Action Failed: System encountered an error while revoking verification. Please try again.", "danger")
        
    return redirect(url_for('admin.customer_details', id=id))


@admin_bp.route('/admin/add-customer', methods=['POST'])
@login_required
def add_customer():

    if current_user.role not in ['Administrator', 'Staff']:
        flash("Unauthorized access.", "error")
        return redirect(url_for('user.homepage'))


    first_name = request.form.get('first_name', '').strip().title()
    last_name = request.form.get('last_name', '').strip().title()
    contact_number = request.form.get('contact_number', '').strip()
    home_address = request.form.get('home_address', '').strip()
    birthday_str = request.form.get('birthday')
    gender = request.form.get('gender')
    primary_id_type = request.form.get('primary_id_type')
    secondary_id_type = request.form.get('secondary_id_type')


    if not all([first_name, last_name, contact_number, birthday_str]):
        flash("Basic details (Name, Contact, Birthday) are required.", "error")
        return redirect(request.referrer)

    try:
        birthday = datetime.strptime(birthday_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        flash("Invalid birthday format. Please use YYYY-MM-DD.", "error")
        return redirect(request.referrer)


    existing = Customer.query.filter_by(
        first_name=first_name, 
        last_name=last_name, 
        birthday=birthday
    ).first()
    if existing:
        flash(f"A customer named {first_name} {last_name} with this birthday already exists.", "warning")
        return redirect(request.referrer)


    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'ids')
    os.makedirs(upload_folder, exist_ok=True)

    def save_id_file(file):
        if not file or file.filename == '':
            return None

        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        return f"uploads/ids/{filename}"

    valid_id_file = request.files.get('valid_id')
    secondary_id_file = request.files.get('secondary_id')

    valid_id_path = save_id_file(valid_id_file)
    secondary_id_path = save_id_file(secondary_id_file)


    new_customer = Customer(
        user_id=None, 
        first_name=first_name,
        last_name=last_name,
        birthday=birthday,
        gender=gender,
        contact_number=contact_number,
        home_address=home_address,
        primary_id_type=primary_id_type,
        secondary_id_type=secondary_id_type,
        valid_id_path=valid_id_path,
        secondary_id_path=secondary_id_path,
        id_uploaded_at=datetime.utcnow(),
        is_id_verified=True if valid_id_path else False,
        created_by_id=current_user.id,
        is_active=True 
    )

    try:
        db.session.add(new_customer)
        log = InventoryLog(
            action="Admin Created Customer",
            note=f"Customer {first_name} {last_name} added manually by {current_user.email}",
            user_id=current_user.id,
            user_name=f"{current_user.first_name} {current_user.last_name}"
        )
        db.session.add(log)
        
        db.session.commit()
        flash(f"Customer {new_customer.full_name} added successfully!", "success")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Customer Creation Error: {str(e)}")
        flash("A database error occurred. Please try again.", "error")

    return redirect(url_for('admin.customers'))



@admin_bp.route('/update-customer', methods=['POST'])
@login_required
@administrator_required
def update_customer():
    customer_id = request.form.get("customer_id")
    customer = Customer.query.options(db.joinedload(Customer.user)).get_or_404(customer_id)

    first_name = request.form.get("first_name", "").strip().title()
    last_name = request.form.get("last_name", "").strip().title()
    
    if first_name:
        customer.first_name = first_name
        if customer.user: customer.user.first_name = first_name
    if last_name:
        customer.last_name = last_name
        if customer.user: customer.user.last_name = last_name

    gender = request.form.get("gender", "").strip().capitalize()
    if gender:
        customer.gender = gender

    customer.home_address = request.form.get("home_address", "").strip().title()
    customer.contact_number = request.form.get("contact_number", "").strip()


    is_active_val = request.form.get("is_active") == "on"
    if customer.is_active != is_active_val:
        customer.is_active = is_active_val
        if customer.user:
            customer.user.is_active = is_active_val 

    birthday_str = request.form.get("birthday")
    if birthday_str:
        try:
            customer.birthday = datetime.strptime(birthday_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            flash("Invalid birthday format.", "error")
            return redirect(request.referrer)

    def handle_id(file_key, path_attr, remove_flag_name):
        remove_flag = request.form.get(remove_flag_name)
        image_file = request.files.get(file_key)
        old_path = getattr(customer, path_attr)

        if remove_flag == "true" and old_path:
            full_path = os.path.join(current_app.root_path, 'static', old_path)
            if os.path.exists(full_path):
                os.remove(full_path)
            setattr(customer, path_attr, None)

        elif image_file and image_file.filename:
            ext = os.path.splitext(image_file.filename)[1].lower()
            filename = f"ID_{uuid.uuid4().hex[:12]}{ext}"
            relative_path = f"uploads/ids/{filename}"
            absolute_path = os.path.join(current_app.root_path, 'static', 'uploads', 'ids')
            
            os.makedirs(absolute_path, exist_ok=True)
            
            if old_path:
                old_full = os.path.join(current_app.root_path, 'static', old_path)
                if os.path.exists(old_full):
                    os.remove(old_full)

            image_file.save(os.path.join(absolute_path, filename))
            setattr(customer, path_attr, relative_path)
            if file_key == "valid_id":
                customer.id_uploaded_at = datetime.utcnow()

    handle_id("valid_id", "valid_id_path", "remove_valid_id")
    handle_id("secondary_id", "secondary_id_path", "remove_secondary_id")

    customer.primary_id_type = request.form.get("primary_id_type", "").strip()
    customer.secondary_id_type = request.form.get("secondary_id_type", "").strip()

    customer.is_id_verified = request.form.get("is_id_verified") == "on"

    try:
        audit_log = InventoryLog(
            action="Admin Updated Customer",
            note=f"Customer ID {customer.id} updated by {current_user.first_name}",
            user_id=current_user.id,
            user_name=current_user.full_name
        )
        db.session.add(audit_log)
        
        db.session.commit()
        flash(f"Profile for {customer.full_name} updated successfully!", "success")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update Error: {e}")
        flash("An error occurred while saving changes.", "error")

    return redirect(url_for("admin.customers"))

@admin_bp.route('/products')
@limiter.exempt
@login_required
@administrator_required
def products():

    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search_query = request.args.get('q', '').strip()
    equipment_type = request.args.get('type', 'all')  

    query = Product.query

    if search_query:
        query = query.filter(or_(
            Product.equipment_type.ilike(f"%{search_query}%"),
            Product.name.ilike(f"%{search_query}%")
        ))

    if equipment_type and equipment_type != 'all':
        query = query.filter(Product.equipment_type.ilike(f"%{equipment_type}%"))

    pagination = query.order_by(
        Product.equipment_type.asc(),
        Product.name.asc()
    ).paginate(
        page=page,
        per_page=limit,
        error_out=False
    )

    start_entry = 0
    end_entry = 0

    if pagination.total > 0:
        start_entry = (pagination.page - 1) * pagination.per_page + 1
        end_entry = min(pagination.page * pagination.per_page, pagination.total)

    stats = {
        'total_inventory': db.session.query(func.sum(Product.stock)).scalar() or 0,
        'low_stock_count': Product.query.filter(Product.stock <= 5).count(),
        'available_for_rent': Product.query.filter_by(status='Available').count()
    }

    customers = Customer.query.filter_by(is_active=True)\
        .order_by(Customer.last_name.asc()).all()

    return render_template(
        "admin/products.html",
        products=pagination.items,
        pagination=pagination,
        customers=customers,
        search_query=search_query,
        current_limit=limit,
        current_type=equipment_type,
        start_entry=start_entry,
        end_entry=end_entry,
        **stats
    )



@admin_bp.route('/add-product', methods=['POST'])
@login_required
@administrator_required
def add_product():
    equipment_type = request.form.get("equipment_type", "").strip().title()
    name = request.form.get("name", "").strip().title()
    description = request.form.get("description", "").strip()
    
    transaction_type = request.form.get("offer_type", "Both").strip().title()
    rent_period = request.form.get("rent_period", "Monthly").strip().title()

    raw_tag = request.form.get("asset_tag", "").strip().upper()
    asset_tag = raw_tag if raw_tag != "" else None

    try:
        stock = int(request.form.get("stock", 0))
        rent_price_raw = request.form.get("rent_price", "").strip()
        sale_price_raw = request.form.get("sale_price", "").strip()
        
        rent_price = Decimal(rent_price_raw) if rent_price_raw else Decimal("0.00")
        sale_price = Decimal(sale_price_raw) if sale_price_raw else Decimal("0.00")
        
        if transaction_type == 'Rent' and rent_price <= 0:
            flash("Please provide a valid rent price for 'Rent Only' items.", "error")
            return redirect(request.referrer)
        if transaction_type == 'Sale' and sale_price <= 0:
            flash("Please provide a valid sale price for 'Sale Only' items.", "error")
            return redirect(request.referrer)
        if transaction_type == 'Both' and (rent_price <= 0 or sale_price <= 0):
            flash("Please provide both rent and sale prices for 'Both' mode.", "error")
            return redirect(request.referrer)
        
        if stock < 0:
            raise ValueError("Stock cannot be negative.")
        
    except (ValueError, InvalidOperation):
        flash("Invalid numbers provided for stock or prices.", "error")
        return redirect(request.referrer)

    if not equipment_type:
        flash("Equipment Type are required.", "error")
        return redirect(request.referrer)

    image_file = request.files.get("image")
    image_path = None
    
    if image_file and image_file.filename != '':
        ext = os.path.splitext(secure_filename(image_file.filename))[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            flash("Invalid image format. Use JPG, PNG, or WebP.", "error")
            return redirect(request.referrer)
            
        random_name = f"prod_{uuid.uuid4().hex[:12]}{ext}"
        upload_folder = os.path.join(current_app.root_path, "static", "uploads", "products")
        os.makedirs(upload_folder, exist_ok=True)
        
        image_path = f"uploads/products/{random_name}"
        full_path = os.path.join(upload_folder, random_name)
        
        try:
            image_file.save(full_path)
        except Exception as e:
            current_app.logger.error(f"Image Save Error: {e}")
            flash("Failed to save product image.", "error")
            return redirect(request.referrer)

    try:
        if asset_tag:
            existing_tag = Product.query.filter_by(asset_tag=asset_tag).first()
            if existing_tag:
                if image_path:
                    os.remove(os.path.join(current_app.root_path, "static", image_path))
                flash(f"Asset Tag '{asset_tag}' is already assigned to {existing_tag.name}.", "error")
                return redirect(request.referrer)

        new_product = Product(
            asset_tag=asset_tag, 
            equipment_type=equipment_type,
            name=name,
            description=description, 
            stock=stock,
            transaction_type=transaction_type,     
            rent_period=rent_period,    
            rent_price=rent_price,
            sale_price=sale_price,
            image=image_path,
            status="Available" if stock > 0 else "Out of Stock"
        )
        
        db.session.add(new_product)
        db.session.flush()

        log = InventoryLog(
            product_id=new_product.id,
            action="Initial Stock Entry",
            quantity=stock,
            note=f"Registered {name}. Mode: {transaction_type}. Tag: {asset_tag or 'None'}",
            user_id=current_user.id,
            user_name=current_user.full_name 
        )
        db.session.add(log)
        
        db.session.commit()
        flash(f"Product '{name}' added successfully.", "success")
        
    except Exception as e:
        db.session.rollback()
        if image_path:
            abs_image_path = os.path.join(current_app.root_path, "static", image_path)
            if os.path.exists(abs_image_path):
                os.remove(abs_image_path)
        
        current_app.logger.error(f"Database Error on Product Add: {str(e)}")
        flash("An error occurred while saving to the database.", "error")

    return redirect(url_for('admin.products'))


@admin_bp.route('/edit-product/<int:product_id>', methods=['POST'])
@login_required
@administrator_required
def edit_product(product_id):
    product = Product.query.get_or_404(product_id)

    new_type = request.form.get("equipment_type", "").strip().title()
    new_name = request.form.get("name", "").strip().title()
    new_description = request.form.get("description", "").strip()
    
    raw_tag = request.form.get("asset_tag", "").strip().upper()
    
    new_offer_type = request.form.get("offer_type", "Both").strip().title()
    new_rent_period = request.form.get("rent_period", "Monthly").strip().title()
    
    if not new_type:
        flash("Equipment Type are required.", "error")
        return redirect(url_for('admin.products'))

    changes = []

    try:
        stock_input = request.form.get("stock")
        new_stock = int(stock_input) if stock_input not in [None, ""] else product.stock
        
        raw_rent = Decimal(request.form.get("rent_price") or "0.00")
        raw_sale = Decimal(request.form.get("sale_price") or "0.00")

        new_rent = raw_rent if new_offer_type in ['Both', 'Rent'] else Decimal("0.00")
        new_sale = raw_sale if new_offer_type in ['Both', 'Sale'] else Decimal("0.00")

        if product.transaction_type != new_offer_type:
            changes.append(f"Mode: {product.transaction_type} → {new_offer_type}")
            product.transaction_type = new_offer_type

        if product.rent_period != new_rent_period:
            changes.append(f"Period: {product.rent_period} → {new_rent_period}")
            product.rent_period = new_rent_period

        if product.equipment_type != new_type:
            changes.append(f"Type: {product.equipment_type} → {new_type}")
            product.equipment_type = new_type

        if (product.name or "") != new_name:
            changes.append(f"Name: {product.name or 'N/A'} → {new_name}")
            product.name = new_name

        if (product.description or "").strip() != new_description:
            changes.append("Description updated")
            product.description = new_description

        if product.stock != new_stock:
            changes.append(f"Stock: {product.stock} → {new_stock}")
            product.stock = new_stock
            product.status = "Available" if new_stock > 0 else "Out of Stock"

        if product.rent_price != new_rent:
            changes.append(f"Rent: ₱{product.rent_price} → ₱{new_rent}")
            product.rent_price = new_rent

        if product.sale_price != new_sale:
            changes.append(f"Price: ₱{product.sale_price} → ₱{new_sale}")
            product.sale_price = new_sale

    except (ValueError, InvalidOperation):
        flash("Invalid numeric value provided for stock or price.", "error")
        return redirect(url_for('admin.products'))

    image_file = request.files.get("image")
    if image_file and image_file.filename != '':
        if product.image:
            old_full_path = os.path.join(current_app.root_path, "static", product.image)
            if os.path.exists(old_full_path):
                try:
                    os.remove(old_full_path)
                except Exception as e:
                    current_app.logger.warning(f"Could not delete old image: {e}")

        ext = os.path.splitext(secure_filename(image_file.filename))[1].lower()
        random_name = f"prod_{uuid.uuid4().hex[:12]}{ext}"
        upload_folder = os.path.join(current_app.root_path, "static", "uploads", "products")
        os.makedirs(upload_folder, exist_ok=True)
        
        new_rel_path = f"uploads/products/{random_name}"
        image_file.save(os.path.join(upload_folder, random_name))
        
        product.image = new_rel_path
        changes.append("Image updated")

    try:
        if changes:
            log_note = f"{'; '.join(changes)}"
            inventory_log = InventoryLog(
                product_id=product.id,
                action="Product Edited",
                quantity=product.stock,
                note=log_note[:255], 
                user_id=current_user.id,
                user_name=current_user.full_name
            )
            db.session.add(inventory_log)
            db.session.commit()
            flash(f"Updated {product.name} successfully!", "success")
        else:
            flash("No changes detected.", "info")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Product Update Error: {e}")
        flash("An error occurred while updating the product database.", "error")

    return redirect(url_for('admin.products'))


@admin_bp.route('/update_stock/<int:product_id>', methods=['POST'])
@login_required
@administrator_required 
@csrf.exempt
def update_stock(product_id):

    data = request.get_json() or {}
    product = Product.query.get_or_404(product_id)
    
    try:
        increment = int(data.get('increment', 0))
        reason = data.get('reason', '').strip() or 'Stock replenishment'
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid quantity format."}), 400

    if increment <= 0:
        return jsonify({
            "success": False,
            "message": "Increment must be at least 1 unit."
        }), 400

    try:
        old_stock = product.stock
        product.stock += increment
        
        if product.status == "Out of Stock" and product.stock > 0:
            product.status = "Available"

        log_note = f"Restocked: {old_stock} → {product.stock}. Reason: {reason}"
        
        inventory_log = InventoryLog(
            product_id=product.id,
            action="Restock",
            quantity=increment,
            note=log_note[:255],
            user_id=current_user.id,
            user_name=current_user.full_name 
        )
        
        db.session.add(inventory_log)
        db.session.commit()

        return jsonify({
            "success": True,
            "new_stock": product.stock,
            "new_status": product.status,
            "message": f"Added {increment} units. Total stock for {product.model} is now {product.stock}."
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Stock Update Error for Product {product_id}: {e}")
        return jsonify({
            "success": False, 
            "message": "A database error occurred while updating stock."
        }), 500
    
        
@admin_bp.route('/delete-product/<int:product_id>', methods=['POST'])
@login_required
@administrator_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)

    try:
        active_rentals = [r for r in product.rentals if r.status in ['Active', 'Overdue']]
        if active_rentals:
            flash(f"Cannot delete '{product.model}' because it is currently rented out.", "warning")
            return redirect(url_for('admin.products'))


        product.status = "Archived"
        product.stock = 0  
        
        log_note = f"Product Archived by {current_user.full_name}. Final stock was {product.stock}."
        inventory_log = InventoryLog(
            product_id=product.id,           
            action="Archived Product",      
            quantity=0,          
            note=log_note[:255],                   
            user_id=current_user.id,
            user_name=current_user.full_name
        )
        db.session.add(inventory_log)

        db.session.commit()  

        flash(f"Product '{product.model}' has been archived and removed from the shop.", "success")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Archive Error for Product {product_id}: {e}")
        flash("An error occurred while archiving the product.", "error")

    return redirect(url_for('admin.products'))


@admin_bp.route('/process-purchase', methods=['POST'])
@login_required
@administrator_required
def process_purchase():
    try:
        data = request.get_json() or {}

        try:
            product_id = int(data.get('product_id'))
            customer_id = int(data.get('customer_id'))
            quantity = int(data.get('quantity', 0))
            unit_price = Decimal(str(data.get('unit_price', '0.00')))
            amount_paid = Decimal(str(data.get('amount_paid', '0.00')))
        except (ValueError, TypeError, InvalidOperation):
            return jsonify({"success": False, "message": "Check the amount and quantity formats."}), 400

        if quantity <= 0:
            return jsonify({"success": False, "message": "Quantity must be 1 or more."}), 400

        product = Product.query.with_for_update().get(product_id)
        customer = Customer.query.get(customer_id)

        if not product or product.status == 'Archived':
            db.session.rollback()
            return jsonify({"success": False, "message": "Item is no longer available in the catalog."}), 404
        
        if not customer or not customer.is_active:
            db.session.rollback()
            return jsonify({"success": False, "message": "Selected customer account is inactive."}), 403

        if product.stock < quantity:
            db.session.rollback()
            return jsonify({"success": False, "message": f"Only {product.stock} units left in stock."}), 400

        total_price = (unit_price * quantity).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        balance_due = total_price - amount_paid
        
        payment_status = 'Paid' if balance_due <= 0 else 'Partial' if amount_paid > 0 else 'Unpaid'
        
        
        transaction_type = data.get('transaction_type', 'Purchase')
        prefix = "RNT" if transaction_type == "Rental" else "PUR"
                
        now = datetime.now()
        date_part = now.strftime("%m%d%Y")
        time_part = now.strftime("%H%M%S")
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        
        ref_no = f"{prefix}-{date_part}-{time_part}-{random_str}"
        
        fulfillment = data.get('fulfillment_type', 'Pickup')
        
        new_transaction = Transaction(
            reference_no=ref_no,
            customer_id=customer_id,
            customer_name=f"{customer.first_name} {customer.last_name}",
            processed_by=current_user.id,
            transaction_type='Sale',
            total_amount=total_price,
            fulfillment_type=fulfillment,
            delivery_address=data.get('delivery_address') if fulfillment == 'Delivery' else None,
            landmark=data.get('landmark') if fulfillment == 'Delivery' else None,
            delivery_status='Pending' if fulfillment == 'Delivery' else 'N/A',
            status='Open' 
        )
        db.session.add(new_transaction)
        db.session.flush()

        if amount_paid > 0:
            new_payment = Payment(
                transaction_id=new_transaction.id,
                amount=amount_paid,
                payment_method=data.get('payment_method', 'Cash'),
                reference_number=data.get('reference_number'),
                status='Completed',
                verified_by_id=current_user.id,
                verified_at=datetime.utcnow()
            )
            db.session.add(new_payment)

        new_purchase = Purchase(
            transaction_id=new_transaction.id,
            product_id=product.id,
            customer_id=customer_id,
            quantity=quantity,
            unit_price=unit_price,
            total_price=total_price,
            warranty_or_notes=data.get('warranty_or_notes', '').strip()
        )
        db.session.add(new_purchase)

        product.stock -= quantity
        if product.stock <= 0:
            product.status = "Out of Stock"

        log_note = f"Sold {quantity} unit(s) - Ref: {ref_no}"
        inventory_log = InventoryLog(
            product_id=product.id,
            action="Sale",
            quantity=-quantity,
            note=log_note,
            user_id=current_user.id,
            user_name=f"{current_user.first_name} {current_user.last_name}"
        )
        
        db.session.add(inventory_log)
        new_transaction.update_totals()
        db.session.commit()
        
        flash(f"Purchase processed successfully! \n Ref: {ref_no}", "success")
        
        return jsonify({
            "success": True, 
            "message": "Purchase processed successfully.",
            "reference_no": ref_no
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Purchase Transaction Failed: {str(e)}")
        return jsonify({"success": False, "message": "An error occurred while processing the sale. Please try again or contact support."})
    
    
@admin_bp.route('/process-rental', methods=['POST'])
@login_required
@administrator_required
def process_rental():
    product_id = request.form.get('product_id')

    if not product_id:
        flash("No product was selected. Please restart the transaction.", "danger")
        return redirect(request.referrer)

    try:
        raw_unit_price = request.form.get('unit_price', '0').replace(',', '').strip() or '0'
        raw_amount_paid = request.form.get('amount_paid', '0').replace(',', '').strip() or '0'
        quantity = int(request.form.get('quantity', 1))

        unit_price = Decimal(raw_unit_price)
        amount_paid = Decimal(raw_amount_paid)

        if quantity <= 0:
            flash("Quantity must be at least 1.", "warning")
            return redirect(request.referrer)

    except Exception:
        flash("Invalid numeric values or quantity provided.", "danger")
        return redirect(request.referrer)

    method = request.form.get('payment_method')
    user_ref_no = request.form.get('reference_number', '').strip()

    digital_methods = ["GCash", "Bank Transfer", "Check"]

    if amount_paid > 0 and method in digital_methods and not user_ref_no:
        flash(f"A reference number is required for {method} payments.", "warning")
        return redirect(request.referrer)

    if amount_paid < 0:
        flash("Initial payment cannot be negative.", "warning")
        return redirect(request.referrer)

    try:
        product = Product.query.get_or_404(product_id)

        if product.stock < quantity:
            flash(f"Insufficient stock. Only {product.stock} units available.", "danger")
            return redirect(request.referrer)

        transaction_type = request.form.get('transaction_type', 'Rental')
        prefix = "RNT" if transaction_type == "Rental" else "PUR"

        now = datetime.now()
        date_part = now.strftime("%m%d%Y")
        time_part = now.strftime("%H%M%S")
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        ref_no = f"{prefix}-{date_part}-{time_part}-{random_str}"

        start_date = datetime.strptime(request.form.get('start_date'), '%Y-%m-%d').date()
        expected_return = datetime.strptime(request.form.get('return_date'), '%Y-%m-%d').date()

        if expected_return < start_date:
            flash("Return date cannot be earlier than start date.", "danger")
            return redirect(request.referrer)

        contract_total = unit_price

        new_txn = Transaction(
            reference_no=ref_no,
            customer_id=request.form.get('customer_id'),
            transaction_type=transaction_type,
            total_amount=contract_total,
            fulfillment_type=request.form.get('fulfillment_type'),
            delivery_address=request.form.get('delivery_address'),
            landmark=request.form.get('landmark'),
            status="Open"
        )
        db.session.add(new_txn)
        db.session.flush()

        new_rental = Rental(
            transaction_id=new_txn.id,
            product_id=product_id,
            customer_id=new_txn.customer_id,
            start_date=start_date,
            expected_return_date=expected_return,
            monthly_rate=unit_price,  
            quantity=quantity,        
            deposit_amount=Decimal("0.00"),
            status="Active"
        )
        db.session.add(new_rental)

        product.stock -= quantity
        new_log = InventoryLog(
            product_id=product.id,
            action="Rental",
            quantity=-quantity,
            note=f"Rental Transaction: {ref_no}",
            user_id=current_user.id,
            user_name=current_user.full_name,
            created_at=datetime.now()
        )
        db.session.add(new_log)

        if product.stock <= 0:
            product.status = "Out of Stock"

        db.session.flush()

        new_rental.generate_monthly_invoices()
        db.session.flush()

        if amount_paid > 0:
            final_payment_ref = user_ref_no if user_ref_no else f"PAY-{ref_no}"

            if user_ref_no and Payment.query.filter_by(reference_number=user_ref_no).first():
                db.session.rollback()
                flash(f"The reference number '{user_ref_no}' has already been used.", "danger")
                return redirect(request.referrer)

            invoices = RentalInvoice.query.filter_by(rental_id=new_rental.id).order_by(RentalInvoice.service_period_start).all()
            remaining_payment = amount_paid

            for invoice in invoices:
                if remaining_payment <= 0:
                    break

                invoice_balance = invoice.remaining_balance
                if invoice_balance <= 0:
                    continue

                payment_amount = min(remaining_payment, invoice_balance)

                new_payment = Payment(
                    transaction_id=new_txn.id,
                    invoice_id=invoice.id,
                    amount=payment_amount,
                    payment_method=method,
                    reference_number=final_payment_ref,
                    status="Completed",
                    created_at=now,
                    verified_by_id=current_user.id
                )
                db.session.add(new_payment)


                if payment_amount >= invoice_balance:
                    invoice.status = "Paid"
                else:
                    invoice.status = "Partially Paid"

                remaining_payment -= payment_amount

        new_txn.update_totals()
        db.session.commit()
        flash(f"Rental confirmed for {quantity} unit(s)! Ref: {ref_no}", "success")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"RENTAL_PROCESS_ERROR: {str(e)}")
        flash(f"Error: {str(e)}", "danger")

    return redirect(url_for('admin.transactions'))


@admin_bp.route('/product/<int:product_id>/history')
@login_required
@administrator_required
def product_history(product_id):
    try:
        logs = InventoryLog.query.filter_by(product_id=product_id)\
            .order_by(InventoryLog.created_at.desc())\
            .limit(100)\
            .all()

        if not logs:
            product_exists = Product.query.get(product_id)
            if not product_exists:
                return jsonify({"status": "error", "message": "Product not found"}), 404
            return jsonify([]) 

        result = []
        for log in logs:
            movement_type = "neutral"
            if log.quantity and log.quantity > 0:
                movement_type = "increase"
            elif log.quantity and log.quantity < 0:
                movement_type = "decrease"

            result.append({
                "id": log.id,
                "action": log.action,
                "quantity": log.quantity if log.quantity != 0 else "-",
                "movement_type": movement_type, 
                "note": log.note or "No additional notes.",
                "user": log.user_name or "System",
                "date": log.created_at.strftime("%b %d, %Y"),
                "time": log.created_at.strftime("%I:%M %p"),
                "timestamp": log.created_at.isoformat() 
            })

        return jsonify(result)

    except Exception as e:
        current_app.logger.error(f"Error fetching history for Product {product_id}: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": "Internal server error while fetching history."
        }), 500



@admin_bp.route('/transactions')
@login_required
@administrator_required
@csrf.exempt
def transactions():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search_query = request.args.get('q', '').strip()
    txn_type = request.args.get('type', '')
    fulfillment = request.args.get('fulfillment', '')

    query = Transaction.query.options(
        joinedload(Transaction.customer),
        selectinload(Transaction.rentals).selectinload(Rental.invoices),
        selectinload(Transaction.payments)
    )

    if search_query:
        query = query.filter(or_(
            Transaction.reference_no.ilike(f"%{search_query}%"),
            Transaction.customer_name.ilike(f"%{search_query}%"),
            Transaction.landmark.ilike(f"%{search_query}%")
        ))
    
    if txn_type:
        query = query.filter(Transaction.transaction_type == txn_type)
    
    if fulfillment:
        query = query.filter(Transaction.fulfillment_type == fulfillment)

    pagination = query.order_by(Transaction.created_at.desc()).paginate(
        page=page, per_page=limit, error_out=False
    )

    stats = {
        'pending': Transaction.query.filter_by(payment_status='Unpaid').count(),
        'alerts': Transaction.query.filter(Transaction.status == 'Due').count(),
        'empty_tanks': Product.query.filter(Product.status.ilike('%Empty%')).count()
    }
    
    customers = Customer.query.order_by(Customer.last_name).all()
    all_equipment = Product.query.filter_by(status='Available').order_by(Product.equipment_type.asc()).all()

    return render_template(
        "admin/transactions.html",
        transactions=pagination.items,
        pagination=pagination,
        search_query=search_query,
        current_limit=limit,
        current_type=txn_type,
        current_fulfillment=fulfillment,
        customers=customers,
        all_equipment=all_equipment,
        **stats
    )
    
    
@admin_bp.route('/transaction_details/<int:id>') 
@login_required
@administrator_required
def transaction_details(id):
    txn = Transaction.query.get_or_404(id)
    
    return render_template('admin/transaction_details.html', txn=txn, current_date=datetime.now().date())

@admin_bp.route('/transaction/<int:txn_id>/update-tracking', methods=['POST'])
@login_required
def update_tracking(txn_id):
    txn = Transaction.query.get_or_404(txn_id)
    new_status = request.form.get('tracking_status')

    valid_statuses = ['SUBMITTED', 'VERIFIED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

    if new_status in valid_statuses:
        if txn.tracking_status == 'CANCELLED':
            flash("Action denied: This transaction has already been canceled.", "warning")
            return redirect(url_for('admin.transaction_details', id=txn.id))

        txn.tracking_status = new_status

        if new_status == 'CANCELLED':
            txn.status = 'Cancelled' 
        elif new_status == 'DELIVERED':
            txn.delivery_status = 'Delivered'
            if txn.transaction_type != 'Rental':
                txn.status = 'Closed'

        try:
            txn.update_totals()
            db.session.commit()
            flash(f"Success: Status updated to '{new_status.title()}'.", "success")
        except Exception as e:
            db.session.rollback()
            flash("System Error: Could not update status.", "danger")
    else:
        flash("Update Failed: Invalid status provided.", "danger")

    return redirect(url_for('admin.transaction_details', id=txn.id))

@admin_bp.route('/post-payment', methods=['POST'])
@login_required
@administrator_required
def post_payment():
    txn_id = request.form.get('txn_id')
    invoice_id = request.form.get('invoice_id')

    try:
        raw_amount = request.form.get('amount', '0').replace(',', '').strip()
        amount = Decimal(raw_amount)

        if amount <= 0:
            flash('Payment amount must be greater than zero.', 'warning')
            return redirect(request.referrer)

        txn = Transaction.query.with_for_update().get_or_404(txn_id)

        allowed_methods = ["Cash", "GCash", "Bank Transfer", "Check"]
        method = request.form.get('method')

        if method not in allowed_methods:
            flash("Invalid payment method.", "danger")
            return redirect(request.referrer)

        ref_number = request.form.get('payment_reference', '').strip() or None

        if method in ["GCash", "Bank Transfer", "Check"] and not ref_number:
            flash("Reference number is required for this payment method.", "warning")
            return redirect(request.referrer)

        if ref_number and Payment.query.filter_by(reference_number=ref_number).first():
            flash("Reference number already exists.", "danger")
            return redirect(request.referrer)

        unpaid_invoices = []
        if invoice_id:
            target = RentalInvoice.query.get(invoice_id)
            if target:
                unpaid_invoices = [target]
        elif txn.transaction_type == 'Rental':
            unpaid_invoices = RentalInvoice.query.filter(
                RentalInvoice.rental_id.in_([r.id for r in txn.rentals]),
                RentalInvoice.status != 'Paid'
            ).order_by(RentalInvoice.service_period_start.asc()).all()

        total_remaining = sum(inv.remaining_balance for inv in unpaid_invoices)

        if amount > total_remaining:
            flash(
                f'Payment amount ₱{amount:,.2f} exceeds the total remaining balance of ₱{total_remaining:,.2f}.',
                'danger'
            )
            return redirect(request.referrer)

        remaining_to_distribute = amount

        receipt_path = None
        file = request.files.get('receipt_image')
        if file and file.filename:
            filename = secure_filename(
                f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
            )
            upload_folder = os.path.join(
                current_app.root_path, 'static', 'uploads', 'receipts'
            )
            os.makedirs(upload_folder, exist_ok=True)
            file.save(os.path.join(upload_folder, filename))
            receipt_path = f'uploads/receipts/{filename}'

        for inv in unpaid_invoices:
            if remaining_to_distribute <= 0:
                break

            inv_balance = inv.remaining_balance
            if inv_balance <= 0:
                continue

            payment_amount = min(remaining_to_distribute, inv_balance)

            payment = Payment(
                transaction_id=txn.id,
                invoice_id=inv.id,
                amount=payment_amount,
                payment_method=method,
                reference_number=ref_number,
                receipt_image_path=receipt_path,
                status="Completed",
                verified_by_id=current_user.id,
                verified_at=datetime.utcnow()
            )
            db.session.add(payment)

            if payment_amount >= inv_balance:
                inv.status = "Paid"
            else:
                inv.status = "Partially Paid"

            remaining_to_distribute -= payment_amount

        db.session.flush()
        db.session.expire(txn, ['payments'])
        txn.update_totals()
        db.session.commit()

        flash(
            f'Payment of ₱{amount:,.2f} recorded successfully for {txn.reference_no}.',
            'success'
        )

    except (InvalidOperation, ValueError):
        db.session.rollback()
        flash('Invalid amount format.', 'danger')

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(
            f"PAYMENT_ERROR | TXN: {txn_id} | Error: {str(e)}"
        )
        flash(f'A system error occurred: {str(e)}', 'danger')

    return redirect(request.referrer or url_for('admin.transactions'))

@admin_bp.route('/transaction/<int:txn_id>/return', methods=['POST'])
@login_required
def process_return(txn_id):
    txn = Transaction.query.get_or_404(txn_id)
    
    return_notes = request.form.get('return_notes', '').strip()
    raw_late_fees = request.form.get('late_fees', '0')
    
    try:
        late_fees = Decimal(raw_late_fees)
    except (InvalidOperation, ValueError, TypeError):
        late_fees = Decimal('0.00')

    try:
        current_balance = txn.balance_due if txn.balance_due is not None else Decimal('0.00')
        current_total = txn.total_amount if txn.total_amount is not None else Decimal('0.00')

        txn.balance_due = current_balance + late_fees
        txn.total_amount = current_total + late_fees
        
        txn.status = 'Completed'

        if txn.rentals:
            for rental in txn.rentals:
                rental.status = 'Returned' 
                rental.actual_return_date = datetime.utcnow().date() 
                rental.return_condition_notes = return_notes
                rental.late_fees_incurred = late_fees
                
                if rental.product:
                    equipment_name = rental.product.equipment_type or ""
                    
                    if "Tank" in equipment_name:
                        rental.product.status = 'Empty'
                        rental.product.stock_empty = (rental.product.stock_empty or 0) + rental.quantity
                    else:
                        rental.product.status = 'Available'
                        rental.product.stock = (rental.product.stock or 0) + rental.quantity

                    user_display_name = "System"
                    if current_user:
                        user_display_name = getattr(current_user, 'username', 'Admin')

                    new_log = InventoryLog(
                        product_id=rental.product.id,
                        action="Equipment Return",
                        quantity=rental.quantity,
                        note=f"Returned from Txn {txn.reference_no}. \n Condition: {return_notes if return_notes else 'Good'}",
                        user_id=current_user.id if current_user else None,
                        user_name=user_display_name
                    )
                    db.session.add(new_log)

        db.session.commit()
        flash(f"Equipment return processed for {txn.reference_no}. \n Stock levels and logs updated.", "success")
        
    except Exception as e:
        db.session.rollback()
        flash("An error occurred while processing the return. \n Please try again.", "danger")

    return redirect(url_for('admin.transaction_details', id=txn.id))

from flask import request

@admin_bp.route('/system_logs')
@limiter.exempt
@login_required
@administrator_required
def system_logs():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search_query = request.args.get('q', '')
    current_type = request.args.get('type', '')

    query = InventoryLog.query

    if search_query:
        query = query.filter(InventoryLog.action.ilike(f'%{search_query}%'))
    if current_type:
        query = query.filter(InventoryLog.action == current_type)

    pagination = query.order_by(InventoryLog.created_at.desc()).paginate(
        page=page, 
        per_page=limit, 
        error_out=False
    )

    return render_template(
        'admin/system_logs.html', 
        all_logs=pagination.items, 
        pagination=pagination, 
        current_limit=limit,
        search_query=search_query,
        current_type=current_type
    )

@admin_bp.route('/profile', methods=['GET', 'POST'])
@limiter.exempt
@login_required
@administrator_required
def profile():
    if request.method == 'POST':
        current_user.first_name = request.form.get('fname')
        current_user.last_name = request.form.get('lname')
        current_user.email = request.form.get('email')

        try:
            db.session.commit()
            flash('Profile updated successfully!', 'success')
        except Exception as e:
            db.session.rollback()
            flash('An error occurred while updating.', 'danger')
            
        return redirect(url_for('admin.profile')) 

    return render_template("admin/profile.html")

@admin_bp.route('/reports')
@limiter.exempt
@login_required
@administrator_required
def reports():

    
    return render_template("admin/reports.html")

# ── Security Dashboard 
@admin_bp.route('/security')
@limiter.exempt
@login_required
@administrator_required
def security_dashboard():
    from datetime import datetime, timedelta
 
    logs = SecurityLog.query.order_by(SecurityLog.created_at.desc()).limit(500).all()
    blocked = BlockedIP.query.filter_by(is_active=True).order_by(BlockedIP.blocked_at.desc()).all()

    total_logs = SecurityLog.query.count()
    suspicious_count = SecurityLog.query.filter_by(is_suspicious=True).count()
    blocked_count = BlockedIP.query.filter_by(is_active=True).count()
    rate_limit_count = SecurityLog.query.filter_by(event_type="Rate Limit Violation").count()

    # ── ADD THESE ──
    failed_count = SecurityLog.query.filter(
        SecurityLog.event_type.ilike("%failed%")
    ).count()
    locked_count = SecurityLog.query.filter(
        SecurityLog.event_type.ilike("%lock%")
    ).count()
    blocked_ip_count = SecurityLog.query.filter(
        SecurityLog.event_type.ilike("%block%")
    ).count()
    bot_count = SecurityLog.query.filter_by(event_type="Bot Detected").count()
 
    return render_template(
        'admin/security_dashboard.html',
        logs=logs,
        blocked=blocked,
        total_logs=total_logs,
        suspicious_count=suspicious_count,
        blocked_count=blocked_count,
        rate_limit_count=rate_limit_count,
        failed_count=failed_count,
        locked_count=locked_count,
        blocked_ip_count=blocked_ip_count,
        bot_count=bot_count,
    )
 
 
# ── Block an IP (manual or auto via JS) 
@admin_bp.route('/security/block-ip', methods=['POST'])
@login_required
@administrator_required
def block_ip():
    ip = request.form.get('ip_address', '').strip()
    reason = request.form.get('reason', 'Manually blocked by admin').strip()
    duration_hours = request.form.get('duration_hours', '').strip()
 
    if not ip:
        flash("IP address is required.", "error")
        return redirect(url_for('admin.security_dashboard'))
 
    from datetime import datetime, timedelta
 
    blocked_until = None
    if duration_hours:
        try:
            h = int(duration_hours)
            if h > 0:
                blocked_until = datetime.utcnow() + timedelta(hours=h)
        except ValueError:
            pass
 
    existing = BlockedIP.query.filter_by(ip_address=ip).first()
    if existing:
        existing.is_active = True
        existing.reason = reason
        existing.blocked_until = blocked_until
        existing.blocked_at = datetime.utcnow()
        existing.blocked_by = current_user.id
    else:
        entry = BlockedIP(
            ip_address=ip,
            reason=reason,
            blocked_until=blocked_until,
            is_active=True,
            blocked_by=current_user.id
        )
        db.session.add(entry)
 
    # Log the manual block in security logs
    log = SecurityLog(
        ip_address=ip,
        event_type="IP Blocked",
        description=f"Admin manually blocked IP. Reason: {reason}",
        user_id=current_user.id,
        user_email=current_user.email,
        is_suspicious=True
    )
    db.session.add(log)
 
    try:
        db.session.commit()
        flash(f"IP {ip} has been blocked successfully.", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Error blocking IP: {str(e)}", "error")
 
    return redirect(url_for('admin.security_dashboard'))
 
 
# ── Unblock an IP 
@admin_bp.route('/security/unblock/<int:block_id>', methods=['POST'])
@login_required
@administrator_required
def unblock_ip(block_id):
    entry = BlockedIP.query.get_or_404(block_id)
    entry.is_active = False
 
    log = SecurityLog(
        ip_address=entry.ip_address,
        event_type="IP Unblocked",
        description=f"Admin unblocked IP {entry.ip_address}",
        user_id=current_user.id,
        user_email=current_user.email,
        is_suspicious=False
    )
    db.session.add(log)
 
    try:
        db.session.commit()
        flash(f"IP {entry.ip_address} has been unblocked.", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Error unblocking IP: {str(e)}", "error")
 
    return redirect(url_for('admin.security_dashboard'))
 
 
# ── Delete a single security log 
@admin_bp.route('/security/delete-log/<int:log_id>', methods=['POST'])
@login_required
@administrator_required
def delete_security_log(log_id):
    log = SecurityLog.query.get_or_404(log_id)
    try:
        db.session.delete(log)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
 
 
# ── Clear ALL security logs 
@admin_bp.route('/security/clear-logs', methods=['POST'])
@login_required
@administrator_required
def clear_security_logs():
    try:
        SecurityLog.query.delete()
        db.session.commit()
        flash("All security logs have been cleared.", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Error clearing logs: {str(e)}", "error")
    return redirect(url_for('admin.security_dashboard'))