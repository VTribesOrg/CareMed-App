from flask import Blueprint, render_template, url_for, redirect, flash
from flask_login import current_user, logout_user
from extensions import db, limiter
from flask_login import login_required
from functools import wraps

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