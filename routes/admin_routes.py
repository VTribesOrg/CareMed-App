from flask import Blueprint, render_template, url_for, redirect, flash
from flask_login import current_user, logout_user
from extensions import db
from flask_login import login_required
from functools import wraps

admin_bp = Blueprint('admin', __name__)

def administrator_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.role != 'administrator':
            logout_user()
            flash("Unauthorized access.", "error")
            return redirect(url_for('user.homepage'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/admin_dashboard')
@login_required
@administrator_required
def admin_dashboard():
    
    return render_template("admin/admin_dashboard.html")

@admin_bp.route('/admin_customers')
@login_required
@administrator_required
def admin_customers():
    if current_user.role != 'administrator':
        return redirect(url_for('user.homepage'))
    
    return render_template("admin/admin_customers.html")

@admin_bp.route('/admin_products')
@login_required
@administrator_required
def admin_products():
    if current_user.role != 'administrator':
        return redirect(url_for('user.homepage'))
    
    return render_template("admin/admin_products.html")


@admin_bp.route('/admin_orders')
@login_required
@administrator_required
def admin_orders():
    if current_user.role != 'administrator':
        return redirect(url_for('user.homepage'))
    
    return render_template("admin/admin_orders.html")


@admin_bp.route('/admin_payments')
@login_required
@administrator_required
def admin_payments():
    if current_user.role != 'administrator':
        return redirect(url_for('user.homepage'))
    
    return render_template("admin/admin_payments.html")

@admin_bp.route('/admin_profile')
@login_required
@administrator_required
def admin_profile():
    if current_user.role != 'administrator':
        return redirect(url_for('user.homepage'))
    
    return render_template("admin/admin_profile.html")

@admin_bp.route('/admin_reports')
@login_required
@administrator_required
def admin_reports():
    if current_user.role != 'administrator':
        return redirect(url_for('user.homepage'))
    
    return render_template("admin/admin_reports.html")