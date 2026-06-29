document.addEventListener('DOMContentLoaded', function () {

    // ── Helpers ────────────────────────────────────────────────────────────
    function getParam(key) {
        return new URL(window.location.href).searchParams.get(key) || '';
    }

    function navigate(params) {
        const url = new URL(window.location.href);
        Object.entries(params).forEach(([k, v]) => {
            if (v) {
                url.searchParams.set(k, v);
            } else {
                url.searchParams.delete(k);
            }
        });
        url.searchParams.set('page', 1);
        window.location.href = url.href;
    }

    // ── Row limit ──────────────────────────────────────────────────────────
    const rowLimitSelect = document.getElementById('row-limit-select');
    if (rowLimitSelect) {
        rowLimitSelect.addEventListener('change', function () {
            const url = new URL(window.location.href);
            url.searchParams.set('limit', this.value);
            url.searchParams.set('page', 1);
            window.location.href = url.href;
        });
    }

    // ── Page jump ──────────────────────────────────────────────────────────
    const jumpBtn   = document.getElementById('jump-page-submit');
    const jumpInput = document.getElementById('jump-page-input');

    if (jumpBtn) {
        jumpBtn.addEventListener('click', function () {
            const page    = parseInt(jumpInput.value);
            const maxPage = parseInt(jumpInput.max);
            if (page >= 1 && page <= maxPage) {
                const url = new URL(window.location.href);
                url.searchParams.set('page', page);
                window.location.href = url.href;
            }
        });
    }

    if (jumpInput) {
        jumpInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') jumpBtn.click();
        });
    }

    // ── Keyword search ─────────────────────────────────────────────────────
    const searchInput = document.getElementById('log-entry-search');
    let searchTimer;

    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                clearTimeout(searchTimer);
                navigate({ q: this.value.trim() });
            }
        });
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimer);
            const val = this.value.trim();
            searchTimer = setTimeout(() => navigate({ q: val }), 600);
        });
    }

    // ── Action category filter ─────────────────────────────────────────────
    const actionFilter = document.getElementById('action-category-filter');
    if (actionFilter) {
        actionFilter.addEventListener('change', function () {
            navigate({ type: this.value });
        });
    }

    // ── Staff / personnel filter ───────────────────────────────────────────
    const staffFilter = document.getElementById('staff-filter');
    if (staffFilter) {
        staffFilter.addEventListener('change', function () {
            navigate({ staff_id: this.value });
        });
    }

    // ── Date range filter ──────────────────────────────────────────────────
    const dateFrom  = document.getElementById('log-date-from');
    const dateTo    = document.getElementById('log-date-to');
    const applyDate = document.getElementById('apply-date-filter');

    if (applyDate) {
        applyDate.addEventListener('click', function () {
            const from = dateFrom ? dateFrom.value : '';
            const to   = dateTo   ? dateTo.value   : '';
            navigate({ date_from: from, date_to: to });
        });
    }

    [dateFrom, dateTo].forEach(el => {
        if (el) {
            el.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') applyDate && applyDate.click();
            });
        }
    });

    // ── Clear filters ──────────────────────────────────────────────────────
    const clearBtn = document.getElementById('reset-log-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            const url = new URL(window.location.href);
            ['q', 'type', 'date_from', 'date_to'].forEach(k => url.searchParams.delete(k));
            url.searchParams.set('page', 1);
            window.location.href = url.href;
        });
    }

    // ── Category pill helper ───────────────────────────────────────────────
    function getCategoryPill(action) {
        if (['SALE', 'Expense Recorded', 'Expense Deleted'].includes(action)) {
            return '<span style="font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:99px;background:#fef2f2;color:#e53935;">Financial</span>';
        } else if (['RENTAL', 'Equipment Return'].includes(action)) {
            return '<span style="font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:99px;background:#eff6ff;color:#3b82f6;">Rental</span>';
        } else if (['Restock', 'Initial Stock Entry', 'Product Edited', 'ARCHIVE'].includes(action)) {
            return '<span style="font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:99px;background:#f0fdf4;color:#1a7a2e;">Inventory</span>';
        } else if (action && action.includes('Customer')) {
            return '<span style="font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:99px;background:#fffbeb;color:#92400e;">Customer</span>';
        } else {
            return '<span style="font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:99px;background:#f1f5f9;color:#64748b;">System</span>';
        }
    }

    // ── View log modal ─────────────────────────────────────────────────────
    const modalOverlay  = document.getElementById('log-modal-overlay');
    const modalClose    = document.getElementById('log-modal-close');
    const modalCloseFooter = document.getElementById('log-modal-close-footer');

    function openLogModal(logId) {
        if (!modalOverlay) return;

        // Reset
        document.getElementById('modal-log-id').textContent       = '#' + logId;
        document.getElementById('modal-log-action').textContent    = '—';
        document.getElementById('modal-log-category').innerHTML    = '—';
        document.getElementById('modal-log-user').textContent      = '—';
        document.getElementById('modal-log-date').textContent      = '—';
        document.getElementById('modal-log-product').textContent   = '—';
        document.getElementById('modal-log-asset').textContent     = '—';
        document.getElementById('modal-log-quantity').textContent  = '—';
        document.getElementById('modal-log-note').textContent      = 'Loading...';

        modalOverlay.classList.add('open');

        fetch(`/admin/logs/${logId}/detail`)
            .then(r => r.json())
            .then(data => {
                if (data.status === 'error') {
                    document.getElementById('modal-log-note').textContent = 'Failed to load details.';
                    return;
                }
                document.getElementById('modal-log-action').textContent   = data.action   || '—';
                document.getElementById('modal-log-category').innerHTML   = getCategoryPill(data.action);
                document.getElementById('modal-log-user').textContent     = data.user     || '—';
                document.getElementById('modal-log-date').textContent     = data.date     || '—';
                document.getElementById('modal-log-product').textContent  = data.product  || 'N/A';
                document.getElementById('modal-log-asset').textContent    = data.asset    || '—';
                document.getElementById('modal-log-quantity').textContent = data.quantity || '0';
                document.getElementById('modal-log-note').textContent     = data.note     || 'No notes.';
            })
            .catch(() => {
                document.getElementById('modal-log-note').textContent = 'Failed to load details.';
            });
    }

    function closeLogModal() {
        if (modalOverlay) modalOverlay.classList.remove('open');
    }

    document.querySelectorAll('.view-log-trigger').forEach(btn => {
        btn.addEventListener('click', function () {
            openLogModal(this.dataset.logId);
        });
    });

    if (modalClose)        modalClose.addEventListener('click', closeLogModal);
    if (modalCloseFooter)  modalCloseFooter.addEventListener('click', closeLogModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function (e) {
            if (e.target === this) closeLogModal();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLogModal();
    });

});