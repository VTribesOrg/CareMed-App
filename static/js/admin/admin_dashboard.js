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
    const oxygenPanel = document.getElementById('oxygen-tanks-panel');

    if (oxygenPanel) {
        oxygenPanel.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-refill-trigger');
            if (btn) {
                document.getElementById('refill-product-id').value = btn.dataset.productId;
                document.getElementById('refill-product-name').value = btn.dataset.productName;
                
                if (oxygenModal) oxygenModal.classList.remove('hidden');
            }
        });
    }

    const closeAndResetModal = () => {
        if (oxygenModal) oxygenModal.classList.add('hidden');
        if (refillForm) refillForm.reset();
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeAndResetModal);
    }

    if (oxygenModal) {
        oxygenModal.addEventListener('click', (e) => {
            if (e.target === oxygenModal) {
                closeAndResetModal();
            }
        });
    }

    /* ── 3. Asynchronous Dashboard Data Loader & Filters ───────── */
    const filterPeriodSelect = document.getElementById('dashboard-filter-period');
    const customDateInputs = document.getElementById('custom-date-inputs');
    const applyCustomDateBtn = document.getElementById('apply-custom-date');
    const startDateInput = document.getElementById('custom-start-date');
    const endDateInput = document.getElementById('custom-end-date');

    // Toggle custom date container visibility and auto-fetch on change
    if (filterPeriodSelect) {
        filterPeriodSelect.addEventListener('change', function () {
            if (this.value === 'custom') {
                if (customDateInputs) customDateInputs.style.display = 'flex';
            } else {
                if (customDateInputs) customDateInputs.style.display = 'none';
                loadDashboardData(this.value);
            }
        });
    }

    if (applyCustomDateBtn) {
        applyCustomDateBtn.addEventListener('click', () => {
            const period = filterPeriodSelect ? filterPeriodSelect.value : 'custom';
            const startVal = startDateInput ? startDateInput.value : '';
            const endVal = endDateInput ? endDateInput.value : '';

            if (period === 'custom' && startVal && endVal) {
                loadDashboardData(period, startVal, endVal);
            } else {
                alert('Please select both start and end dates for the custom range.');
            }
        });
    }

    const loadDashboardData = (period = 'this_month', startDate = '', endDate = '') => {
        let url = `/admin/dashboard/data?period=${period}`;
        if (period === 'custom' && startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                const rawSales = Number(data.total_sales) || 0;
                const freightExpense = Number(data.total_freight) || 0;
                const totalRentals = Number(data.total_rentals) || 0;
                const totalRefillIncome = Number(data.total_refill_income) || 0;
                const totalExpenses = Number(data.total_expenses) || 0;
                const salesNet = Number(data.sales_net) || (rawSales - freightExpense);
                const totalRefillsCount = Number(data.total_refills_count) || 0;
                const activeRentalsCount = Number(data.active_rentals_count) || 0;
                const totalInventory = Number(data.total_inventory) || 0;
                const customerDeposits = Number(data.customer_deposits) || 0;
                const lowStockCount = Number(data.low_stock_count) || 0;

                const adjustedSales = rawSales - freightExpense;
                const overallIncome = adjustedSales + totalRentals + totalRefillIncome;
                const netProfit = overallIncome - totalExpenses;

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
                if (valTotalSales) {
                    if (adjustedSales >= 0) {
                        valTotalSales.innerText = "₱" + adjustedSales.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    } else {
                        valTotalSales.innerText = "−₱" + Math.abs(adjustedSales).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    }
                }

                const valSalesBreakdown = document.getElementById("val-sales-breakdown");
                if (valSalesBreakdown) {
                    const formattedGross = "₱" + rawSales.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    const formattedFreight = "₱" + freightExpense.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    valSalesBreakdown.innerText = `Gross: ${formattedGross} | Freight: -${formattedFreight}`;
                }

                const valSalesNet = document.getElementById("val-sales-net");
                if (valSalesNet) {
                    if (salesNet >= 0) {
                        valSalesNet.style.color = "#059669";
                        valSalesNet.innerText = "₱" + salesNet.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    } else {
                        valSalesNet.style.color = "#dc2626";
                        valSalesNet.innerText = "−₱" + Math.abs(salesNet).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    }
                }

                const valTotalRefillIncome = document.getElementById("val-total-refill-income");
                if (valTotalRefillIncome) valTotalRefillIncome.innerText = "₱" + totalRefillIncome.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

                const valTotalRefillsCount = document.getElementById("val-total-refills-count");
                if (valTotalRefillsCount) valTotalRefillsCount.innerText = totalRefillsCount;

                const valTotalRentals = document.getElementById("val-total-rentals");
                if (valTotalRentals) valTotalRentals.innerText = "₱" + totalRentals.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

                const valRentalShare = document.getElementById("val-rental-share");
                let rentalIncomeValue = totalRentals * 0.30;
                if (valRentalShare) {
                    valRentalShare.innerText = "₱" + rentalIncomeValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                }

                const valTotalCommission = document.getElementById("val-total-commission");
                if (valTotalCommission) {
                    const refillBonus = totalRefillsCount * 100;
                    const salesCommission = adjustedSales * 0.50;
                    const totalCommission = rentalIncomeValue + refillBonus + salesCommission;
                    valTotalCommission.innerText = "₱" + totalCommission.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                }

                const valTotalExpenses = document.getElementById("val-total-expenses");
                if (valTotalExpenses) valTotalExpenses.innerText = "₱" + totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

                const valActiveRentals = document.getElementById("val-active-rentals");
                if (valActiveRentals) valActiveRentals.innerText = activeRentalsCount;

                const valTotalInventory = document.getElementById("val-total-inventory");
                if (valTotalInventory) valTotalInventory.innerText = totalInventory;

                const valCustomerDeposits = document.getElementById("val-customer-deposits");
                if (valCustomerDeposits) {
                    valCustomerDeposits.innerText = "₱" + customerDeposits.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
                }

                const valTotalFreight = document.getElementById("val-total-freight");
                if (valTotalFreight) {
                    valTotalFreight.innerText = "₱" + freightExpense.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});
                }

                const valTrackingFreight = document.getElementById("val-tracking-freight");
                if (valTrackingFreight) {
                    valTrackingFreight.innerText = data.tracking_freight || 0;
                }

                const valLowStockContainer = document.getElementById("val-low-stock");
                const valLowStockCountElement = document.getElementById("val-low-stock-count");
                if (valLowStockContainer && valLowStockCountElement) {
                    valLowStockCountElement.innerText = lowStockCount;
                    if (lowStockCount > 0) {
                        valLowStockContainer.style.color = "#ef4444";
                        valLowStockContainer.innerHTML = `<span id="val-low-stock-count">${lowStockCount}</span> Low stock items`;
                    } else {
                        valLowStockContainer.style.color = "#10b981";
                        valLowStockContainer.innerHTML = `<span id="val-low-stock-count">0</span> Stock levels healthy`;
                    }
                }

                const oxygenTanksTbody = document.getElementById("oxygen-tanks-tbody");
                if (oxygenTanksTbody) {
                    if (data.tank_statuses && data.tank_statuses.length > 0) {
                        let rowsHtml = "";
                        data.tank_statuses.forEach(tank => {
                            let sizeHtml = tank.size ? `<span style="font-weight: 400; color: #64748b; font-size: 0.9em;">(${tank.size})</span>` : "";
                            rowsHtml += `
                                <tr>
                                    <td style="font-weight: 600;">${tank.name} ${sizeHtml}</td>
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
                                <td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No oxygen tank metrics configured.</td>
                            </tr>
                        `;
                    }
                }

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
    };

    loadDashboardData('this_month');

    /* ── 4. Sales Summary Modal & Product Breakdown Loader ───────── */
    const salesCard = document.getElementById('card-sales-profit');
    const salesModal = document.getElementById('salesSummaryModal');
    const closeSalesModalBtn = document.getElementById('closeSalesModal');
    const closeSalesFooterBtn = document.getElementById('closeSalesModalFooter');
    const salesSummaryTbody = document.getElementById('sales-summary-tbody');
    const salesModalDateRange = document.getElementById('sales-modal-date-range');
    const salesModalCount = document.getElementById('sales-modal-count');

    const closeSalesModal = () => {
        if (salesModal) salesModal.style.display = 'none';
    };

    if (salesCard && salesModal) {
        salesCard.addEventListener('click', () => {
            salesModal.style.display = 'flex';

            const currentPeriod = filterPeriodSelect ? filterPeriodSelect.value : 'this_month';
            const startVal = startDateInput ? startDateInput.value : '';
            const endVal = endDateInput ? endDateInput.value : '';

            if (salesModalDateRange) {
                salesModalDateRange.innerText = `Period: ${currentPeriod.replace('_', ' ').toUpperCase()}`;
            }

            if (salesSummaryTbody) {
                salesSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 30px; color: #64748b;">Loading product sales performance...</td></tr>`;
            }

            let fetchUrl = `/admin/dashboard/sales-transactions?period=${currentPeriod}`;
            if (currentPeriod === 'custom' && startVal && endVal) {
                fetchUrl += `&start_date=${startVal}&end_date=${endVal}`;
            }

            fetch(fetchUrl)
                .then(response => response.json())
                .then(resData => {
                    const products = resData.transactions || [];
                    if (salesModalCount) {
                        salesModalCount.innerText = `Showing ${products.length} product${products.length === 1 ? '' : 's'}`;
                    }

                    if (products.length > 0) {
                        let rowsHtml = '';
                        products.forEach(item => {
                            const totalIncome = Number(item.total_income) || 0;
                            const totalSold = Number(item.quantity_sold) || 0;

                            rowsHtml += `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 8px; font-weight: 600; color: #0f172a;">${item.product_name}</td>
                                    <td style="padding: 8px; text-align: center; font-weight: 500; color: #334155;">${totalSold}</td>
                                    <td style="padding: 8px; text-align: right; font-weight: 600; color: #059669;">₱${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                                </tr>
                            `;
                        });
                        salesSummaryTbody.innerHTML = rowsHtml;
                    } else {
                        salesSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 30px; color: #64748b;">No product sales found for this period.</td></tr>`;
                    }
                })
                .catch(err => {
                    console.error("Error fetching product sales summary:", err);
                    if (salesSummaryTbody) {
                        salesSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 30px; color: #dc2626;">Failed to load product performance.</td></tr>`;
                    }
                });
        });
    }

    if (closeSalesModalBtn) closeSalesModalBtn.addEventListener('click', closeSalesModal);
    if (closeSalesFooterBtn) closeSalesFooterBtn.addEventListener('click', closeSalesModal);

    if (salesModal) {
        salesModal.addEventListener('click', (e) => {
            if (e.target === salesModal) closeSalesModal();
        });
    }

    /* ── 5. Rental & Deposit Summary Modal Loader ──────────────── */
    const rentalCard = document.getElementById('card-customer-deposits');
    const rentalModal = document.getElementById('depositSummaryModal');
    const closeRentalModalBtn = document.getElementById('closeDepositModal');
    const closeRentalFooterBtn = document.getElementById('closeDepositModalFooter');
    const rentalSummaryTbody = document.getElementById('deposit-summary-tbody');
    const rentalModalDateRange = document.getElementById('deposit-modal-date-range');
    const rentalModalCount = document.getElementById('deposit-modal-count');

    const closeRentalModal = () => {
        if (rentalModal) rentalModal.style.display = 'none';
    };

    if (rentalCard && rentalModal) {
        rentalCard.addEventListener('click', () => {
            rentalModal.style.display = 'flex';

            const currentPeriod = filterPeriodSelect ? filterPeriodSelect.value : 'this_month';
            const startVal = startDateInput ? startDateInput.value : '';
            const endVal = endDateInput ? endDateInput.value : '';

            if (rentalModalDateRange) {
                rentalModalDateRange.innerText = `Period: ${currentPeriod.replace('_', ' ').toUpperCase()}`;
            }

            if (rentalSummaryTbody) {
                rentalSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 30px; color: #64748b;">Loading customer deposits and rentals...</td></tr>`;
            }

            let fetchUrl = `/admin/dashboard/rental-transactions?period=${currentPeriod}`;
            if (currentPeriod === 'custom' && startVal && endVal) {
                fetchUrl += `&start_date=${startVal}&end_date=${endVal}`;
            }

            fetch(fetchUrl)
                .then(response => response.json())
                .then(resData => {
                    const rentals = resData.rentals || [];
                    if (rentalModalCount) {
                        rentalModalCount.innerText = `Showing ${rentals.length} record${rentals.length === 1 ? '' : 's'}`;
                    }

                    if (rentals.length > 0) {
                        let rowsHtml = '';
                        rentals.forEach(item => {
                            const customerName = item.customer_name || 'Unknown Customer';
                            const productName = item.product_name || 'N/A';
                            const deposit = Number(item.amount !== undefined ? item.amount : (item.deposit_amount !== undefined ? item.deposit_amount : item.customer_deposit)) || 0;

                            rowsHtml += `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 8px; font-weight: 600; color: #0f172a;">${customerName}</td>
                                    <td style="padding: 8px; font-weight: 500; color: #334155;">${productName}</td>
                                    <td style="padding: 8px; text-align: right; font-weight: 600; color: #059669;">₱${deposit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                                </tr>
                            `;
                        });
                        rentalSummaryTbody.innerHTML = rowsHtml;
                    } else {
                        rentalSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 30px; color: #64748b;">No records found for this period.</td></tr>`;
                    }
                })
                .catch(err => {
                    console.error("Error fetching deposit summary:", err);
                    if (rentalSummaryTbody) {
                        rentalSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 30px; color: #dc2626;">Failed to load details.</td></tr>`;
                    }
                });
        });
    }

    if (closeRentalModalBtn) closeRentalModalBtn.addEventListener('click', closeRentalModal);
    if (closeRentalFooterBtn) closeRentalFooterBtn.addEventListener('click', closeRentalModal);

    if (rentalModal) {
        rentalModal.addEventListener('click', (e) => {
            if (e.target === rentalModal) closeRentalModal();
        });
    }

    /* ── 6. Global Keyboard Esc Listener for Modals ──────────────── */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (salesModal && salesModal.style.display === 'flex') {
                closeSalesModal();
            }
            if (rentalModal && rentalModal.style.display === 'flex') {
                closeRentalModal();
            }
        }
    });

});