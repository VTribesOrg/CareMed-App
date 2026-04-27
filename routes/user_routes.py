import os
from dateutil.relativedelta import relativedelta
from flask import Blueprint, abort, render_template, request, current_app, jsonify, redirect, url_for, flash, session
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename
from extensions import db, passhasher, limiter
from forms.update_profile_form import UpdateProfileForm, ChangePasswordForm
from functools import wraps
from models.customer import Customer
from models.product import Product, Cart, CartItem, Payment, Transaction, Rental, Purchase, InventoryLog
import random
import string
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP



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
    category = request.args.get('category', 'All')
    search_query = request.args.get('search', '').strip()
    sort_option = request.args.get('sort', 'default')

    query = Product.query

    if category != 'All':
        query = query.filter(Product.equipment_type == category)

    if search_query:
        query = query.filter(
            or_(
                Product.name.ilike(f'%{search_query}%'),
                Product.equipment_type.ilike(f'%{search_query}%'),
                Product.description.ilike(f'%{search_query}%')
            )
        )

    if sort_option == 'price-low':
        query = query.order_by(Product.sale_price.asc(), Product.rent_price.asc())
    elif sort_option == 'price-high':
        query = query.order_by(Product.sale_price.desc(), Product.rent_price.desc())

    all_products = query.all()
    
    in_cart_items = []
    if current_user.is_authenticated:
        user_cart = Cart.query.filter_by(user_id=current_user.id).first()
        if user_cart:
            in_cart_items = [(item.product_id, item.item_type) for item in user_cart.items]
            
    return render_template('user/products.html', products=all_products, current_category=category, in_cart_items=in_cart_items)

@user_bp.route('/product/<int:product_id>')
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    
    category = request.args.get('category', 'All')
    search_query = request.args.get('search', '').strip()
    sort_option = request.args.get('sort', 'default')

    query = Product.query

    if category != 'All':
        query = query.filter(Product.equipment_type == category)

    if search_query:
        query = query.filter(
            or_(
                Product.name.ilike(f'%{search_query}%'),
                Product.equipment_type.ilike(f'%{search_query}%'),
                Product.description.ilike(f'%{search_query}%')
            )
        )

    if sort_option == 'price-low':
        query = query.order_by(Product.sale_price.asc(), Product.rent_price.asc())
    elif sort_option == 'price-high':
        query = query.order_by(Product.sale_price.desc(), Product.rent_price.desc())

    all_products = query.all()
    
    in_cart_items = []
    if current_user.is_authenticated:
        user_cart = Cart.query.filter_by(user_id=current_user.id).first()
        if user_cart:
            in_cart_items = [(item.product_id, item.item_type) for item in user_cart.items]
            
    return render_template('user/product_detail.html', product=product, products=all_products, current_category=category, in_cart_items=in_cart_items)


@user_bp.route('/profile', methods=['GET', 'POST'])
@login_required
@customer_required
@limiter.limit("10 per minute")
def profile():
    profile_form = UpdateProfileForm()
    password_form = ChangePasswordForm()

    if not current_user.customer_profile:
        current_user.customer_profile = Customer(user_id=current_user.id)
        db.session.add(current_user.customer_profile)
        db.session.commit()

    customer = current_user.customer_profile

    if request.method == "GET":
        profile_form.first_name.data = customer.first_name or None
        profile_form.last_name.data = customer.last_name or None
        profile_form.phone.data = customer.contact_number or None
        profile_form.address.data = customer.home_address or None
        profile_form.primary_id_type.data = customer.primary_id_type or None
        profile_form.secondary_id_type.data = customer.secondary_id_type or None

        return render_template("user/profile.html", profile_form=profile_form, password_form=password_form)

    if profile_form.validate_on_submit() and profile_form.submit_profile.data:
        try:
            customer.first_name = profile_form.first_name.data.strip().title()
            customer.last_name = profile_form.last_name.data.strip().title()
            customer.contact_number = profile_form.phone.data.strip()
            customer.home_address = profile_form.address.data.title()
            
            customer.primary_id_type = profile_form.primary_id_type.data
            customer.secondary_id_type = profile_form.secondary_id_type.data

            remove_photo_signal = request.form.get('remove_photo') == 'true'
            new_profile_file = profile_form.profile_path.data

            if remove_photo_signal and not new_profile_file:
                if current_user.profile_path:
                    old_path = os.path.join(current_app.root_path, 'static', current_user.profile_path)
                    if os.path.exists(old_path):
                        os.remove(old_path)
                    current_user.profile_path = None

            if new_profile_file:
                if current_user.profile_path:
                    old_path = os.path.join(current_app.root_path, 'static', current_user.profile_path)
                    if os.path.exists(old_path):
                        os.remove(old_path)
                
                filename = secure_filename(f"user_{current_user.id}_{new_profile_file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'profiles')
                os.makedirs(upload_folder, exist_ok=True)
                new_profile_file.save(os.path.join(upload_folder, filename))
                current_user.profile_path = f"uploads/profiles/{filename}"

            primary_id_file = profile_form.valid_id_path.data
            if primary_id_file:
                if customer.valid_id_path:
                    old_path = os.path.join(current_app.root_path, 'static', customer.valid_id_path)
                    if os.path.exists(old_path): os.remove(old_path)
                
                filename = secure_filename(f"primary_id_{current_user.id}_{primary_id_file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'ids')
                os.makedirs(upload_folder, exist_ok=True)
                primary_id_file.save(os.path.join(upload_folder, filename))
                customer.valid_id_path = f"uploads/ids/{filename}"
                customer.id_uploaded_at = datetime.utcnow()

            secondary_id_file = profile_form.secondary_id_path.data
            if secondary_id_file:
                if customer.secondary_id_path:
                    old_path = os.path.join(current_app.root_path, 'static', customer.secondary_id_path)
                    if os.path.exists(old_path): os.remove(old_path)
                
                filename = secure_filename(f"secondary_id_{current_user.id}_{secondary_id_file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'ids')
                os.makedirs(upload_folder, exist_ok=True)
                secondary_id_file.save(os.path.join(upload_folder, filename))
                customer.secondary_id_path = f"uploads/ids/{filename}"
                customer.id_uploaded_at = datetime.utcnow()

            db.session.commit()
            return jsonify(
                status="success",
                message="Your profile and identification documents have been updated successfully!"
            )

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Profile update failed: {e}")
            return jsonify(status="error", message="Oops! We couldn’t update your profile. Please try again.")

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
    


@user_bp.route('/add-to-cart/<int:product_id>', methods=['POST'])
@login_required
def add_to_cart(product_id):
    product = Product.query.get_or_404(product_id)
    if product.stock <= 0:
        flash(f"Sorry, {product.name} is currently out of stock.", "error")
        return redirect(request.referrer or url_for('user.products'))

    item_type = request.form.get('item_type', 'Sale') 
    start_date_str = request.form.get('start_date')
    duration_str = request.form.get('duration')
    next_page = request.form.get('next_page') 

    user_cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not user_cart:
        user_cart = Cart(user_id=current_user.id)
        db.session.add(user_cart)
        db.session.flush() 

    rental_start = None
    rental_duration = None
    
    if item_type == 'Rental':
        try:
            if start_date_str:
                rental_start = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                rental_start = datetime.utcnow().date()
            
            rental_duration = int(duration_str) if duration_str else 1
        except (ValueError, TypeError):
            flash("Invalid date or duration provided.", "error")
            return redirect(request.referrer or url_for('user.products'))

    existing_item = CartItem.query.filter_by(
        cart_id=user_cart.id, 
        product_id=product_id, 
        item_type=item_type,
        rental_start_date=rental_start
    ).first()

    if existing_item:
        if existing_item.quantity + 1 > product.stock:
            flash(f"Cannot add more. Only {product.stock} units available.", "warning")
        else:
            existing_item.quantity += 1
    else:
        price = product.sale_price if item_type == 'Sale' else product.rent_price
        
        new_item = CartItem(
            cart_id=user_cart.id,
            product_id=product_id,
            item_type=item_type,
            price_at_addition=price or 0,
            rental_start_date=rental_start,
            rental_duration=rental_duration,
            quantity=1
        )
        db.session.add(new_item)

    try:
        db.session.commit()
        
        if next_page == 'cart':
            return redirect(url_for('user.cart', added_id=product_id, added_type=item_type))
            
        flash(f"Added {product.name} to cart.", "success")
        
    except Exception as e:
        db.session.rollback()
        flash("An error occurred while updating your cart.", "error")

    return redirect(request.referrer or url_for('user.products'))

@user_bp.route('/update_rental/<int:item_id>', methods=['POST'])
@login_required
def update_rental(item_id):
    item = CartItem.query.get_or_404(item_id)
    
    if item.cart.user_id != current_user.id:
        current_app.logger.warning(f"Unauthorized update attempt by user {current_user.id} on item {item_id}")
        return abort(403)
        
    start_date_str = request.form.get('start_date')
    duration_str = request.form.get('duration')
    
    if not start_date_str or not duration_str:
        flash("Missing required rental information.", "warning")
        return redirect(url_for('user.cart'))

    try:
        item.rental_start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        item.rental_duration = int(duration_str)
        
        db.session.commit()
        flash("Rental schedule updated successfully!", "success")
    except (ValueError, TypeError) as e:
        db.session.rollback()
        current_app.logger.error(f"Update failed: {str(e)}")
        flash("Invalid date or duration provided.", "danger")
    
    return redirect(url_for('user.cart'))


@user_bp.route('/remove-from-cart/<int:product_id>', methods=['POST'])
@login_required
def remove_from_cart(product_id):
    item_type = request.form.get('item_type')
    user_cart = Cart.query.filter_by(user_id=current_user.id).first()
    
    if user_cart:
        item_to_remove = CartItem.query.filter_by(
            cart_id=user_cart.id, 
            product_id=product_id, 
            item_type=item_type
        ).first()
        
        if item_to_remove:
            db.session.delete(item_to_remove)
            db.session.commit()
            flash(f"Removed {item_type} from cart.", "info")
        else:
            flash("Item not found in cart.", "warning")
            
    return redirect(request.referrer or url_for('user.products'))


@user_bp.route('/cart')
@login_required
def cart():
    user_cart = Cart.query.filter_by(user_id=current_user.id).first()
    items = user_cart.items if user_cart else []
    
    rentals = [i for i in items if i.item_type == 'Rental']
    purchases = [i for i in items if i.item_type == 'Sale']

    return render_template(
        'user/user_cart.html', 
        rentals=rentals, 
        purchases=purchases,
        has_items=len(items) > 0
    )
    

@user_bp.route('/cart/action', methods=['POST'])
@login_required
def cart_actions():
    action = request.form.get('action')
    single_delete_val = request.form.get('single_delete')
    selected_items = request.form.getlist('selected_items')
    
    user_cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not user_cart:
        flash("Your cart is empty.", "warning")
        return redirect(url_for('user.cart'))

    to_delete = []

    if single_delete_val:
        to_delete.append(single_delete_val)
    elif action == 'delete_selected':
        if not selected_items:
            flash("No items selected to delete.", "warning")
            return redirect(url_for('user.cart'))
        to_delete = selected_items

    elif action == 'checkout':
        if not selected_items:
            flash("Please select at least one item to proceed to checkout.", "warning")
            return redirect(url_for('user.cart'))
        
        session['checkout_items'] = selected_items
        return redirect(url_for('user.checkout'))


    if to_delete:
        try:
            for item in to_delete:
                p_id, i_type = item.split(':')
                item_to_remove = CartItem.query.filter_by(
                    cart_id=user_cart.id, 
                    product_id=int(p_id), 
                    item_type=i_type
                ).first()
                if item_to_remove:
                    db.session.delete(item_to_remove)
            db.session.commit()
            flash("Updated your cart successfully.", "info")
        except Exception as e:
            db.session.rollback()
            flash("An error occurred while updating your cart.", "error")

    return redirect(url_for('user.cart'))


@user_bp.route('/checkout', methods=['GET'])
@login_required
def checkout():
    selected_keys = session.get('checkout_items', [])
    
    if not selected_keys:
        flash("No items selected for checkout.", "warning")
        return redirect(url_for('user.cart'))

    user_cart = Cart.query.filter_by(user_id=current_user.id).first()
    

    items_to_buy = []
    total_price = Decimal('0.00')
    has_rental = False

    for key in selected_keys:
        try:
            p_id, i_type = key.split(':')
            cart_item = CartItem.query.filter_by(
                cart_id=user_cart.id,
                product_id=int(p_id),
                item_type=i_type
            ).first()

            if cart_item:
                items_to_buy.append(cart_item)
                price = Decimal(str(cart_item.price_at_addition or 0))
                total_price += price * cart_item.quantity
                
                if cart_item.item_type == 'Rental':
                    has_rental = True
                    
        except Exception:
            continue

    if not items_to_buy:
        flash("Selected items are no longer in your cart.", "error")
        return redirect(url_for('user.cart'))

    return render_template('user/check_out.html', 
                           items=items_to_buy, 
                           total_price=total_price,
                           has_rental=has_rental)
    

@user_bp.route('/checkout/update-profile', methods=['POST'])
@login_required
def update_checkout_profile():
    profile = current_user.customer_profile
    
    if not profile:
        flash("Customer profile not found. Please complete your profile first.", "error")
        return redirect(url_for('user.checkout'))
    
    first_name = request.form.get('first_name')
    last_name = request.form.get('last_name')
    contact_number = request.form.get('contact_number')
    home_address = request.form.get('home_address')

    try:
        profile.first_name = first_name
        profile.last_name = last_name
        profile.contact_number = contact_number
        profile.home_address = home_address.title()

        db.session.commit()
        flash("Delivery details updated successfully!", "success")
        
    except Exception as e:
        db.session.rollback()
        flash("An error occurred while updating your details. Please try again.", "error")

    return redirect(url_for('user.checkout'))
    
@user_bp.route('/place-order', methods=['POST'])
@login_required
def place_order():
    profile = current_user.customer_profile
    if not profile or not profile.home_address:
        flash("Please complete your delivery profile before ordering.", "warning")
        return redirect(url_for('user.checkout'))

    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart or not cart.items:
        flash("Your cart is empty.", "error")
        return redirect(url_for('user.cart'))
    
    is_rental_order = any(item.item_type == 'Rental' for item in cart.items)
    
    if is_rental_order:
        if not profile.valid_id_path or not profile.secondary_id_path:
            flash("Rental orders require two valid IDs. Please upload them in the checkout page.", "error")
            return redirect(url_for('user.checkout'))

    selected_payment_method = request.form.get('payment_method', 'COD')

    try:
        now = datetime.now()
        is_rental = any(i.item_type == 'Rental' for i in cart.items)
        prefix = "RNT" if is_rental else "PUR"
        ref_no = f"{prefix}-{now.strftime('%m%d%Y')}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"

        new_transaction = Transaction(
            reference_no=ref_no,
            customer_id=profile.id,
            customer_name=f"{profile.first_name} {profile.last_name}",
            transaction_type='Rental' if is_rental else 'Sale',
            total_amount=Decimal("0.00"), 
            amount_paid=Decimal("0.00"),
            balance_due=Decimal("0.00"),
            payment_status="Unpaid",
            status="Open",
            fulfillment_type="Delivery",
            delivery_address=profile.home_address,
            delivery_status="Pending"
        )
        
        db.session.add(new_transaction)
        db.session.flush() 

        total_accumulated = Decimal("0.00")

        for item in cart.items:
            product = Product.query.with_for_update().get(item.product_id)
            
            if not product or product.status == 'Archived':
                raise ValueError(f"The item '{item.product.name}' is no longer available.")

            if product.stock < item.quantity:
                raise ValueError(f"Sorry, only {product.stock} units of {product.name} are left.")

            item_price = Decimal(str(item.price_at_addition))
            item_total = item_price * item.quantity
            total_accumulated += item_total

            if item.item_type == 'Sale':
                db.session.add(Purchase(
                    transaction_id=new_transaction.id,
                    product_id=product.id,
                    customer_id=profile.id,
                    quantity=item.quantity,
                    unit_price=item_price,
                    total_price=item_total
                ))
            
            elif item.item_type == 'Rental':
                end_date = item.rental_start_date + relativedelta(months=item.rental_duration)
                rental = Rental(
                    transaction_id=new_transaction.id,
                    product_id=product.id,
                    customer_id=profile.id,
                    start_date=item.rental_start_date,
                    expected_return_date=end_date,
                    monthly_rate=item_price,
                    quantity=item.quantity,
                    status="Active"
                )
                db.session.add(rental)
                db.session.flush()
                rental.generate_monthly_invoices()

            product.stock -= item.quantity
            if product.stock <= 0:
                product.status = "Out of Stock"

            db.session.add(InventoryLog(
                product_id=product.id,
                action="Online Order",
                quantity=-item.quantity,
                note=f"Ref: {ref_no}",
                user_id=current_user.id,
                user_name=new_transaction.customer_name
            ))

        if new_transaction.transaction_type == "Sale":
            new_transaction.total_amount = total_accumulated
        
        new_transaction.update_totals()

        new_payment = Payment(
            transaction_id=new_transaction.id,
            amount=new_transaction.total_amount,
            payment_method=selected_payment_method,
            status="Pending",
            reference_number=f"PAY-{ref_no}"
        )
        db.session.add(new_payment)

        for item in cart.items:
            db.session.delete(item)
        
        db.session.commit()
        return redirect(url_for('user.order_success', ref=ref_no))

    except ValueError as ve:
        db.session.rollback()
        flash(str(ve), "warning")
        return redirect(url_for('user.cart'))
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"CRITICAL CHECKOUT ERROR: {str(e)}") 
        flash("An internal server error occurred while processing your order.", "error")
        return redirect(url_for('user.checkout'))
    
    
@user_bp.route('/order_success')
@login_required
def order_success():
    ref_no = request.args.get('ref')
    if not ref_no:
        return redirect(url_for('user.homepage'))

    order = Transaction.query.filter_by(
        reference_no=ref_no, 
        customer_id=current_user.customer_profile.id
    ).first()

    if not order:
        flash("Order not found or access denied.", "error")
        return redirect(url_for('user.homepage'))

    items = order.purchases if order.transaction_type == 'Sale' else order.rentals
    

    payment = order.payments[0] if order.payments else None
    payment_method = payment.payment_method if payment else "N/A"

    return render_template(
        'user/order_success.html',
        order=order,
        items=items,
        payment_method=payment_method,
        total_price=order.total_amount
    )