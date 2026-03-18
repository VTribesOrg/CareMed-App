from flask import Blueprint, render_template, url_for, redirect
from flask_login import current_user
from extensions import db
from flask_login import login_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin_dashboard')
@login_required
def admin_dashboard():
    if current_user.role != 'admin':
        return redirect(url_for('user.homepage'))
    
    return render_template("admin_dashboard.html")