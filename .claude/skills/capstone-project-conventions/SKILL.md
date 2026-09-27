---
name: capstone-project-conventions
description: CareMed capstone conventions — Flask/SQLAlchemy medical equipment rental & sales system. Covers runtime commands, folder layout, auth roles, per-branch isolation, template/front-end patterns, migration workflow, security rules and the verification loop. Read before editing anything in this repo.
---

# CareMed App — Project Conventions

## 1. What this system is

A cybersecurity-oriented web management system for **CareMed**, a medical
equipment rental & sales business in Iloilo City. Two very different audiences
share one codebase:

| Audience | Access | Where they live |
| --- | --- | --- |
| Public visitors / customers | Browse catalog only, order through **Facebook Messenger** | `user_routes.py`, `templates/user/`, `static/{css,js}/user(s)/` |
| Back office (Administrator, Staff) | Inventory, transactions, billing, refills, reports | `admin_routes.py`, `templates/admin/`, `static/{css,js}/admin/` |
| Developer / system owner | Branch provisioning, backups, data repair | `developer_routes.py`, `templates/branch_management/` |

Customers do **not** have accounts in the current direction of the project:
ordering happens off-platform via Messenger. Do not re-add customer
registration, carts or checkout without an explicit request — see §9.

## 2. Runtime & commands

- Python venv is `venv/` at repo root and is auto-activated in the shell
  (`(venv)` prompt). Never install packages without checking `requirements.txt`
  first — only add there if genuinely new.
- App factory-free single module: `app.py` builds `app`, registers extensions,
  hooks and blueprints. Run with `python app.py` (dev server) or via
  `Dockerfile` + `docker-compose.yml`.
- Configuration comes from `config.py` (`Config` = production/env-driven,
  `DevConfig` = local, defaults to `sqlite:///dev.db`). Secrets are read from
  environment variables only (`SECRET_KEY`, `DATABASE_URL`, `GOOGLE_*`,
  `MAIL_*`); `env.example` documents them. Never hard-code a secret.
- Schema changes go through Flask-Migrate:
  `flask db migrate -m "…"`, `flask db upgrade`. Hand-written revisions are
  acceptable and common — reuse an existing file's style. Verify the graph with
  `python _heads.py` (one HEAD expected) and `python _drift.py` after adding one.
- Scheduled jobs: `utils/backup.py` (APScheduler daily 00:00) and
  `generate_monthly_invoices.py` (standalone cron/task script, README §1–3).

## 3. Folder map

```
app.py               extensions, hooks (branch context, IDS, CSP), blueprints
config.py            Config / DevConfig
extensions.py        db, migrate, login_manager, oauth, mail, csrf, limiter, passhasher
routes/              one blueprint per audience (admin_routes.py is very large)
models/              SQLAlchemy models; models/__init__.py re-exports them
forms/               WTForms classes (auth_forms.py, update_profile_form.py)
utils/               security.py, branch_scope.py, backup.py, messenger.py
templates/<audience>/   admin, authentication, branch_management, errors, modals, user
static/css/<audience>/  static/js/admin/, static/js/users/
migrations/          Alembic
```

`BranchScoped` and `Branch` live in `models/branch.py`; every branch-owned model
inherits `BranchScoped` and carries `branch_id`.

## 4. Authentication & authorization

- Roles are **plain strings** on `User.role`: `'Administrator'`, `'Staff'`,
  `'Developer'`, `'customer'` (DB default). Compare with
  `(current_user.role or '').strip()` — stored values may carry whitespace.
- Guard decorators, applied *below* `@login_required`, in this order:
  ```python
  @admin_bp.route("/customers")
  @login_required
  @admin_or_staff_required            # routes/admin_routes.py
  @permission_required('can_manage_customers')   # granular Permission rows
  def customers(): ...
  ```
  `developer_required` (in `developer_routes.py`) is the developer-console gate.
- `User.password_hash` is Argon2 via `extensions.passhasher`; verify inside
  `try/except VerifyMismatchError`. Login is hardened by `LoginAttemptGuard`,
  `BotDetector`, honeypot fields, `SecurityLog` auditing and `BlockedIP`
  checks (`before_request` in `app.py`). Keep new auth code inside the
  `AuthController` class in `auth_routes.py` — routes are registered with
  `bp.add_url_rule(..., view_func=limiter.limit("…")(self.<method>))`, so
  per-route rate limits live in `_register_routes`.
- Google sign-in (`extensions.oauth` + `GoogleOAuthService`) is **login only**:
  the callback matches `google_id` first, then email, and links the identity to
  an account that already exists. Auto-provisioning from an OAuth callback
  (OAuth registration) is **removed** — gone are `registration.html`,
  `registration.css`, `RegisterForm`, the email-verification token helpers in
  `utils/security.py` and `PasswordPolicy.matches_registration_regex`. A Google
  address with no provisioned account is rejected and logged as
  `Unmatched OAuth Login`; `User.is_verified` stays (the callback sets it, and
  staff provisioning sets it to `True`).

## 5. Per-branch isolation (`utils/branch_scope.py`)

- `app.py:before_request` activates the branch of the signed-in
  Administrator/Staff; `teardown_request` releases it. Customers, guests and
  the developer console run unscoped.
- All `BranchScoped` queries auto-filter, and new rows get `branch_id` stamped
  automatically. To cross branches (developer console, backfills, cross-branch
  reports) wrap the block in `with bypass_branch_filter():` or
  `with use_branch(id):` — never clear the session info by hand.
- Branding is injected into **every** template by `inject_branch_theme` as
  `branch_theme` (dict: `theme_color`, `accent_color`, `logo`, `hero_title`,
  `announcement`, `footer_text`, `contact_number`, `email`, `address`, …) plus
  `active_branch` (model or `None`). Public pages have no `active_branch`;
  anything branch-specific on a public page must fall back to a default, and
  per-branch data has to be looked up with `bypass_branch_filter()`.

## 6. Models & migrations

- Models use `db.Column` with explicit `nullable=`/`default=`; timestamps are
  naive UTC (`db.DateTime`, `default=datetime.utcnow`) and rendered through the
  `pst` Jinja filter (`utc_to_pst` in `app.py`). Money is `db.Numeric`; format
  with the `currency` Jinja filter or `₱{{ "{:,.0f}".format(x) }}`.
- Migration files are hand-audited after autogenerate: SQLite needs
  `with op.batch_alter_table(...) as batch_op:` for every ALTER, and index names
  go through `batch_op.f('ix_<table>_<col>')`. `downgrade()` mirrors `upgrade()`
  in reverse order. Keep one linear chain (no merge revisions) unless asked.

## 7. Views

- Function-based views with `@bp.route`, `render_template`, `flash()` +
  `redirect(url_for(...))`. Always `url_for('blueprint.endpoint')` — never a
  hard-coded path (except in JS constants injected from the template, e.g.
  `const PRODUCTS_URL = "{{ url_for('user.products') }}";`).
- Read-only public pages must not mutate data; state changes are POST-only and
  CSRF-protected.
- Flash categories in use: `success`, `error`, `info`, `warning`, `danger`
  (`danger` appears in auth routes, the rest in user/admin routes). Templates
  render them either as `.medical-toast` blocks or via `get_flashed_messages`.

## 8. Templates & front-end

- **No shared base template** in `templates/user/` or
  `templates/authentication/`: each page is a standalone HTML document that
  repeats the nav/drawer/toast markup and inlines page `<style>` blocks, then
  links one CSS file (`static/css/user/<page>.css`) and, where needed, one JS
  file (`static/js/users/<page>.js`). Admin pages do share
  `templates/admin/nav_base.html`. Expect and preserve duplication — refactoring
  the customer nav into an include is a deliberate, larger change.
- Show/hide by auth state with the `auth-only` / `guest-only` classes; the
  `<body>` gets `logged-in` or `guest` and page JS toggles the classes' display.
- Inline scripts must carry `nonce="{{ csp_nonce() }}"`
  (Talisman `content_security_policy_nonce_in=["script-src"]`); external
  scripts from `static/` are covered by `script-src`. CSP is defined in `app.py`.
- Uploaded files land under `static/uploads/<category>/` (`products`, `ids`,
  `payments`, `billing`, `expenses`, `branches`) and are referenced by the
  relative path stored on the model (`url_for('static', filename=obj.image)`).

## 9. Product direction that must not silently regress

- **Ordering = Messenger.** Public product cards / detail pages point at the
  branch's Messenger chat. Contact values are normalised by
  `utils/messenger.py::normalize_messenger_url` (accepts `CareMedPage`,
  `m.me/CareMedPage`, `facebook.com/CareMedPage`) and surfaced through the
  `messenger_url` / `messenger_link` template globals with a
  `MESSENGER_PAGE_URL` fallback — branch value wins over the global default.
- Login is a **back-office portal**: only `Administrator`, `Staff`, `Developer`
  may sign in (`BACKOFFICE_ROLES`). No public sign-up, email verification,
  customer profile, cart, checkout or order dashboard surfaces.
- Product **reviews are live catalogue content** (not part of the removed
  transaction flow): the detail page averages `product.reviews` in the template
  and only renders the form for signed-in visitors, otherwise showing "You must
  be signed in to rate or review items." `POST /customer/product/<id>/review` is
  `@login_required` + `@admin_redirect` + `@limiter.exempt`, requires a rating of
  1-5 **and** a non-empty comment, and inserts one
  `ProductReview(product_id, user_id, rating, comment)` row per accepted POST
  (there is no per-user limit).
- Public catalog data is branch-agnostic: since guests have no branch, catalog
  queries need `bypass_branch_filter()` plus an `is_active` filter.

## 10. Security non-negotiables

- CSRF: `csrf.init_app(app)` is global. Every POST form needs
  `<input type="hidden" name="csrf_token" value="{{ csrf_token() }}">` (AJAX
  sends it too). `@csrf.exempt` requires a written justification. `WTF_CSRF_SSL_STRICT` stays at its default (`True`), so HTTPS POSTs also need a same-origin `Referer` header — a scripted client that omits it gets a 400 "The referrer header is missing.", which is not a token bug. Tokens expire after `WTF_CSRF_TIME_LIMIT` (3600s).
- Rate limits: global default is `200/day, 50/hour` keyed by user when logged in
  (`extensions.rate_limit_key`); blueprints get explicit ceilings in `app.py`
  (admin/staff are raised to `1000/hour`, never fully exempt). New sensitive
  endpoints add a `@limiter.limit("n per minute")`.
- Never echo secrets, full IDs, or raw stack traces to users: the
  `429`/`403`/`404`/`500` handlers in `app.py` + `templates/errors/` render
  friendly pages and log to `SecurityLog`.
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production;
  `enforce_admin_session_timeout` expires idle back-office sessions.

## 11. Verification loop (do this before declaring work done)

```powershell
python -m compileall -q app.py routes models forms utils    # syntax
python _heads.py                                            # single alembic head
python scripts/url_audit.py                                 # missing/unused endpoints, orphans
python scripts/template_smoke_test.py                       # renders pages + Messenger CTAs
python -c "import app; app.app.jinja_env.get_template('user/products.html')"
python -c "import app; print(app.app.url_map)"              # endpoints intact
flask db upgrade                                            # apply locally
```

There is no automated test suite: confirm behaviour by booting `python app.py`
and exercising the changed screen (guest view, logged-in view, and the
Administrator path when the change touches auth or branch scope).

## 12. Gotchas

- Windows + PowerShell: quote paths, use `;` to chain commands, and pass
  `--no-pager` to git.
- `venv/` sits next to the source but is never something to edit or search —
  always exclude it from repo-wide searches.
- `admin_routes.py` (~5.1k lines) is a single module — search for the endpoint
  before adding a similar view, and reuse its local helpers instead of adding
  new global ones.
- Role strings are capitalized (`'Administrator'`, `'Staff'`, `'Developer'`)
  except the DB default `'customer'`; a mismatch silently breaks branch
  scoping (§5) and role gates (§4).
- Branch admin forms post multipart data (logo upload): keep
  `enctype="multipart/form-data"` and save files through the helper in
  `developer_routes.py::_save_branch_logo`.
