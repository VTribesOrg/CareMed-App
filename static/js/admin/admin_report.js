// ── Palette ───────────────────────────────────────────────────────────────────
const G = '#52B788', T = '#00a8cc', A = '#f59e0b', R = '#ef4444', P = '#7c3aed', S = '#94a3b8';
const COLORS = [G, T, A, R, P, S, '#06b6d4', '#8b5cf6'];

// ── Chart registry (for destroy/recreate) ─────────────────────────────────────
const ch = {};

function kill(id) {
    if (ch[id]) { ch[id].destroy(); delete ch[id]; }
}

// ── Custom legend builder ──────────────────────────────────────────────────────
function leg(id, labels, data, colors) {
    const el = document.getElementById(id);
    if (!el) return;
    const total = data.reduce((a, b) => a + b, 0);
    el.innerHTML = labels.map((l, i) => {
        const pct = total > 0 ? Math.round(data[i] / total * 100) : 0;
        return `<span class="legend-item">
            <span class="legend-dot" style="background:${colors[i]}"></span>
            ${l} (${pct}%)
        </span>`;
    }).join('');
}

// ── Peso formatter ────────────────────────────────────────────────────────────
function peso(v) {
    const abs = Math.abs(v);
    if (abs >= 1000) return '₱' + (v / 1000).toFixed(0) + 'k';
    return '₱' + v.toFixed(0);
}

// ── Net profit color helper ────────────────────────────────────────────────────
function colorNetProfit() {
    const el = document.getElementById('net-profit-value');
    if (!el) return;
    const val = parseFloat(el.dataset.value);
    el.style.color = val >= 0 ? '#16a34a' : '#ef4444';
}

// ── Chart renderers ───────────────────────────────────────────────────────────
function renderSales() {
    kill('revenue'); kill('category');

    ch['revenue'] = new Chart(document.getElementById('chart-revenue'), {
        type: 'bar',
        data: {
            labels: LABELS,
            datasets: [{ label: 'Sales', data: SALES, backgroundColor: G + 'CC', borderRadius: 6 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { callback: v => peso(v) } } }
        }
    });

    if (CAT_DATA.length > 0) {
        const catColors = CAT_LABELS.map((_, i) => COLORS[i % COLORS.length]);
        ch['category'] = new Chart(document.getElementById('chart-category'), {
            type: 'doughnut',
            data: { labels: CAT_LABELS, datasets: [{ data: CAT_DATA, backgroundColor: catColors, borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }
        });
        leg('legend-category', CAT_LABELS, CAT_DATA, catColors);
    }
}

function renderRentals() {
    kill('rental-volume');

    ch['rental-volume'] = new Chart(document.getElementById('chart-rental-volume'), {
        type: 'bar',
        data: { labels: LABELS, datasets: [{ label: 'Rentals', data: RENTALS, backgroundColor: T + 'CC', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderInventory() {
    kill('stock');

    if (STOCK_DATA.length > 0) {
        ch['stock'] = new Chart(document.getElementById('chart-stock'), {
            type: 'bar',
            data: {
                labels: STOCK_LABELS,
                datasets: [{ label: 'Stock', data: STOCK_DATA, backgroundColor: G + 'CC', borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function renderCustomers() {
    kill('customer-growth');

    ch['customer-growth'] = new Chart(document.getElementById('chart-customer-growth'), {
        type: 'line',
        data: {
            labels: LABELS,
            datasets: [{
                label: 'New Customers',
                data: CUST_GROWTH,
                borderColor: G,
                backgroundColor: G + '22',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderFinancial() {
    kill('rev-cos');
    kill('rev-opex');
    kill('net-profit');
    kill('expenses');
    kill('cos-opex');

    // ── 1. Revenue vs Cost of Sales ──────────────────────────────────────────
    ch['rev-cos'] = new Chart(document.getElementById('chart-rev-cos'), {
        type: 'bar',
        data: {
            labels: LABELS,
            datasets: [
                { label: 'Revenue',       data: REVENUE, backgroundColor: '#16a34aCC', borderRadius: 5 },
                { label: 'Cost of Sales', data: COS_M,   backgroundColor: '#ea580cCC', borderRadius: 5 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => peso(v) } } }
        }
    });

    // ── 2. Revenue vs Operating Expenses ────────────────────────────────────
    ch['rev-opex'] = new Chart(document.getElementById('chart-rev-opex'), {
        type: 'bar',
        data: {
            labels: LABELS,
            datasets: [
                { label: 'Revenue',             data: REVENUE, backgroundColor: '#16a34aCC', borderRadius: 5 },
                { label: 'Operating Expenses',  data: OPEX_M,  backgroundColor: '#0284c7CC', borderRadius: 5 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => peso(v) } } }
        }
    });

    // ── 3. Monthly Net Profit Trend ──────────────────────────────────────────
    const netColors = NET_M.map(v => v >= 0 ? '#16a34aCC' : '#ef4444CC');
    ch['net-profit'] = new Chart(document.getElementById('chart-net-profit'), {
        type: 'bar',
        data: {
            labels: LABELS,
            datasets: [{
                label: 'Net Profit',
                data: NET_M,
                backgroundColor: netColors,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: { callback: v => peso(v) },
                    grid: {
                        color: ctx => ctx.tick.value === 0 ? '#94a3b8' : '#f1f5f9',
                        lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1
                    }
                }
            }
        }
    });

    // ── 4. Expense Breakdown by Category (donut) ─────────────────────────────
    if (EXP_DATA.length > 0) {
        const expColors = EXP_LABELS.map((_, i) => COLORS[i % COLORS.length]);
        ch['expenses'] = new Chart(document.getElementById('chart-expenses'), {
            type: 'doughnut',
            data: {
                labels: EXP_LABELS,
                datasets: [{ data: EXP_DATA, backgroundColor: expColors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '65%'
            }
        });
        leg('legend-expenses', EXP_LABELS, EXP_DATA, expColors);
    }

    // ── 5. Cost of Sales vs Operating Expenses (stacked bar) ─────────────────
    ch['cos-opex'] = new Chart(document.getElementById('chart-cos-opex'), {
        type: 'bar',
        data: {
            labels: LABELS,
            datasets: [
                { label: 'Cost of Sales',      data: COS_M,  backgroundColor: '#ea580cCC', borderRadius: 4 },
                { label: 'Operating Expenses', data: OPEX_M, backgroundColor: '#0284c7CC', borderRadius: 4 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { callback: v => peso(v) } }
            }
        }
    });

    colorNetProfit();
}

// ── Equipment P&L Charts ──────────────────────────────────────────────────────
function renderEquipment() {
    kill('equipment-pl');
    kill('equipment-net');

    if (typeof EQ_NAMES === 'undefined' || !EQ_NAMES.length) return;

    const top8Names  = EQ_NAMES.slice(0, 8);
    const top8Income = EQ_INCOME.slice(0, 8);
    const top8Cost   = EQ_COST.slice(0, 8);
    const top8Net    = EQ_NET.slice(0, 8);

    // ── Income vs Cost grouped bar ────────────────────────────────────────────
    ch['equipment-pl'] = new Chart(document.getElementById('chart-equipment-pl'), {
        type: 'bar',
        data: {
            labels: top8Names,
            datasets: [
                {
                    label: 'Total Income',
                    data: top8Income,
                    backgroundColor: '#16a34aCC',
                    borderRadius: 4,
                },
                {
                    label: 'Total Cost',
                    data: top8Cost,
                    backgroundColor: '#ea580cCC',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => peso(v) }
                }
            }
        }
    });

    // ── Net profit per equipment bar ──────────────────────────────────────────
    ch['equipment-net'] = new Chart(document.getElementById('chart-equipment-net'), {
        type: 'bar',
        data: {
            labels: top8Names,
            datasets: [{
                label: 'Net Profit',
                data: top8Net,
                backgroundColor: top8Net.map(v => v >= 0 ? '#16a34aCC' : '#ef4444CC'),
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: { callback: v => peso(v) },
                    grid: {
                        color: ctx => ctx.tick.value === 0 ? '#94a3b8' : '#f1f5f9',
                        lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1
                    }
                }
            }
        }
    });
}

// ── Tab switching ─────────────────────────────────────────────────────────────
const renderers = {
    sales:     renderSales,
    rentals:   renderRentals,
    inventory: renderInventory,
    customers: renderCustomers,
    financial: renderFinancial,
    equipment: renderEquipment,
};

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.report-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById('panel-' + btn.dataset.tab);
        if (panel) {
            panel.classList.add('active');
            setTimeout(() => renderers[btn.dataset.tab]?.(), 50);
        }
    });
});

// ── Initial render ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', renderSales);