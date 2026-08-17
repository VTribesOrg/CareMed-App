document.addEventListener('DOMContentLoaded', () => {

    /* ── 1. Inventory Tab Switcher ──────────────────────────────── */
    const tabButtons = document.querySelectorAll('.custom-tab-trigger');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const container = this.closest('.inventory-tracking-container');
            if (!container) return;

            // Deactivate all panels and buttons inside this container
            container.querySelectorAll('.inventory-data-panel').forEach(panel => {
                panel.classList.remove('is-active');
            });
            container.querySelectorAll('.custom-tab-trigger').forEach(btn => {
                btn.classList.remove('is-active');
            });

            // Activate selected panel and button
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('is-active');
            this.classList.add('is-active');
        });
    });

    /* ── 2. Oxygen Refill Modal Logic ───────────────────────────── */
    const oxygenModal = document.getElementById('oxygen-request-modal');
    const closeBtn = document.getElementById('close-oxygen-modal');
    const refillForm = document.getElementById('refill-form');
    // Targeting the oxygen panel specifically ensures this only affects oxygen tanks
    const oxygenPanel = document.getElementById('oxygen-tanks-panel');

    if (oxygenPanel) {
        oxygenPanel.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-refill-trigger');
            if (btn) {
                // Populate hidden inputs
                document.getElementById('refill-product-id').value = btn.dataset.productId;
                document.getElementById('refill-product-name').value = btn.dataset.productName;
                
                // Show modal
                oxygenModal.classList.remove('hidden');
            }
        });
    }

    // Function to close and reset
    const closeAndResetModal = () => {
        oxygenModal.classList.add('hidden');
        if (refillForm) refillForm.reset();
    };

    // Close Button Listener
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAndResetModal);
    }

    // Close when clicking overlay background
    if (oxygenModal) {
        oxygenModal.addEventListener('click', (e) => {
            if (e.target === oxygenModal) {
                closeAndResetModal();
            }
        });
    }

    /* ── 3. Asynchronous Dashboard Data Loader ─────────────────── */
    fetch("/admin/dashboard/data")
        .then(response => response.json())
        .then(data => {
            // Compute overall metrics dynamically
            const overallIncome = data.total_sales + data.total_rentals + data.total_refill_income;
            const netProfit = overallIncome - data.total_expenses;

            // Update Stat Cards
            const valOverallIncome = document.getElementById("val-overall-income");
            if (valOverallIncome) valOverallIncome.innerText = "₱" + overallIncome.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

            const valNetProfit = document.getElementById("val-net-profit");
            if (valNetProfit) {
                if (netProfit >= 0) {
                    valNetProfit.style.color = "#10b981";
                    valNetProfit.innerText = "₱" + netProfit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                } else {
                    valNetProfit.style.color = "#ef4444";
                    valNetProfit.innerText = "−₱" + Math.abs(netProfit).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                }
            }

            const valTotalSales = document.getElementById("val-total-sales");
            if (valTotalSales) valTotalSales.innerText = "₱" + data.total_sales.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

            const valSalesNet = document.getElementById("val-sales-net");
            if (valSalesNet) {
                if (data.sales_net >= 0) {
                    valSalesNet.style.color = "#059669";
                    valSalesNet.innerText = "₱" + data.sales_net.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                } else {
                    valSalesNet.style.color = "#dc2626";
                    valSalesNet.innerText = "−₱" + Math.abs(data.sales_net).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                }
            }

            const valTotalRefillIncome = document.getElementById("val-total-refill-income");
            if (valTotalRefillIncome) valTotalRefillIncome.innerText = "₱" + data.total_refill_income.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

            const valTotalRefillsCount = document.getElementById("val-total-refills-count");
            if (valTotalRefillsCount) valTotalRefillsCount.innerText = data.total_refills_count;

            const valTotalRentals = document.getElementById("val-total-rentals");
            if (valTotalRentals) valTotalRentals.innerText = "₱" + data.total_rentals.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

            const valTotalExpenses = document.getElementById("val-total-expenses");
            if (valTotalExpenses) valTotalExpenses.innerText = "₱" + data.total_expenses.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

            const valActiveRentals = document.getElementById("val-active-rentals");
            if (valActiveRentals) valActiveRentals.innerText = data.active_rentals_count;

            const valTotalInventory = document.getElementById("val-total-inventory");
            if (valTotalInventory) valTotalInventory.innerText = data.total_inventory;

            const valLowStockContainer = document.getElementById("val-low-stock");
            const valLowStockCount = document.getElementById("val-low-stock-count");
            if (valLowStockContainer && valLowStockCount) {
                valLowStockCount.innerText = data.low_stock_count;
                if (data.low_stock_count > 0) {
                    valLowStockContainer.style.color = "#ef4444";
                    valLowStockContainer.innerHTML = `<span id="val-low-stock-count">${data.low_stock_count}</span> Low stock items`;
                } else {
                    valLowStockContainer.style.color = "#10b981";
                    valLowStockContainer.innerHTML = `<span id="val-low-stock-count">0</span> Stock levels healthy`;
                }
            }

            // Populate Oxygen Tanks Table Body
            const oxygenTanksTbody = document.getElementById("oxygen-tanks-tbody");
            if (oxygenTanksTbody) {
                if (data.tank_statuses && data.tank_statuses.length > 0) {
                    let rowsHtml = "";
                    data.tank_statuses.forEach(tank => {
                        let sizeHtml = tank.size ? `<span style="font-weight: 400; color: #64748b; font-size: 0.9em;">(${tank.size})</span>` : "";
                        rowsHtml += `
                            <tr>
                                <td style="font-weight: 600;">
                                    ${tank.name} ${sizeHtml}
                                </td>
                                <td style="text-align: center; font-weight: 500;">${tank.total_owned}</td>
                                <td style="text-align: center;"><span class="pill-orange">${tank.rented_out}</span></td>
                                <td style="text-align: center;"><span class="pill-green">${tank.full_in_stock}</span></td>
                                <td style="text-align: center;"><span class="pill-gray">${tank.empty_in_stock}</span></td>
                            </tr>
                        `;
                    });
                    oxygenTanksTbody.innerHTML = rowsHtml;
                } else {
                    oxygenTanksTbody.innerHTML = `
                        <tr class="table-empty-row">
                            <td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">
                                No oxygen tank metrics configured.
                            </td>
                        </tr>
                    `;
                }
            }

            // Populate Standard Assets Table Body
            const standardAssetsTbody = document.getElementById("standard-assets-tbody");
            if (standardAssetsTbody) {
                if (data.standard_assets && data.standard_assets.length > 0) {
                    let rowsHtml = "";
                    data.standard_assets.forEach(asset => {
                        rowsHtml += `
                            <tr>
                                <td style="font-weight: 600;">${asset.name}</td>
                                <td style="text-align: center; font-weight: 500;">${asset.total_stock}</td>
                                <td style="text-align: center;"><span class="pill-blue">${asset.rented_count}</span></td>
                                <td style="text-align: center; color: #64748b;">${asset.used_count}</td>
                                <td style="text-align: center;"><span class="pill-green">${asset.brand_new_count}</span></td>
                            </tr>
                        `;
                    });
                    standardAssetsTbody.innerHTML = rowsHtml;
                } else {
                    standardAssetsTbody.innerHTML = `
                        <tr class="table-empty-row">
                            <td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No standard asset records found.</td>
                        </tr>
                    `;
                }
            }
        })
        .catch(error => console.error("Error loading dashboard data:", error));

});