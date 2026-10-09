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

                const overallIncome = rawSales + totalRentals + totalRefillIncome;
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

                // Sold Profit (Left Card) remains pure rawSales without freight deduction
                const valTotalSales = document.getElementById("val-total-sales");
                if (valTotalSales) {
                    if (rawSales >= 0) {
                        valTotalSales.innerText = "₱" + rawSales.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    } else {
                        valTotalSales.innerText = "−₱" + Math.abs(rawSales).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    }
                }

                // Net Profit Income (Right Card) has freight deducted
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

                const valSalesBreakdown = document.getElementById("val-sales-breakdown");
                if (valSalesBreakdown) {
                    const preFreightNetProfit = salesNet + freightExpense;
                    
                    const formattedPreFreight = "₱" + preFreightNetProfit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    const formattedFreight = "₱" + freightExpense.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
                    
                    valSalesBreakdown.innerText = `NPI: ${formattedPreFreight} | Frt: -${formattedFreight}`;
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
                    const salesCommission = salesNet * 0.50;
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

    /* ── 5. Refill Income Summary Modal Loader ──────────────────────── */
    const cardRefillIncome = document.getElementById('card-refill-income');
    const refillIncomeModal = document.getElementById('refillIncomeSummaryModal');
    const closeRefillModalBtn = document.getElementById('closeRefillModal');
    const closeRefillFooterBtn = document.getElementById('closeRefillModalFooter');
    const refillSummaryTbody = document.getElementById('refill-summary-tbody');
    const refillModalDateRange = document.getElementById('refill-modal-date-range');
    const refillModalCount = document.getElementById('refill-modal-count');

    const closeRefillIncomeModal = () => {
        if (refillIncomeModal) refillIncomeModal.style.display = 'none';
    };

    if (cardRefillIncome && refillIncomeModal) {
        cardRefillIncome.addEventListener('click', function() {
            refillIncomeModal.style.display = 'flex';

            const currentPeriod = filterPeriodSelect ? filterPeriodSelect.value : 'this_month';
            const startVal = startDateInput ? startDateInput.value : '';
            const endVal = endDateInput ? endDateInput.value : '';

            if (refillModalDateRange) {
                refillModalDateRange.innerText = `Period: ${currentPeriod.replace('_', ' ').toUpperCase()}`;
            }

            if (refillSummaryTbody) {
                refillSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #64748b;">Loading refill income data...</td></tr>`;
            }

            let fetchUrl = `/admin/dashboard/refill-transactions?period=${currentPeriod}`;
            if (currentPeriod === 'custom' && startVal && endVal) {
                fetchUrl += `&start_date=${startVal}&end_date=${endVal}`;
            }

            fetch(fetchUrl)
                .then(response => response.json())
                .then(data => {
                    const refills = data.refills || [];
                    if (refillModalCount) {
                        refillModalCount.textContent = `Showing ${refills.length} record${refills.length === 1 ? '' : 's'}`;
                    }

                    if (refills.length === 0) {
                        if (refillSummaryTbody) refillSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #64748b;">No refill transactions found for this period.</td></tr>`;
                        return;
                    }

                    let html = '';
                    refills.forEach(item => {
                        const productName = item.product_name || 'Oxygen Tank Refill';
                        const quantity = Number(item.quantity) || 0;
                        const totalIncome = Number(item.total_income) || 0;

                        html += `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px; font-weight: 500; color: #0f172a;">${productName}</td>
                                <td style="padding: 8px; text-align: center; color: #334155;">${quantity}</td>
                                <td style="padding: 8px; text-align: right; font-weight: 600; color: #7c3aed;">₱${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                            </tr>
                        `;
                    });
                    if (refillSummaryTbody) refillSummaryTbody.innerHTML = html;
                })
                .catch(error => {
                    console.error('Error fetching refill transactions:', error);
                    if (refillSummaryTbody) refillSummaryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #dc2626;">Failed to load refill transactions.</td></tr>`;
                });
        });
    }

    if (closeRefillModalBtn) closeRefillModalBtn.addEventListener('click', closeRefillIncomeModal);
    if (closeRefillFooterBtn) closeRefillFooterBtn.addEventListener('click', closeRefillIncomeModal);

    if (refillIncomeModal) {
        refillIncomeModal.addEventListener('click', function(e) {
            if (e.target === refillIncomeModal) closeRefillIncomeModal();
        });
    }

    /* ── 6.. Rental & Deposit Summary Modal Loader ──────────────── */
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

    /* ── 7. Active Rentals Summary Modal Loader ─────────────────── */
    const cardRentalsIncome = document.getElementById('card-rentals-income');
    const rentalsModal = document.getElementById('rentalsSummaryModal');
    const closeRentalsModalBtn = document.getElementById('closeRentalsModal');
    const closeRentalsFooterBtn = document.getElementById('closeRentalsModalFooter');
    const rentalsTbody = document.getElementById('rentals-summary-tbody');
    const rentalsModalDateRange = document.getElementById('rentals-modal-date-range');
    const rentalsModalCount = document.getElementById('rentals-modal-count');

    const closeRentalsModal = () => {
        if (rentalsModal) rentalsModal.style.display = 'none';
    };

    if (cardRentalsIncome && rentalsModal) {
        cardRentalsIncome.addEventListener('click', function() {
            rentalsModal.style.display = 'flex';

            const currentPeriod = filterPeriodSelect ? filterPeriodSelect.value : 'this_month';
            const startVal = startDateInput ? startDateInput.value : '';
            const endVal = endDateInput ? endDateInput.value : '';

            if (rentalsModalDateRange) {
                rentalsModalDateRange.innerText = `Period: ${currentPeriod.replace('_', ' ').toUpperCase()}`;
            }

            if (rentalsTbody) {
                rentalsTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #64748b;">Loading active rentals summary...</td></tr>`;
            }

            let fetchUrl = `/admin/dashboard/active-rentals-summary?period=${currentPeriod}`;
            if (currentPeriod === 'custom' && startVal && endVal) {
                fetchUrl += `&start_date=${startVal}&end_date=${endVal}`;
            }

            fetch(fetchUrl)
                .then(response => response.json())
                .then(data => {
                    const items = data.items || [];
                    if (rentalsModalCount) {
                        rentalsModalCount.textContent = `Showing ${items.length} product${items.length === 1 ? '' : 's'}`;
                    }

                    if (!data.success || items.length === 0) {
                        if (rentalsTbody) rentalsTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #64748b;">No rental records found for this period.</td></tr>`;
                        return;
                    }

                    let html = '';
                    items.forEach(item => {
                        html += `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px; font-weight: 500; color: #0f172a;">${item.product_name}</td>
                                <td style="padding: 8px; text-align: center; color: #334155;">${item.quantity_rented}</td>
                                <td style="padding: 8px; text-align: right; font-weight: 600; color: #059669;">₱${Number(item.rental_income || 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                            </tr>
                        `;
                    });
                    if (rentalsTbody) rentalsTbody.innerHTML = html;
                })
                .catch(error => {
                    console.error('Error fetching active rentals summary:', error);
                    if (rentalsTbody) rentalsTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #dc2626;">Failed to load active rentals summary.</td></tr>`;
                });
        });
    }

    if (closeRentalsModalBtn) closeRentalsModalBtn.addEventListener('click', closeRentalsModal);
    if (closeRentalsFooterBtn) closeRentalsFooterBtn.addEventListener('click', closeRentalsModal);

    if (rentalsModal) {
        rentalsModal.addEventListener('click', function(e) {
            if (e.target === rentalsModal) closeRentalsModal();
        });
    }

    /* ── 8. Total Expenses Summary Modal Loader ─────────────────── */
    const cardTotalExpenses = document.getElementById('card-total-expenses');
    const expensesModal = document.getElementById('expensesSummaryModal');
    const closeExpensesModalBtn = document.getElementById('closeExpensesModal');
    const closeExpensesFooterBtn = document.getElementById('closeExpensesModalFooter');
    const expensesTbody = document.getElementById('expenses-summary-tbody');
    const expensesModalDateRange = document.getElementById('expenses-modal-date-range');
    const expensesModalCount = document.getElementById('expenses-modal-count');

    const closeExpensesModal = () => {
        if (expensesModal) expensesModal.style.display = 'none';
    };

    if (cardTotalExpenses && expensesModal) {
        cardTotalExpenses.addEventListener('click', function() {
            expensesModal.style.display = 'flex';

            const currentPeriod = filterPeriodSelect ? filterPeriodSelect.value : 'this_month';
            const startVal = startDateInput ? startDateInput.value : '';
            const endVal = endDateInput ? endDateInput.value : '';

            if (expensesModalDateRange) {
                expensesModalDateRange.innerText = `Period: ${currentPeriod.replace('_', ' ').toUpperCase()}`;
            }

            if (expensesTbody) {
                expensesTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #64748b;">Loading expense transactions...</td></tr>`;
            }

            let fetchUrl = `/admin/dashboard/expense-transactions?period=${currentPeriod}`;
            if (currentPeriod === 'custom' && startVal && endVal) {
                fetchUrl += `&start_date=${startVal}&end_date=${endVal}`;
            }

            fetch(fetchUrl)
                .then(response => response.json())
                .then(data => {
                    const expenses = data.expenses || [];
                    if (expensesModalCount) {
                        expensesModalCount.textContent = `Showing ${expenses.length} record${expenses.length === 1 ? '' : 's'}`;
                    }

                    if (expenses.length === 0) {
                        if (expensesTbody) expensesTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #64748b;">No expense records found for this period.</td></tr>`;
                        return;
                    }

                    let html = '';
                    expenses.forEach(item => {
                        const description = item.description || item.title || item.category || 'General Expense';
                        const dateStr = item.date || item.created_at || '';
                        const amount = Number(item.amount) || 0;

                        html += `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px; font-weight: 500; color: #0f172a;">${description}</td>
                                <td style="padding: 8px; text-align: center; color: #64748b; font-size: 0.9rem;">${dateStr}</td>
                                <td style="padding: 8px; text-align: right; font-weight: 600; color: #dc2626;">₱${amount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                            </tr>
                        `;
                    });
                    if (expensesTbody) expensesTbody.innerHTML = html;
                })
                .catch(error => {
                    console.error('Error fetching expense transactions:', error);
                    if (expensesTbody) expensesTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 18px; color: #dc2626;">Failed to load expense transactions.</td></tr>`;
                });
        });
    }

    if (closeExpensesModalBtn) closeExpensesModalBtn.addEventListener('click', closeExpensesModal);
    if (closeExpensesFooterBtn) closeExpensesFooterBtn.addEventListener('click', closeExpensesModal);

    if (expensesModal) {
        expensesModal.addEventListener('click', function(e) {
            if (e.target === expensesModal) closeExpensesModal();
        });
    }

    /* ── Total Freight Expense Summary Modal Loader ─────────────────── */
    const cardTotalFreight = document.getElementById('card-total-freight');
    const freightModal = document.getElementById('freightSummaryModal');
    const closeFreightModalBtn = document.getElementById('closeFreightModal');
    const closeFreightFooterBtn = document.getElementById('closeFreightModalFooter');
    const freightTbody = document.getElementById('freight-summary-tbody');
    const freightModalDateRange = document.getElementById('freight-modal-date-range');
    const freightModalCount = document.getElementById('freight-modal-count');

    const closeFreightModal = () => {
        if (freightModal) freightModal.style.display = 'none';
    };

    if (cardTotalFreight && freightModal) {
        cardTotalFreight.addEventListener('click', function() {
            freightModal.style.display = 'flex';

            const currentPeriod = filterPeriodSelect ? filterPeriodSelect.value : 'this_month';
            const startVal = startDateInput ? startDateInput.value : '';
            const endVal = endDateInput ? endDateInput.value : '';

            if (freightModalDateRange) {
                freightModalDateRange.innerText = `Period: ${currentPeriod.replace('_', ' ').toUpperCase()}`;
            }

            if (freightTbody) {
                freightTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 18px; color: #64748b;">Loading freight expenses...</td></tr>`;
            }

            let fetchUrl = `/admin/dashboard/freight-transactions?period=${currentPeriod}`;
            if (currentPeriod === 'custom' && startVal && endVal) {
                fetchUrl += `&start_date=${startVal}&end_date=${endVal}`;
            }

            fetch(fetchUrl)
                .then(response => response.json())
                .then(data => {
                    const freights = data.expenses || [];
                    if (freightModalCount) {
                        freightModalCount.textContent = `Showing ${freights.length} record${freights.length === 1 ? '' : 's'}`;
                    }

                    if (freights.length === 0) {
                        if (freightTbody) {
                            freightTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 18px; color: #64748b;">No freight expense records found for this period.</td></tr>`;
                        }
                        return;
                    }

                    let html = '';
                    freights.forEach(item => {
                        const dateStr = item.date || '';
                        const title = item.expense_title || 'Freight Expense';
                        const notes = item.description || '—';
                        const amount = Number(item.amount) || 0;

                        html += `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px; color: #64748b; font-size: 0.9rem;">${dateStr}</td>
                                <td style="padding: 8px; font-weight: 500; color: #0f172a;">${title}</td>
                                <td style="padding: 8px; color: #475569;">${notes}</td>
                                <td style="padding: 8px; text-align: right; font-weight: 600; color: #9333ea;">₱${amount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                            </tr>
                        `;
                    });
                    if (freightTbody) freightTbody.innerHTML = html;
                })
                .catch(error => {
                    console.error('Error fetching freight expenses:', error);
                    if (freightTbody) {
                        freightTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 18px; color: #dc2626;">Failed to load freight expenses.</td></tr>`;
                    }
                });
        });
    }

    if (closeFreightModalBtn) closeFreightModalBtn.addEventListener('click', closeFreightModal);
    if (closeFreightFooterBtn) closeFreightFooterBtn.addEventListener('click', closeFreightModal);

    if (freightModal) {
        freightModal.addEventListener('click', function(e) {
            if (e.target === freightModal) closeFreightModal();
        });
    }

    /* ── 10. Global Keyboard Esc Listener for Modals ──────────────── */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (salesModal && salesModal.style.display === 'flex') {
                closeSalesModal();
            }
            if (rentalModal && rentalModal.style.display === 'flex') {
                closeRentalModal();
            }
            if (rentalsModal && rentalsModal.style.display === 'flex') {
                closeRentalsModal();
            }
            if (expensesModal && expensesModal.style.display === 'flex') {
                closeExpensesModal();
            }
            if (refillModal && refillModal.style.display === 'flex') {
                closeRefillModal(); }
        }
    });

    document.getElementById('depositSearchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const tbody = document.getElementById('deposit-summary-tbody');
        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            if (row.cells.length < 3) return;

            const customerName = row.cells[0].textContent.toLowerCase();
            const productName = row.cells[1].textContent.toLowerCase();

            if (customerName.includes(searchTerm) || productName.includes(searchTerm)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        document.getElementById('deposit-modal-count').textContent = `Showing ${visibleCount} records`;
    });

});