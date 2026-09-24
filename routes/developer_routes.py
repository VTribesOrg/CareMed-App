import os
import uuid

from flask import (
    Blueprint, render_template, redirect, url_for, flash, request, current_app
)
from flask_login import login_required, current_user

from extensions import db
from models.branch import Branch
from models.users import User
from models.customer import Customer
from models.product import Product, Transaction
from utils.branch_scope import bypass_branch_filter

# Define a separate blueprint with its own URL prefix
developer_bp = Blueprint('developer', __name__, url_prefix='/developer')

ALLOWED_LOGO_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "svg"}
BRANCH_LOGO_SUBFOLDER = "branches"


def developer_required(f):
    """Custom decorator to block anyone who isn't you."""
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.email != 'caremed.app@gmail.com':
            flash('Access denied. Developer privileges required.', 'error')
            return redirect(url_for('admin.dashboard'))
        return f(*args, **kwargs)

    return decorated_function


def _allowed_logo(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_LOGO_EXTENSIONS
    )


def _save_branch_logo(file_storage):
    """Persist an uploaded branch logo and return its stored filename."""
    if not file_storage or not file_storage.filename:
        return None
    if not _allowed_logo(file_storage.filename):
        return None

    upload_dir = os.path.join(
        current_app.static_folder, "uploads", BRANCH_LOGO_SUBFOLDER
    )
    os.makedirs(upload_dir, exist_ok=True)

    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    safe_name = f"branch_{uuid.uuid4().hex}.{ext}"
    file_storage.save(os.path.join(upload_dir, safe_name))
    return safe_name


@developer_bp.route('/branches', methods=['GET', 'POST'])
@login_required
@developer_required
def manage_branches():
    # The developer console always operates across every branch.
    with bypass_branch_filter():
        if request.method == 'POST':
            branch_name = (request.form.get('branch_name') or '').strip()
            location_code = (request.form.get('location_code') or '').strip().upper()
            admin_email = (request.form.get('admin_email') or '').strip().lower()

            if not branch_name or not location_code or not admin_email:
                flash('Branch name, location code, and administrator email are required.', 'error')
                return redirect(url_for('developer.manage_branches'))

            if Branch.query.filter_by(location_code=location_code).first():
                flash(f'Location code "{location_code}" is already in use.', 'error')
                return redirect(url_for('developer.manage_branches'))

            logo_filename = _save_branch_logo(request.files.get('brand_logo'))

            branch = Branch(
                branch_name=branch_name,
                location_code=location_code,
                address=(request.form.get('address') or '').strip() or None,
                contact_number=(request.form.get('contact_number') or '').strip() or None,
                email=(request.form.get('email') or '').strip() or None,
                theme_color=request.form.get('theme_color') or '#002347',
                accent_color=request.form.get('accent_color') or '#52B788',
                brand_name=(request.form.get('brand_name') or '').strip() or None,
                brand_logo=logo_filename,
                tagline=(request.form.get('tagline') or '').strip() or None,
                hero_title=(request.form.get('hero_title') or '').strip() or None,
                hero_subtitle=(request.form.get('hero_subtitle') or '').strip() or None,
                announcement=(request.form.get('announcement') or '').strip() or None,
                footer_text=(request.form.get('footer_text') or '').strip() or None,
                is_active=True,
            )

            try:
                db.session.add(branch)
                db.session.flush()  # Flushes to populate branch.id

                # Handle administrator account assignment / creation using valid User model fields
                user = User.query.filter_by(email=admin_email).first()
                if not user:
                    user = User(
                        email=admin_email,
                        first_name=admin_email.split('@')[0].capitalize(),
                        is_active=True
                    )
                    # Set a temporary password if your user model supports it
                    if hasattr(user, 'set_password'):
                        user.set_password("TempPassword123!")
                    db.session.add(user)
                    flash(f'New user account created for administrator: {admin_email}', 'info')

                # Assign user to the new branch and set role to Administrator
                user.branch_id = branch.id
                if hasattr(user, 'role'):
                    user.role = 'Administrator'

                db.session.commit()
                flash(f'Branch "{branch_name}" and administrator account successfully configured.', 'success')
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Branch creation failed: {e}")
                flash('Could not create the branch or assign admin. Please try again.', 'error')

            return redirect(url_for('developer.manage_branches'))

        branches = Branch.query.order_by(Branch.branch_name.asc()).all()

        # Attach lightweight record counts so the developer can see the scale
        branch_stats = {}
        for b in branches:
            branch_stats[b.id] = {
                "users": User.query.filter_by(branch_id=b.id).count(),
                "customers": Customer.query.filter_by(branch_id=b.id).count(),
                "products": Product.query.filter_by(branch_id=b.id).count(),
                "transactions": Transaction.query.filter_by(branch_id=b.id).count(),
            }

    return render_template(
        'branch_management/branches.html',
        branches=branches,
        branch_stats=branch_stats,
    )


@developer_bp.route('/branches/<int:branch_id>/edit', methods=['GET', 'POST'])
@login_required
@developer_required
def edit_branch(branch_id):
    with bypass_branch_filter():
        branch = Branch.query.get_or_404(branch_id)

        if request.method == 'POST':
            branch_name = (request.form.get('branch_name') or '').strip()
            location_code = (request.form.get('location_code') or '').strip().upper()
            admin_email = (request.form.get('admin_email') or '').strip().lower()

            if not branch_name or not location_code:
                flash('Branch name and location code are required.', 'error')
                return redirect(url_for('developer.edit_branch', branch_id=branch.id))

            duplicate = Branch.query.filter(
                Branch.location_code == location_code,
                Branch.id != branch.id,
            ).first()
            if duplicate:
                flash(f'Location code "{location_code}" is already in use.', 'error')
                return redirect(url_for('developer.edit_branch', branch_id=branch.id))

            new_logo = _save_branch_logo(request.files.get('brand_logo'))

            branch.branch_name = branch_name
            branch.location_code = location_code
            branch.address = (request.form.get('address') or '').strip() or None
            branch.contact_number = (request.form.get('contact_number') or '').strip() or None
            branch.email = (request.form.get('email') or '').strip() or None
            branch.theme_color = request.form.get('theme_color') or branch.theme_color
            branch.accent_color = request.form.get('accent_color') or branch.accent_color
            branch.brand_name = (request.form.get('brand_name') or '').strip() or None
            branch.tagline = (request.form.get('tagline') or '').strip() or None
            branch.hero_title = (request.form.get('hero_title') or '').strip() or None
            branch.hero_subtitle = (request.form.get('hero_subtitle') or '').strip() or None
            branch.announcement = (request.form.get('announcement') or '').strip() or None
            branch.footer_text = (request.form.get('footer_text') or '').strip() or None
            branch.is_active = request.form.get('is_active') == 'on'

            if new_logo:
                branch.brand_logo = new_logo
            elif request.form.get('remove_logo') == 'on':
                branch.brand_logo = None

            # Optional update/reassignment of admin email during edit
            if admin_email:
                user = User.query.filter_by(email=admin_email).first()
                if not user:
                    user = User(
                        email=admin_email,
                        first_name=admin_email.split('@')[0].capitalize(),
                        is_active=True
                    )
                    if hasattr(user, 'set_password'):
                        user.set_password("TempPassword123!")
                    db.session.add(user)
                user.branch_id = branch.id
                if hasattr(user, 'role'):
                    user.role = 'Administrator'

            try:
                db.session.commit()
                flash(f'Branch "{branch_name}" updated successfully.', 'success')
                return redirect(url_for('developer.manage_branches'))
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Branch update failed: {e}")
                flash('Could not update the branch. Please try again.', 'error')

    return render_template('branch_management/edit_branch.html', branch=branch)


@developer_bp.route('/branches/<int:branch_id>/toggle', methods=['POST'])
@login_required
@developer_required
def toggle_branch(branch_id):
    with bypass_branch_filter():
        branch = Branch.query.get_or_404(branch_id)
        branch.is_active = not branch.is_active
        try:
            db.session.commit()
            state = "activated" if branch.is_active else "deactivated"
            flash(f'Branch "{branch.branch_name}" {state}.', 'success')
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Branch toggle failed: {e}")
            flash('Could not change the branch status.', 'error')

    return redirect(url_for('developer.manage_branches'))