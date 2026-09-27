from functools import wraps

from flask import (Blueprint, abort, flash, redirect, render_template, request,
                   url_for)
from flask_login import current_user, login_required
from sqlalchemy import or_

from extensions import db, limiter
from models.branch import Branch
from models.product import Product, ProductReview

user_bp = Blueprint('user', __name__, url_prefix='/customer')


def admin_redirect(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.is_authenticated and (current_user.role or '').strip() == "Administrator":
            return redirect(url_for('admin.dashboard'))
        return f(*args, **kwargs)
    return decorated_function


def _catalogue_query(category, search_query, sort_option, active_only=True):
    """Build the shared catalogue query used by the home and product pages."""
    query = Product.query

    if active_only:
        # Deactivated products are hidden from the public catalogue but stay
        # visible in the back office so history is never lost.
        query = query.filter(Product.is_active.is_(True))

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
    else:
        query = query.order_by(Product.id.desc())

    return query


@user_bp.route('/')
@admin_redirect
def homepage():
    all_products = Product.query.filter(Product.is_active.is_(True)).all()
    categories = sorted({p.equipment_type for p in all_products if p.equipment_type})

    in_stock = [product for product in all_products if (product.stock or 0) > 0]

    # Deterministic "featured" pick (cheapest in stock first) so the home page
    # is stable between refreshes instead of shuffling on every request.
    featured_products = sorted(
        in_stock,
        key=lambda p: (p.sale_price if p.transaction_type == 'Sale' else p.rent_price) or 0
    )[:8]

    context = {
        'categories': categories,
        'featured_products': featured_products
    }

    if current_user.is_authenticated:
        branch = db.session.get(Branch, current_user.branch_id) if current_user.branch_id else None
        context['branch'] = branch

    return render_template('user/homepage.html', **context)


@user_bp.route('/products')
@admin_redirect
@limiter.exempt
def products():
    category = request.args.get('category', 'All')
    search_query = request.args.get('search', '').strip()
    sort_option = request.args.get('sort', 'default')

    all_products = _catalogue_query(category, search_query, sort_option).all()

    return render_template(
        'user/products.html',
        products=all_products,
        current_category=category,
        current_search=search_query,
        current_sort=sort_option
    )


@user_bp.route('/product/<int:product_id>')
@admin_redirect
@limiter.exempt
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)

    if not product.is_active:
        # Keep deactivated products out of the public catalogue, including by
        # direct link or a bookmarked Messenger deep-link.
        abort(404)

    category = request.args.get('category', 'All')
    related_products = _catalogue_query(category, '', 'default').limit(5).all()

    return render_template(
        'user/product_detail.html',
        product=product,
        products=related_products,
        current_category=category
    )


@user_bp.route('/product/<int:product_id>/review', methods=['POST'])
@admin_redirect
@login_required
@limiter.exempt
def submit_review(product_id):

    product = Product.query.get_or_404(product_id)

    rating_raw = request.form.get('rating')
    comment = (request.form.get('comment') or '').strip()

    try:
        rating = int(rating_raw)
    except (TypeError, ValueError):
        flash('Please choose a star rating before submitting.', 'error')
        return redirect(url_for('user.product_detail', product_id=product_id))

    if not 1 <= rating <= 5:
        flash('The rating has to be between 1 and 5 stars.', 'error')
        return redirect(url_for('user.product_detail', product_id=product_id))

    if not comment:
        flash('Please add a few words about the equipment.', 'error')
        return redirect(url_for('user.product_detail', product_id=product_id))

    db.session.add(ProductReview(product_id=product.id,
                                 user_id=current_user.id,
                                 rating=rating,
                                 comment=comment))
    try:
        db.session.commit()
        flash('Thank you! Your review has been published.', 'success')
    except Exception:
        db.session.rollback()
        flash('We could not save your review just now. Please try again.', 'error')

    return redirect(url_for('user.product_detail', product_id=product_id))

