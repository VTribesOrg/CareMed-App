/*============= START OF PAGINATION =============*/
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. CORE LOGIC: Update URL based on UI State ---
    const updateFilters = () => {
        const searchVal = document.getElementById('table-search')?.value.trim();
        const limitVal = document.getElementById('row-limit-select')?.value;
        // Added these two lines to capture the filter values
        const typeVal = document.getElementById('type-filter')?.value;
        const fulfillmentVal = document.getElementById('fulfillment-filter')?.value;

        const urlParams = new URLSearchParams();
        
        if (searchVal) urlParams.set('q', searchVal);
        if (limitVal) urlParams.set('limit', limitVal);
        // Added these to append the filters to the URL
        if (typeVal) urlParams.set('type', typeVal);
        if (fulfillmentVal) urlParams.set('fulfillment', fulfillmentVal);
        
        // Reset to page 1 on any filter change
        urlParams.set('page', 1);

        window.location.href = window.location.pathname + '?' + urlParams.toString();
    };

    // --- 2. SEARCH: Debounced Input ---
    const searchInput = document.getElementById('table-search');
    let searchTimer;
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            clearTimeout(searchTimer);
            if (e.key === 'Enter') {
                updateFilters();
            } else {
                searchTimer = setTimeout(updateFilters, 800);
            }
        });
    }

    // --- 3. DROPDOWNS: Change Listeners ---
    const limitSelect = document.getElementById('row-limit-select');
    if (limitSelect) limitSelect.addEventListener('change', updateFilters);
    
    // Added listeners for the Type and Fulfillment filters
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) typeFilter.addEventListener('change', updateFilters);
    
    const fulfillmentFilter = document.getElementById('fulfillment-filter');
    if (fulfillmentFilter) fulfillmentFilter.addEventListener('change', updateFilters);

    // --- 4. CLEAR BUTTON: Click Listener ---
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            window.location.href = window.location.pathname;
        });
    }

    // --- 5. JUMP TO PAGE: Logic & Listeners ---
    const jumpBtn = document.querySelector('.jump-btn');
    const jumpInput = document.getElementById('jump-page-input');

    const handleJump = () => {
        const page = parseInt(jumpInput.value);
        const maxPage = parseInt(jumpInput.getAttribute('max'));
        
        if (page >= 1 && page <= maxPage) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', page);
            window.location.href = window.location.pathname + '?' + urlParams.toString();
        } else {
            jumpInput.style.borderColor = "#ef4444";
            setTimeout(() => jumpInput.style.borderColor = "#cbd5e1", 2000);
        }
    };

    if (jumpBtn) jumpBtn.addEventListener('click', handleJump);
    if (jumpInput) {
        jumpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleJump();
        });
    }
});

/*============= END OF PAGINATION =============*/

/*============= START OF TRANSACTION MODAL =============*/

document.addEventListener('DOMContentLoaded', () => {

    // 1. Elements
    const openBtn = document.getElementById('open-txn-selection');
    const closeBtn = document.getElementById('close-selection-modal');
    const selectionModal = document.getElementById('txnSelectionModal');

    // ===============================
    // OPEN MODAL
    // ===============================
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (selectionModal) {
                selectionModal.classList.remove('hidden');
            }
        });
    }

    // ===============================
    // CLOSE MODAL
    // ===============================
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (selectionModal) {
                selectionModal.classList.add('hidden');
            }
        });
    }

    // ===============================
    // TRANSACTION TYPE HANDLING
    // ===============================
    document.querySelectorAll('[data-flow]').forEach(button => {
        button.addEventListener('click', function (e) {

            // 🔥 PREVENT DOUBLE TRIGGER
            if (this.dataset.clicked === "1") return;
            this.dataset.clicked = "1";

            setTimeout(() => {
                this.dataset.clicked = "0";
            }, 300);

            const flowType = this.getAttribute('data-flow');

            // CLOSE TRANSACTION SELECTION MODAL
            if (selectionModal) {
                selectionModal.classList.add('hidden');
            }

            // ===============================
            // R E N T A L
            // ===============================
            if (flowType === 'Rental') {
                const rentModal = document.getElementById('rentAssetModal');
                if (rentModal) {
                    rentModal.classList.remove('hidden');
                }
            }

            // ===============================
            // R E F I L L 
            // ===============================
            else if (flowType === 'Refill') {
                const refillModal = document.getElementById('refillAssetModal');
                if (refillModal) {
                    // Clear previous entries out cleanly before showing
                    const serialInput = document.getElementById('refill-serial-number');
                    if (serialInput) serialInput.value = "";
                    
                    refillModal.classList.remove('hidden');
                }
            }

            // ===============================
            // P U R C H A S E (S A L E)
            // ===============================
            else if (flowType === 'Sale') {
                const purchaseModal = document.getElementById('purchaseAssetModal');
                if (purchaseModal) {
                    purchaseModal.classList.remove('hidden');
                }
            }

            // ===============================
            // P R I M E G A S
            // ===============================
            else if (flowType === 'Primegas') {
                // Adjust ID to match your secondary target modal setup if named differently
                const primegasModal = document.getElementById('primegasAssetModal');
                if (primegasModal) {
                    primegasModal.classList.remove('hidden');
                }
            }
        });
    });

    // ========================================================
    // SECURE CSP CLOSE LISTENERS & FORM RESET FOR REFILL MODAL
    // ========================================================
    document.addEventListener('click', function (event) {
        const targetBtn = event.target.closest('#close-refill-modal, #cancel-refill-modal');
        if (targetBtn) {
            const refillModal = document.getElementById('refillAssetModal');
            if (refillModal) {
                // 1. Close the modal layout
                refillModal.classList.add('hidden');
                
                // 2. Safely find and reset all form inputs to default values
                const refillForm = document.getElementById('refill-transaction-form');
                if (refillForm) {
                    refillForm.reset();
                }
            }
        }
    });
});

/*============= END OF TRANSACTION MODAL =============*/


/*============= PURCHASE SUBMISSION LOGIC =============*/

document.addEventListener('DOMContentLoaded', function() {
    const purchaseForm = document.getElementById('purchaseEntryForm');
    const purchaseModal = document.getElementById('purchaseAssetModal'); 

    // Array storage tracking multi-product data in the selection basket
    let purchaseBasket = [];

    /*============= CUSTOMER SELECTION & CLASSIFICATION LOGIC =============*/
    const radioRegistered = document.getElementById('buyer-type-registered');
    const radioUnregistered = document.getElementById('buyer-type-unregistered'); // Matches HTML id
    const registeredBuyerGroup = document.getElementById('registered-buyer-group');
    const unregisteredBuyerGroup = document.getElementById('unregistered-buyer-group'); // Matches HTML id

    const customerSearchInput = document.getElementById('purchase-customer-search'); // Matches HTML id
    const customerDropdownList = document.getElementById('purchase-customer-dropdown-list');
    const selectedCustomerId = document.getElementById('purchase-customer-id');
    const customNameInput = document.getElementById('purchase-custom-name'); // Matches HTML id

    const bannerName = document.getElementById('purchase-banner-buyer-name');
    const badge = document.getElementById('purchase-customer-type-display');

    // Dynamic visibility toggling for Client Classification Track
    function handleBuyerTypeChange() {
        if (radioRegistered && radioRegistered.checked) {
            if (registeredBuyerGroup) registeredBuyerGroup.style.display = 'block';
            if (unregisteredBuyerGroup) unregisteredBuyerGroup.style.display = 'none';
            if (customNameInput) customNameInput.value = '';
            bannerName.textContent = customerSearchInput.value.trim() || "Enter Buyer Information";
            badge.textContent = "New Transaction";
        } else if (radioUnregistered && radioUnregistered.checked) {
            if (unregisteredBuyerGroup) unregisteredBuyerGroup.style.display = 'block';
            if (registeredBuyerGroup) registeredBuyerGroup.style.display = 'none';
            if (selectedCustomerId) selectedCustomerId.value = '';
            if (customerSearchInput) customerSearchInput.value = '';
            bannerName.textContent = customNameInput.value.trim() || "Walk-In Customer";
            badge.textContent = "Unregistered";
        }
    }

    radioRegistered?.addEventListener('change', handleBuyerTypeChange);
    radioUnregistered?.addEventListener('change', handleBuyerTypeChange);

    // Update banner display in real-time when typing a custom walk-in name
    customNameInput?.addEventListener('input', function() {
        if (bannerName) {
            bannerName.textContent = this.value.trim() || "Walk-In Customer";
        }
    });

    // Open dropdown container on focus or explicit click interaction
    const showCustomerDropdown = () => {
        customerDropdownList?.classList.remove('hidden');
        filterRegisteredCustomers();
    };
    customerSearchInput?.addEventListener('focus', showCustomerDropdown);
    customerSearchInput?.addEventListener('click', showCustomerDropdown);

    // Reset hidden ID on manual input typing to prevent mismatched submission data
    customerSearchInput?.addEventListener('input', () => {
        if (selectedCustomerId) {
            selectedCustomerId.value = '';
        }
        if (bannerName) {
            bannerName.textContent = customerSearchInput.value.trim() || "Enter Buyer Information";
        }
        filterRegisteredCustomers();
    });

    function filterRegisteredCustomers() {
        if (!customerSearchInput) return;
        const query = customerSearchInput.value.toLowerCase().trim();
        const options = document.querySelectorAll('.purchase-customer-option-item');
        let hasMatches = false;

        options.forEach(option => {
            const searchStr = (option.getAttribute('data-search-string') || '').toLowerCase();
            if (searchStr.includes(query)) {
                option.style.display = 'flex';
                hasMatches = true;
            } else {
                option.style.display = 'none';
            }
        });

        const noMatchDiv = document.getElementById('no-purchase-customer-match');
        if (noMatchDiv) {
            noMatchDiv.style.display = hasMatches ? 'none' : 'block';
        }
    }

    // Target customer selection assignment on dropdown list item click
    document.addEventListener('click', function(e) {
        const optionItem = e.target.closest('.purchase-customer-option-item');
        if (optionItem) {
            const id = optionItem.getAttribute('data-id');
            const name = optionItem.getAttribute('data-name');
            
            if (selectedCustomerId) selectedCustomerId.value = id;
            if (customerSearchInput) customerSearchInput.value = name;
            if (bannerName) bannerName.textContent = name;
            if (badge) badge.textContent = 'Registered Customer';
            
            customerDropdownList?.classList.add('hidden');
        }
    });

    /*============= HELPER CALCULATIONS UTILITIES =============*/
    function cleanFloat(val) {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        const cleaned = val.toString().replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    function cleanInt(val) {
        if (typeof val === 'number') return isNaN(val) ? 0 : Math.floor(val);
        if (!val) return 0;
        const cleaned = val.toString().replace(/[^0-9-]/g, '');
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    /*============= DYNAMIC FORM VISIBILITY FIELD HANDLING =============*/
    purchaseForm?.addEventListener('change', function(e) {
        if (e.target.name === 'fulfillment_type') {
            const isDelivery = e.target.value === 'Delivery';
            togglePurchaseDelivery(isDelivery);
        }
        if (e.target.id === 'purchase-payment-method') {
            updatePurchaseRefVisibility();
        }
    });

    function togglePurchaseDelivery(isDelivery) {
        const deliveryFields = document.getElementById('purchase-delivery-fields');
        if (deliveryFields) {
            deliveryFields.style.display = isDelivery ? 'grid' : 'none';
            const addrInput = deliveryFields.querySelector('input[name="delivery_address"]');
            if (addrInput) addrInput.required = isDelivery;
        }
    }

    function updatePurchaseRefVisibility() {
        const purchasePaymentMethod = document.getElementById('purchase-payment-method');
        const purchaseRefGroup = document.getElementById('purchase-ref-group');
        if (purchasePaymentMethod && purchaseRefGroup) {
            const isElectronic = purchasePaymentMethod.value !== 'Cash';
            purchaseRefGroup.style.display = isElectronic ? 'block' : 'none';
            
            if (!isElectronic) {
                const refInput = purchaseRefGroup.querySelector('input');
                if (refInput) refInput.value = '';
            }
        }
    }

    /*============= LIVE BASKET MULTI-PRODUCT LOGIC =============*/
    const purchaseSearchInput = document.getElementById('purchase-product-search-input');
    const purchaseDropdownList = document.getElementById('purchase-product-dropdown-list');
    const purchaseBasketContainer = document.getElementById('purchase-selected-products-container');
    const purchaseEmptyPlaceholder = document.getElementById('purchase-empty-basket-placeholder');

    const showProductDropdown = () => {
        purchaseDropdownList?.classList.remove('hidden');
        filterPurchaseProducts();
    };
    purchaseSearchInput?.addEventListener('focus', showProductDropdown);
    purchaseSearchInput?.addEventListener('click', showProductDropdown);

    // Close search dropdown lists safely when clicking outside boundaries
    document.addEventListener('click', function(e) {
        if (purchaseSearchInput && purchaseDropdownList && !purchaseSearchInput.contains(e.target) && !purchaseDropdownList.contains(e.target)) {
            purchaseDropdownList.classList.add('hidden');
        }
        if (customerSearchInput && customerDropdownList && !customerSearchInput.contains(e.target) && !customerDropdownList.contains(e.target)) {
            customerDropdownList.classList.add('hidden');
        }
    });

    purchaseSearchInput?.addEventListener('input', filterPurchaseProducts);

    function filterPurchaseProducts() {
        if (!purchaseSearchInput) return;
        const query = purchaseSearchInput.value.toLowerCase().trim();
        const options = document.querySelectorAll('.purchase-product-option-item');
        let hasMatches = false;

        options.forEach(option => {
            const searchStr = (option.getAttribute('data-search-string') || '').toLowerCase();
            if (searchStr.includes(query)) {
                option.style.display = 'flex';
                hasMatches = true;
            } else {
                option.style.display = 'none';
            }
        });

        const noMatchDiv = document.getElementById('no-purchase-product-match');
        if (noMatchDiv) {
            noMatchDiv.style.display = hasMatches ? 'none' : 'block';
        }
    }

    // Add item option to basket selection container
    document.addEventListener('click', function(e) {
        const optionItem = e.target.closest('.purchase-product-option-item');
        if (optionItem) {
            const id = optionItem.getAttribute('data-id');
            const name = optionItem.getAttribute('data-name');
            const maxStock = cleanInt(optionItem.getAttribute('data-stock'));
            const price = cleanFloat(optionItem.getAttribute('data-price'));

            const existingItem = purchaseBasket.find(i => i.id === id);
            if (existingItem) {
                if (existingItem.quantity < maxStock) {
                    existingItem.quantity += 1;
                } else {
                    alert(`Cannot exceed maximum available stock layout limit (${maxStock}) for this item.`);
                }
            } else {
                purchaseBasket.push({ id, name, maxStock, price, quantity: 1 });
            }

            if (purchaseSearchInput) purchaseSearchInput.value = '';
            purchaseDropdownList?.classList.add('hidden');
            renderPurchaseBasketUI();
        }
    });

    function renderPurchaseBasketUI() {
        if (!purchaseBasketContainer) return;

        const rows = purchaseBasketContainer.querySelectorAll('.basket-item-row');
        rows.forEach(r => r.remove());

        if (purchaseBasket.length === 0) {
            purchaseEmptyPlaceholder?.classList.remove('hidden');
        } else {
            purchaseEmptyPlaceholder?.classList.add('hidden');

            purchaseBasket.forEach((item, index) => {
                const itemRow = document.createElement('div');
                itemRow.className = 'basket-item-row';
                itemRow.style = 'display: flex; align-items: center; justify-content: space-between; gap: 12px; background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px;';
                itemRow.innerHTML = `
                    <div style="flex: 1;">
                        <strong style="font-size: 13px; color: #1e293b; display:block;">${item.name}</strong>
                        <span style="font-size: 11px; color: #64748b;">₱${item.price.toFixed(2)} each</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <label style="font-size: 11px; color: #64748b;">Qty:</label>
                        <input type="number" class="clinical-input basket-qty-input" data-index="${index}" min="1" max="${item.maxStock}" value="${item.quantity}" style="width: 65px; height: 32px; padding: 0 6px; text-align: center;">
                    </div>
                    <button type="button" class="remove-basket-item-btn" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; display: flex; align-items: center;">
                        <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                    </button>
                `;
                purchaseBasketContainer.appendChild(itemRow);
            });
        }
        updatePurchaseBillingSummary();
    }

    purchaseBasketContainer?.addEventListener('input', function(e) {
        if (e.target.classList.contains('basket-qty-input')) {
            const idx = cleanInt(e.target.getAttribute('data-index'));
            let val = cleanInt(e.target.value) || 1;
            const maxLimit = purchaseBasket[idx].maxStock;

            if (val > maxLimit) {
                alert(`Only ${maxLimit} items available in storage inventory logs.`);
                val = maxLimit;
                e.target.value = val;
            } else if (val < 1) {
                val = 1;
                e.target.value = val;
            }
            purchaseBasket[idx].quantity = val;
            updatePurchaseBillingSummary();
        }
    });

    purchaseBasketContainer?.addEventListener('click', function(e) {
        const deleteBtn = e.target.closest('.remove-basket-item-btn');
        if (deleteBtn) {
            const idx = cleanInt(deleteBtn.getAttribute('data-index'));
            purchaseBasket.splice(idx, 1);
            renderPurchaseBasketUI();
        }
    });

    /*============= FINANCIAL AND CALCULATIONS LOGIC =============*/
    const amountPaidInput = document.getElementById('purchase-amount-paid');
    amountPaidInput?.addEventListener('input', updatePurchaseBillingSummary);

    function updatePurchaseBillingSummary() {
        const countText = document.getElementById('purchase-items-count-text');
        const grossBillDisplay = document.getElementById('purchase-gross-bill');
        const summaryPaidDisplay = document.getElementById('purchase-summary-paid-val');
        const totalDisplay = document.getElementById('purchase-total-display');
        const breakdownContainer = document.getElementById('purchase-summary-items-breakdown');

        let totalItemsCount = 0;
        let grossTotalContract = 0;

        if (breakdownContainer) breakdownContainer.innerHTML = '';

        purchaseBasket.forEach(item => {
            const itemQty = cleanInt(item.quantity) || 1;
            const itemPrice = cleanFloat(item.price) || 0;
            const itemTotalCost = itemPrice * itemQty;

            totalItemsCount += itemQty;
            grossTotalContract += itemTotalCost;

            if (breakdownContainer) {
                const breakdownRow = document.createElement('div');
                breakdownRow.style = 'display: flex; justify-content: space-between; font-size: 12px; color: #64748b;';
                breakdownRow.innerHTML = `
                    <span>• ${item.name} <small>(${itemQty} × ₱${itemPrice.toLocaleString('en-US', {minimumFractionDigits: 2})})</small></span>
                    <span>₱${itemTotalCost.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                `;
                breakdownContainer.appendChild(breakdownRow);
            }
        });

        if (countText) countText.innerText = `${totalItemsCount} Item(s) Selected`;
        if (grossBillDisplay) grossBillDisplay.innerText = `₱${grossTotalContract.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        let amountPaid = cleanFloat(amountPaidInput?.value);
        
        if (amountPaidInput && (amountPaidInput.value === "0.00" || amountPaidInput.value === "" || amountPaidInput.dataset.autoFilled === "true")) {
            amountPaid = grossTotalContract;
            amountPaidInput.value = grossTotalContract.toFixed(2);
            amountPaidInput.dataset.autoFilled = "true";
        }

        if (summaryPaidDisplay) summaryPaidDisplay.innerText = `- ₱${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const remainingBalance = Math.max(0, grossTotalContract - amountPaid);
        const balanceSubText = document.getElementById('purchase-balance-label');
        
        if (totalDisplay) {
            totalDisplay.innerText = `₱${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            if (remainingBalance <= 0 && grossTotalContract > 0) {
                totalDisplay.className = "total-amount-display status-paid";
                if (balanceSubText) {
                    balanceSubText.textContent = "Fully Settled";
                    balanceSubText.className = "status-paid";
                }
            } else if (amountPaid > 0) {
                totalDisplay.className = "total-amount-display status-pending";
                if (balanceSubText) {
                    balanceSubText.textContent = "Partial Balance Due";
                    balanceSubText.className = "status-pending";
                }
            } else {
                totalDisplay.className = "total-amount-display";
                if (balanceSubText) {
                    balanceSubText.textContent = "Remaining collectibles";
                    balanceSubText.className = "";
                }
            }
        }
    }

    amountPaidInput?.addEventListener('keydown', function() {
        this.dataset.autoFilled = "false";
    });

    /*============= MODAL RESET PROCEDURES =============*/
    function resetPurchaseModal() {
        purchaseBasket = [];
        if (purchaseForm) {
            purchaseForm.reset();
            togglePurchaseDelivery(false);
            updatePurchaseRefVisibility();
            if (radioRegistered) {
                radioRegistered.checked = true;
                handleBuyerTypeChange();
            }
        }
        if (amountPaidInput) amountPaidInput.dataset.autoFilled = "true";
        renderPurchaseBasketUI();
    }

    /*============= FORM SUBMISSION VERIFICATION PROCESS =============*/
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const formData = new FormData(this);

            if (purchaseBasket.length === 0) {
                alert("Error: Please select at least one component or product item to purchase.");
                return;
            }

            const buyerTypeEle = this.querySelector('input[name="buyer_type"]:checked');
            const buyerType = buyerTypeEle ? buyerTypeEle.value : 'registered';
            
            let customerIdPayload = null;
            let customerNamePayload = null;

            if (buyerType === 'registered') {
                const customerId = document.getElementById('purchase-customer-id')?.value;
                const customerName = customerSearchInput?.value?.trim();
                
                if (!customerId || !customerName) {
                    alert("Please search and select the name of the customer from the options list.");
                    return;
                }
                customerIdPayload = /^\d+$/.test(customerId) ? parseInt(customerId, 10) : customerId;
                customerNamePayload = customerName;
            } else {
                const walkInName = customNameInput?.value?.trim(); // Fixed lookup pointer variable link
                if (!walkInName) {
                    alert("Please enter the name of the customer.");
                    return;
                }
                customerNamePayload = walkInName;
            }

            const amountPaid = cleanFloat(document.getElementById('purchase-amount-paid')?.value);

            const payload = {
                buyer_type: buyerType,
                customer_id: customerIdPayload,
                customer_name: customerNamePayload,
                items: purchaseBasket.map(i => ({ 
                    id: /^\d+$/.test(i.id) ? parseInt(i.id, 10) : i.id, 
                    quantity: cleanInt(i.quantity), 
                    price: cleanFloat(i.price) 
                })),
                payment_method: formData.get('payment_method'),
                amount_paid: amountPaid,
                reference_number: formData.get('reference_number') || "",
                fulfillment_type: formData.get('fulfillment_type'),
                delivery_address: formData.get('delivery_address') || "",
                landmark: formData.get('landmark') || "",
                warranty_or_notes: formData.get('warranty_or_notes')?.trim() || ""
            };

            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Transaction...";

            fetch(this.getAttribute('action') || '/admin/process-purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.getElementById('purchase_csrf_token')?.value || ''
                },
                body: JSON.stringify(payload)
            })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Server error occurred during execution structural processing");
                return data;
            })
            .then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert(data.message);
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Complete Purchase";
                }
            })
            .catch(error => {
                alert(error.message || "A transaction execution system error occurred.");
                submitBtn.disabled = false;
                submitBtn.innerText = "Complete Purchase";
            });
        });
    }

    /*============= CLOSING EVENT ACTION HANDLERS =============*/
    document.addEventListener('click', function(e) {
        if (e.target.closest('.close-purchase-modal') || e.target === purchaseModal) {
            purchaseModal?.classList.add('hidden');
            resetPurchaseModal();
        }
    });
});


/*============= START OF RENTMODAL MULTI-PRODUCT SYSTEM =============*/

const rentModal = document.getElementById('rentAssetModal');
const rentBtns = document.querySelectorAll('.asset-action-btn.rent');
const rentPaymentMethod = document.getElementById('rent-payment-method');
const rentRefGroup = document.getElementById('rent-ref-group');

const productSearchInput = document.getElementById('product-search-input');
const productDropdownList = document.getElementById('product-dropdown-list');
const selectedProductsContainer = document.getElementById('selected-products-container');
const emptyBasketPlaceholder = document.getElementById('empty-basket-placeholder');

// RENT MODAL INLINE CUSTOMER SELECTION ELEMENTS
const rentCustomerInput = document.getElementById('rent-customer-search-input');
const rentCustomerDropdown = document.getElementById('rent-customer-dropdown-list');
const rentCustomerIdInput = document.getElementById('global-customer-id');
const rentPatientDisplayName = document.getElementById('rent-patient-display-name');

// Memory state cache keeping track of active selected basket items
let productBasket = [];

/**
 * Handles showing/hiding the reference field based on payment method
 */
function updateRentRefVisibility() {
    if (rentPaymentMethod && rentRefGroup) {
        const isElectronic = rentPaymentMethod.value !== 'Cash';
        rentRefGroup.style.display = isElectronic ? 'block' : 'none';
        
        if (!isElectronic) {
            const refInput = rentRefGroup.querySelector('input');
            if (refInput) refInput.value = '';
        }
    }
}

/**
 * Handles toggling delivery fields and fees for the Rent Modal
 */
function toggleRentDelivery(isDelivery) {
    const deliveryFields = document.getElementById('rent-delivery-fields');
    const deliveryFeeInput = document.getElementById('rent-delivery-fee');
    
    if (deliveryFields) {
        deliveryFields.style.display = isDelivery ? 'grid' : 'none';
        const addrInput = deliveryFields.querySelector('input[name="delivery_address"]');
        if (addrInput) addrInput.required = isDelivery;
    }
    
    // Reset delivery fee dynamically if changing fulfillment back to Walk-In
    if (!isDelivery && deliveryFeeInput) {
        deliveryFeeInput.value = '0.00';
    }
    
    // Recalculate totals to account for added/removed delivery fees
    calculateRentalTotals();
}

/**
 * Resets the Global Customer Selection state
 */
function resetGlobalCustomerSelection() {
    if (rentCustomerInput) rentCustomerInput.value = '';
    if (rentCustomerIdInput) rentCustomerIdInput.value = '';
    if (rentPatientDisplayName) rentPatientDisplayName.textContent = 'No Patient Selected';
    
    if (rentCustomerDropdown) {
        rentCustomerDropdown.classList.add('hidden');
        const items = rentCustomerDropdown.querySelectorAll('.customer-option-item');
        items.forEach(item => item.style.display = 'flex');
        
        const noMatch = document.getElementById('no-customer-match');
        if (noMatch) noMatch.style.display = 'none';
    }
}

/**
 * Resets the Rent Modal state
 */
function resetRentModal() {
    const form = document.getElementById('rentEntryForm');
    if (form) {
        form.reset();
        toggleRentDelivery(false); 
        updateRentRefVisibility();
    }
    
    // Default duration setup
    const durationInput = document.getElementById('rent-duration-months');
    if (durationInput) durationInput.value = 1;

    // Set default start date to today
    const startInput = document.getElementById('rent-start-date');
    if (startInput) {
        const today = new Date().toISOString().split('T')[0];
        startInput.value = today;
    }
    
    // Reset Delivery Fee to default value
    const deliveryFeeInput = document.getElementById('rent-delivery-fee');
    if (deliveryFeeInput) deliveryFeeInput.value = '0.00';
    
    // Reset Oxygen tracking field element states
    const serialGroup = document.getElementById('rent-serial-number-group');
    const serialInput = document.getElementById('rent-asset-serial');
    if (serialGroup) serialGroup.style.display = 'none';
    if (serialInput) {
        serialInput.value = '';
        serialInput.required = false;
    }

    productBasket = [];
    renderProductBasket();
    if (productSearchInput) productSearchInput.value = '';
    
    resetGlobalCustomerSelection();
    calculateRentalTotals();
}

/**
 * Renders the visible items added into the customer's equipment basket
 */
function renderProductBasket() {
    if (!selectedProductsContainer) return;

    selectedProductsContainer.innerHTML = '';
    
    if (productBasket.length === 0) {
        if (emptyBasketPlaceholder) selectedProductsContainer.appendChild(emptyBasketPlaceholder);
        
        // Hide serial number fields when there are no items left in the basket
        const serialGroup = document.getElementById('rent-serial-number-group');
        const serialInput = document.getElementById('rent-asset-serial');
        if (serialGroup) serialGroup.style.display = 'none';
        if (serialInput) {
            serialInput.value = '';
            serialInput.required = false;
        }

        calculateRentalTotals();
        return;
    }

    // Dynamic state trackers for oxygen criteria matching
    let containsOxygenEquipment = false;

    productBasket.forEach((item) => {
        // Evaluate product titles for oxygen components
        const itemNameLower = item.name.toLowerCase();
        if (itemNameLower.includes('oxygen') || itemNameLower.includes('o2') || itemNameLower.includes('concentrator')) {
            containsOxygenEquipment = true;
        }

        const row = document.createElement('div');
        row.className = 'selected-product-row';
        row.style = 'display: flex; align-items: center; justify-content: space-between; background: white; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);';
        
        // FIXED: Switched from tracking array index loops to explicit product database IDs
        row.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <span style="font-weight: 600; font-size: 13px; color: #1e293b;">${item.name}</span>
                <span style="font-size: 11px; color: #64748b;">₱${parseFloat(item.rentPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}/month</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <input type="hidden" name="product_id[]" value="${item.id}">
                <input type="hidden" name="unit_price[]" value="${item.rentPrice}">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <label style="font-size: 11px; color: #64748b;">Qty:</label>
                    <input type="number" name="quantity[]" class="clinical-input basket-qty-input" 
                           value="${item.quantity}" min="1" max="${item.maxStock}" 
                           data-product-id="${item.id}" 
                           style="width: 60px; height: 32px; padding: 0 6px; font-size: 13px; text-align: center;">
                </div>
                <button type="button" class="btn-remove-basket-item" data-product-id="${item.id}" 
                        style="background: none; border: none; color: #ef4444; cursor: pointer; display: flex; align-items: center; padding: 4px;">
                    <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                </button>
            </div>
        `;
        selectedProductsContainer.appendChild(row);
    });

    // Handle oxygen asset serial form validation and visibility toggles
    const serialGroup = document.getElementById('rent-serial-number-group');
    const serialInput = document.getElementById('rent-asset-serial');
    if (serialGroup && serialInput) {
        if (containsOxygenEquipment) {
            serialGroup.style.display = 'block';
            serialInput.required = true;
        } else {
            serialGroup.style.display = 'none';
            serialInput.required = false;
            serialInput.value = '';
        }
    }

    calculateRentalTotals();
}

/**
 * Processes parameter matches dynamically to compute billing abstracts and forward return date calculations
 */
function calculateRentalTotals() {
    const startInput = document.getElementById('rent-start-date');
    const durationInput = document.getElementById('rent-duration-months');
    const hiddenReturnInput = document.getElementById('rent-return-date');
    const previewReturnText = document.getElementById('rent-return-date-preview');
    const cashInput = document.getElementById('rent-amount-paid');
    const deliveryFeeInput = document.getElementById('rent-delivery-fee');
    const breakdownContainer = document.getElementById('rent-summary-items-breakdown');

    const amountPaid = cashInput ? (parseFloat(cashInput.value) || 0) : 0;
    const deliveryFee = deliveryFeeInput ? (parseFloat(deliveryFeeInput.value) || 0) : 0;
    
    let months = durationInput ? (parseInt(durationInput.value) || 1) : 1;
    if (months < 1) months = 1;

    // DYNAMIC DATE CALCULATION LOGIC
    if (startInput && startInput.value) {
        const start = new Date(startInput.value);
        
        if (!isNaN(start.getTime())) {
            const targetReturnDate = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
            
            const yyyy = targetReturnDate.getFullYear();
            const mm = String(targetReturnDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetReturnDate.getDate()).padStart(2, '0');
            const formattedISODate = `${yyyy}-${mm}-${dd}`;
            
            if (hiddenReturnInput) hiddenReturnInput.value = formattedISODate;
            
            if (previewReturnText) {
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                previewReturnText.textContent = targetReturnDate.toLocaleDateString('en-US', options);
            }
        }
    } else {
        if (previewReturnText) previewReturnText.textContent = "--";
        if (hiddenReturnInput) hiddenReturnInput.value = "";
    }

    let totalMonthlyRate = 0;
    let totalItemsCount = 0;

    // Clear previous dynamic item rows in summary
    if (breakdownContainer) breakdownContainer.innerHTML = '';

    productBasket.forEach(item => {
        const itemQty = parseInt(item.quantity) || 1;
        const itemPrice = parseFloat(item.rentPrice) || 0;
        
        // Calculate total amount for this specific product across all months
        const itemTotalCost = itemPrice * itemQty * months;

        totalMonthlyRate += itemPrice * itemQty;
        totalItemsCount += itemQty;

        // Append line-item calculation to summary preview panel
        if (breakdownContainer) {
            const breakdownRow = document.createElement('div');
            breakdownRow.style = 'display: flex; justify-content: space-between; font-size: 12px; color: #64748b;';
            breakdownRow.innerHTML = `
                <span>• ${item.name} <small>(${itemQty} × ₱${itemPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}/mo)</small></span>
                <span>₱${itemTotalCost.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            `;
            breakdownContainer.appendChild(breakdownRow);
        }
    });

    // Append a delivery fee line-item if delivery is active
    if (deliveryFee > 0 && breakdownContainer) {
        const deliveryRow = document.createElement('div');
        deliveryRow.style = 'display: flex; justify-content: space-between; font-size: 12px; color: #0284c7; font-weight: 500;';
        deliveryRow.innerHTML = `
            <span>• Delivery Service Fee</span>
            <span>₱${deliveryFee.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        `;
        breakdownContainer.appendChild(deliveryRow);
    }

    // Multiply item rate by months, then apply flat delivery fee addition
    const totalContract = (totalMonthlyRate * months) + deliveryFee;
    const balance = totalContract - amountPaid;

    // ============== UI EXPANSIONS ==============

    const durationText = document.getElementById('rent-duration-text');
    if (durationText) {
        durationText.textContent = `${totalItemsCount} Item${totalItemsCount !== 1 ? 's' : ''} × ${months} Month${months !== 1 ? 's' : ''}`;
    }

    const totalBillText = document.getElementById('rent-total-bill');
    if (totalBillText) {
        totalBillText.textContent = `₱${totalContract.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    const summaryPaidValText = document.getElementById('summary-paid-val');
    if (summaryPaidValText) {
        summaryPaidValText.textContent = `- ₱${amountPaid.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    const totalDisplay = document.getElementById('rent-total-display');
    const balanceSubText = document.getElementById('balance-label');

    if (totalDisplay) {
        totalDisplay.textContent = `₱${Math.max(balance, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        if (balance <= 0 && totalContract > 0) {
            totalDisplay.className = "total-amount-display status-paid";
            if (balanceSubText) {
                balanceSubText.textContent = "Fully Settled";
                balanceSubText.className = "status-paid";
            }
        } else if (amountPaid > 0) {
            totalDisplay.className = "total-amount-display status-pending";
            if (balanceSubText) {
                balanceSubText.textContent = "Partial Balance";
                balanceSubText.className = "status-pending";
            }
        } else {
            totalDisplay.className = "total-amount-display";
            if (balanceSubText) {
                balanceSubText.textContent = "Future monthly dues";
                balanceSubText.className = "";
            }
        }
    }
}

// INLINE CUSTOMER SEARCH LOGIC & INTERACTION
if (rentCustomerInput && rentCustomerDropdown) {
    rentCustomerInput.addEventListener('focus', () => {
        rentCustomerDropdown.classList.remove('hidden');
    });

    rentCustomerInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = rentCustomerDropdown.querySelectorAll('.customer-option-item');
        let hasMatch = false;

        items.forEach(item => {
            const searchString = item.getAttribute('data-search-string') || '';
            if (searchString.includes(query)) {
                item.style.display = 'flex';
                hasMatch = true;
            } else {
                item.style.display = 'none';
            }
        });

        const noMatch = document.getElementById('no-customer-match');
        if (noMatch) {
            noMatch.style.display = hasMatch || query === '' ? 'none' : 'block';
        }
    });

    rentCustomerDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.customer-option-item');
        if (!item) return;

        const id = item.getAttribute('data-id');
        const name = item.getAttribute('data-name') || item.querySelector('.cust-name-text')?.innerText.trim() || '';

        if (rentCustomerIdInput) rentCustomerIdInput.value = id;
        if (rentPatientDisplayName) rentPatientDisplayName.innerText = name;
        if (rentCustomerInput) rentCustomerInput.value = name;

        rentCustomerDropdown.classList.add('hidden');
    });
}

// FIXED: SAFELY DELEGATE PRODUCT REMOVAL USING ID COMPLIANCE AND STOP PROPAGATION BLOCKS
if (selectedProductsContainer) {
    selectedProductsContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.btn-remove-basket-item');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Halts any secondary duplicate listener threads completely

            const prodId = removeBtn.getAttribute('data-product-id');
            
            // Re-assign the array without the targeted item ID (Idempotent execution)
            productBasket = productBasket.filter(item => item.id !== prodId);
            
            renderProductBasket();
        }
    });
}

rentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        resetRentModal();
        const row = btn.closest('tr');
        if (!row) return;

        const equipmentName = row.cells[1]?.innerText || "Unknown Item";
        const equipmentId = btn.getAttribute('data-product-id') || row.cells[0]?.innerText || "N/A";
        const rentPrice = btn.getAttribute('data-rent-price') || "0.00";
        const stockCount = parseInt(btn.getAttribute('data-stock')) || 1;

        productBasket.push({
            id: equipmentId,
            name: equipmentName,
            rentPrice: rentPrice,
            maxStock: stockCount,
            quantity: 1
        });

        renderProductBasket();
        rentModal.classList.remove('hidden');
    });
});

// CLOSE MODAL EVENTS AND EXTERNAL CONTAINER BOUNDARY WATCHERS
document.addEventListener('click', (e) => {
    if (rentCustomerDropdown && !e.target.closest('.customer-search-container')) {
        rentCustomerDropdown.classList.add('hidden');
    }

    if (e.target.classList.contains('close-rent-modal') || e.target.classList.contains('medical-modal-overlay')) {
        if (rentModal && !rentModal.classList.contains('hidden')) {
            rentModal.classList.add('hidden');
            resetRentModal();
        }
    }
});

const rentForm = document.getElementById('rentEntryForm');
if (rentForm) {
    rentForm.addEventListener('change', (e) => {
        if (e.target.name === 'fulfillment_type') {
            toggleRentDelivery(e.target.value === 'Delivery');
        }
        if (e.target.id === 'rent-payment-method') {
            updateRentRefVisibility();
        }
    });

    // FIXED: Target updates via product-id attributes instead of mutable index numbers
    rentForm.addEventListener('input', (e) => {
        if (e.target.classList.contains('basket-qty-input')) {
            const prodId = e.target.getAttribute('data-product-id');
            let value = parseInt(e.target.value) || 1;
            const max = parseInt(e.target.max) || 999;
            
            if (value > max) value = max;
            if (value < 1) value = 1;
            
            e.target.value = value;
            
            const basketItem = productBasket.find(item => item.id === prodId);
            if (basketItem) {
                basketItem.quantity = value;
            }
        }
        
        calculateRentalTotals();
    });
}
/*============= END OF RENTMODAL MULTI-PRODUCT SYSTEM =============*/

/*============= START OF TRANSACTION MODAL CUSTOMER LOGIC =============*/

document.addEventListener('DOMContentLoaded', function() {
    updateRentRefVisibility();

    // Bind explicit change/input change triggers specifically tracking months input modifications
    const durationMonthsInput = document.getElementById('rent-duration-months');
    const rentStartDateInput = document.getElementById('rent-start-date');

    if (durationMonthsInput) {
        durationMonthsInput.addEventListener('input', calculateRentalTotals);
        durationMonthsInput.addEventListener('change', calculateRentalTotals);
    }
    if (rentStartDateInput) {
        rentStartDateInput.addEventListener('change', calculateRentalTotals);
    }

    const txnCustomerSearchInput = document.querySelector('#txnSelectionModal #customer-search-input');
    const txnCustomerDropdownList = document.querySelector('#txnSelectionModal #customer-dropdown-list');
    const txnGlobalCustomerIdInput = document.querySelector('#txnSelectionModal #global-customer-id');

    if (txnCustomerSearchInput && txnCustomerDropdownList) {
        txnCustomerSearchInput.addEventListener('focus', function() {
            txnCustomerDropdownList.classList.remove('hidden');
        });

        txnCustomerSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            const options = txnCustomerDropdownList.querySelectorAll('.customer-option-item');
            let hasMatches = false;

            options.forEach(item => {
                const searchString = item.getAttribute('data-search-string') || '';
                if (searchString.includes(query)) {
                    item.style.display = 'flex';
                    hasMatches = true;
                } else {
                    item.style.display = 'none';
                }
            });

            const noMatchDiv = document.getElementById('no-customer-match');
            if (noMatchDiv) {
                noMatchDiv.style.display = hasMatches || query === '' ? 'none' : 'block';
            }
        });

        txnCustomerDropdownList.addEventListener('click', function(e) {
            const optionItem = e.target.closest('.customer-option-item');
            if (optionItem) {
                const customerId = optionItem.getAttribute('data-id');
                const customerName = optionItem.querySelector('.cust-name-text').textContent.trim();

                if (txnGlobalCustomerIdInput) txnGlobalCustomerIdInput.value = customerId;
                txnCustomerSearchInput.value = customerName;

                txnCustomerDropdownList.classList.add('hidden');
            }
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('#txnSelectionModal .customer-search-container')) {
                txnCustomerDropdownList.classList.add('hidden');
            }
        });
    }

    if (typeof productSearchInput !== "undefined" && typeof productDropdownList !== "undefined" && productSearchInput && productDropdownList) {
        productSearchInput.addEventListener('focus', () => productDropdownList.classList.remove('hidden'));

        productSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            const options = productDropdownList.querySelectorAll('.product-option-item');
            let hasMatches = false;

            options.forEach(item => {
                const searchString = item.getAttribute('data-search-string') || '';
                if (searchString.includes(query)) {
                    item.style.display = 'flex';
                    hasMatches = true;
                } else {
                    item.style.display = 'none';
                }
            });

            const noMatchDiv = document.getElementById('no-product-match');
            if (noMatchDiv) {
                noMatchDiv.style.display = hasMatches || query === '' ? 'none' : 'block';
            }
        });

        productDropdownList.addEventListener('click', function(e) {
            const optionItem = e.target.closest('.product-option-item');
            if (optionItem) {
                const id = optionItem.getAttribute('data-id');
                const name = optionItem.getAttribute('data-name');
                const rentPrice = optionItem.getAttribute('data-rent');
                const maxStock = parseInt(optionItem.getAttribute('data-stock')) || 0;

                if (maxStock <= 0) {
                    alert("This medical asset is currently out of stock.");
                    return;
                }

                const existingItem = productBasket.find(item => item.id === id);
                if (existingItem) {
                    if (existingItem.quantity < maxStock) {
                        existingItem.quantity += 1;
                    } else {
                        alert(`Cannot add more. Only ${maxStock} unit(s) available in current inventory.`);
                    }
                } else {
                    productBasket.push({ id, name, rentPrice, maxStock, quantity: 1 });
                }

                productSearchInput.value = '';
                productDropdownList.classList.add('hidden');
                renderProductBasket();
            }
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.product-search-container')) {
                productDropdownList.classList.add('hidden');
            }
        });
    }

    if (typeof selectedProductsContainer !== "undefined" && selectedProductsContainer) {
        selectedProductsContainer.addEventListener('click', function(e) {
            const removeBtn = e.target.closest('.btn-remove-basket-item');
            if (removeBtn) {
                const index = removeBtn.getAttribute('data-index');
                productBasket.splice(index, 1);
                renderProductBasket();
            }
        });
    }

    const purchaseModal = document.getElementById('purchaseAssetModal');
    if (purchaseModal) {
        purchaseModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-purchase-modal') || 
                e.target.classList.contains('medical-modal-overlay')) {
                purchaseModal.classList.add('hidden');
                
                const purchaseForm = document.getElementById('purchaseEntryForm');
                if (purchaseForm) purchaseForm.reset();
                
                const purchasePatientDisplayName = document.getElementById('purchase-patient-display-name');
                if (purchasePatientDisplayName) purchasePatientDisplayName.textContent = "No Patient Selected";
                
                resetGlobalCustomerSelection();
            }
        });
    }

    const equipmentSelect = document.getElementById('global-equipment-select');

    document.querySelectorAll('.type-choice-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const flow = this.getAttribute('data-flow');
            

            if (flow === 'Refill') {
                document.getElementById('txnSelectionModal').classList.add('hidden');
                
                const refillModal = document.getElementById('refillAssetModal');
                if (refillModal) {
                    refillModal.classList.remove('hidden');
                }

                return; 
            }

            let productId = "";
            let name = "--";
            let stock = 0;
            let rentPrice = "0.00";
            let salePrice = "0.00";

            if (equipmentSelect) {
                const selectedOption = equipmentSelect.options[equipmentSelect.selectedIndex];
                if (!selectedOption || !selectedOption.value) {
                    alert("Please select equipment first.");
                    return;
                }
                productId = selectedOption.value;
                name = selectedOption.getAttribute('data-name');
                stock = parseInt(selectedOption.getAttribute('data-stock')) || 0;
                rentPrice = selectedOption.getAttribute('data-rent');
                salePrice = selectedOption.getAttribute('data-price');
            } else {
                const fallbackIdInput = document.getElementById('rent-product-id') || document.getElementById('purchase-product-id');
                productId = fallbackIdInput ? fallbackIdInput.value : "";
                name = document.getElementById('rent-equipment-name')?.innerText || "--";
            }

            const activeCustomerId = txnGlobalCustomerIdInput ? txnGlobalCustomerIdInput.value : "";
            const activeCustomerName = txnCustomerSearchInput ? txnCustomerSearchInput.value : "";
            
            // This validation check remains strictly for Rental & Purchase
            if (!activeCustomerId) {
                return;
            }

            document.getElementById('txnSelectionModal').classList.add('hidden');

            if (flow === 'Rental') {
                resetRentModal();
                
                const rentFormGlobalCustomerId = document.querySelector('#rentAssetModal #global-customer-id');
                const rentPatientDisplayName = document.getElementById('rent-patient-display-name');

                if (rentFormGlobalCustomerId) rentFormGlobalCustomerId.value = activeCustomerId;
                if (rentPatientDisplayName) rentPatientDisplayName.textContent = activeCustomerName;

                if (productId) {
                    productBasket.push({
                        id: productId,
                        name: name,
                        rentPrice: rentPrice,
                        maxStock: stock,
                        quantity: 1
                    });
                    renderProductBasket();
                }

                document.getElementById('rentAssetModal').classList.remove('hidden');
                calculateRentalTotals();
            } else {
                // This acts as your fallback choice block for "Sale" / Purchase
                const purchaseFormGlobalCustomerId = document.getElementById('global-purchase-customer-id');
                const purchasePatientDisplayName = document.getElementById('purchase-patient-display-name');

                if (purchaseFormGlobalCustomerId) purchaseFormGlobalCustomerId.value = activeCustomerId;
                if (purchasePatientDisplayName) purchasePatientDisplayName.textContent = activeCustomerName;

                activePurchaseProductId = productId; 

                const purchaseHiddenInput = document.getElementById('purchase-product-id');
                if (purchaseHiddenInput) purchaseHiddenInput.value = productId;

                const qtyInput = document.getElementById('purchase-qty');
                if (qtyInput) {
                    qtyInput.max = stock; 
                    qtyInput.value = stock > 0 ? 1 : 0; 
                }
                
                if (document.getElementById('purchase-equipment-name')) document.getElementById('purchase-equipment-name').innerText = name;
                if (document.getElementById('purchase-stock-display')) document.getElementById('purchase-stock-display').innerText = `${stock} Units Available`;
                if (document.getElementById('purchase-unit-price')) document.getElementById('purchase-unit-price').value = salePrice;
                
                if (typeof updatePurchaseTotal === "function") {
                    updatePurchaseTotal();
                }
                
                document.getElementById('purchaseAssetModal').classList.remove('hidden');
            }
        });
    });
});
/*============= END OF TRANSACTION MODAL CUSTOMER LOGIC =============*/


/*============= START OF REFERENCE NO. LOGIC =============*/

document.addEventListener('DOMContentLoaded', function() {
    const copyButtons = document.querySelectorAll('.btn-copy-hint');

    copyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.ref-id-input');
            
            if (input) {
                input.select();
                input.setSelectionRange(0, 99999); // Mobile compatibility

                navigator.clipboard.writeText(input.value).then(() => {
                    const icon = this.querySelector('i');
                    const originalIcon = icon ? icon.innerText : 'content_copy';
                    
                    if (icon) icon.innerText = 'check';
                    this.style.color = '#22c55e'; // Success green
                    
                    setTimeout(() => {
                        if (icon) icon.innerText = originalIcon;
                        this.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        });
    });
});
/*============= END OF REFERENCE NO. LOGIC =============*/

/*=================================== START OF PRIMEGAS ===================================*/

// 1. Open Modal
document.querySelector('.type-choice-btn.primegas').addEventListener('click', () => {
    document.getElementById('txnSelectionModal').classList.add('hidden');
    document.getElementById('primegasModal').classList.remove('hidden');
});

// 2. Update Max Limit dynamically
document.getElementById('primegasProductSelect').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const maxStock = selectedOption.getAttribute('data-max') || 0;
    
    document.getElementById('maxEmptyStock').textContent = maxStock;
    
    const qtyInput = document.getElementById('primegasQty');
    qtyInput.max = maxStock;
    
    // Optional: Reset value if it's too high for the new selection
    if (parseInt(qtyInput.value) > parseInt(maxStock)) {
        qtyInput.value = maxStock;
    }
});

// 3. Close Modal
const closePrimegas = () => {
    document.getElementById('primegasModal').classList.add('hidden');
};
document.getElementById('close-primegas-modal').addEventListener('click', closePrimegas);
document.getElementById('close-primegas-modal-btn').addEventListener('click', closePrimegas);

/*=================================== END OF PRIMEGAS ===================================*/

/*=================================== START OF ADD PAYMENT MODAL ===================================*/

document.addEventListener('DOMContentLoaded', function() {
    const paymentModal = document.getElementById('addPaymentModal');
    const paymentForm = document.getElementById('payment-form');
    const postBtn = document.getElementById('submit-payment');
    
    // UI Elements inside Modal
    const txnIdInput = document.getElementById('payment-txn-id');
    const summaryRef = document.getElementById('summary-ref');
    const summaryType = document.getElementById('summary-type');
    const summaryBalance = document.getElementById('summary-balance');
    const amountInput = document.getElementById('payment-amount');
    const amountError = document.getElementById('amount-error');
    const rentalQuickPay = document.getElementById('rental-quick-pay');
    const quickPayContainer = document.getElementById('quick-pay-button-container'); // Ensure this ID is in your HTML
    
    // Method/Ref Elements
    const paymentMethodSelect = document.getElementById('payment-method');
    const refGroup = document.getElementById('pm-ref-group');
    const refLabel = document.getElementById('pm-ref-label');
    const refInput = document.getElementById('payment-reference');

    let currentMonthlyRate = 0;
    let currentBalance = 0;
    let currentType = 'Rental';

    // 1. OPEN MODAL & DYNAMICALLY GENERATE BUTTONS
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-add-payment');
        if (!btn) return;

        e.preventDefault();

        // Extract Data
        const txnId = btn.getAttribute('data-txn-id');
        const refNo = btn.getAttribute('data-ref');
        currentType = btn.getAttribute('data-type') || 'Rental';
        currentBalance = parseFloat(btn.getAttribute('data-balance') || 0);
        currentMonthlyRate = parseFloat(btn.getAttribute('data-monthly-rate') || 0);
        const unpaidMonths = parseInt(btn.getAttribute('data-unpaid-count') || 1);

        // Populate Fields
        txnIdInput.value = txnId;
        summaryRef.innerText = refNo || 'N/A';
        summaryType.innerText = currentType;
        summaryBalance.innerText = `₱${currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        amountInput.value = currentBalance.toFixed(2);
        
        amountError.style.display = 'none';

        // 2. DYNAMIC QUICK PAY GENERATION
        if (currentType === 'Rental' && unpaidMonths > 1) {
            rentalQuickPay.style.display = 'block';
            quickPayContainer.innerHTML = ''; // Clear old buttons

            for (let i = 1; i <= unpaidMonths; i++) {
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'btn-month-pill';
                pill.innerText = `${i}${i === 1 ? 'mo' : 'mos'}`;
                
                pill.onclick = function() {
                    const total = (currentMonthlyRate * i).toFixed(2);
                    amountInput.value = total;
                    
                    // Toggle active class
                    document.querySelectorAll('.btn-month-pill').forEach(b => b.classList.remove('active'));
                    pill.classList.add('active');
                };
                quickPayContainer.appendChild(pill);
            }
            amountInput.placeholder = `Monthly Rate: ₱${currentMonthlyRate.toFixed(2)}`;
        } else {
            rentalQuickPay.style.display = 'none';
        }

        paymentModal.classList.remove('hidden');
    });

    // 3. PAYMENT METHOD LOGIC
    paymentMethodSelect.addEventListener('change', function() {
        const isCash = this.value === 'Cash';
        refGroup.style.display = isCash ? 'none' : 'block';
        refInput.required = !isCash;
        
        if (!isCash) {
            refLabel.innerText = (this.value === 'Check') ? "Check Number" : "Reference Number";
            refInput.placeholder = (this.value === 'Check') ? "Enter check #" : "Enter reference ID";
        }
    });

    // 4. VALIDATION & SUBMIT
    paymentForm.addEventListener('submit', function(e) {
        const amount = parseFloat(amountInput.value);

        if (isNaN(amount) || amount <= 0) {
            e.preventDefault();
            alert("Please enter a valid payment amount.");
            return;
        }

        postBtn.disabled = true;
        postBtn.innerHTML = `<span class="material-symbols-rounded">sync</span> Processing...`;
    });

    // 5. MODAL CLOSE LOGIC
    const closeModal = () => {
        paymentModal.classList.add('hidden');
        paymentForm.reset();
        refGroup.style.display = 'none';
        if(quickPayContainer) quickPayContainer.innerHTML = ''; 
    };

    document.querySelectorAll('#close-payment-modal, #cancel-payment').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) closeModal();
    });
});

/*=================================== END OF ADD PAYMENT MODAL ===================================*/

document.addEventListener('DOMContentLoaded', function() {
    // ==========================================
    // 1. TABLE FILTERING & ROUTING CONTROLS
    // ==========================================
    const tableSearch = document.getElementById('table-search');
    const typeFilter = document.getElementById('type-filter');
    const fulfillmentFilter = document.getElementById('fulfillment-filter');
    const statusFilter = document.getElementById('status-filter');
    const rowLimitSelect = document.getElementById('row-limit-select');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    // Consolidated filter applier pulling all structural settings parameters together
    function applyFilters() {
        const searchVal = tableSearch ? tableSearch.value.trim() : '';
        const typeVal = typeFilter ? typeFilter.value : '';
        const fulfillmentVal = fulfillmentFilter ? fulfillmentFilter.value : '';
        const statusVal = statusFilter ? statusFilter.value : '';
        const limitVal = rowLimitSelect ? rowLimitSelect.value : '10';

        // Construct cleaner search parameters targeting dashboard endpoints
        const urlParams = new URLSearchParams();
        if (searchVal) urlParams.set('q', searchVal);
        if (typeVal) urlParams.set('type', typeVal);
        if (fulfillmentVal) urlParams.set('fulfillment', fulfillmentVal);
        if (statusVal) urlParams.set('status', statusVal);
        if (limitVal !== '10') urlParams.set('limit', limitVal);

        window.location.href = window.location.pathname + '?' + urlParams.toString();
    }

    // Trigger state configurations on active select transitions
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (fulfillmentFilter) fulfillmentFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (rowLimitSelect) rowLimitSelect.addEventListener('change', applyFilters);

    // Search query input box listeners with key down debounce triggers
    if (tableSearch) {
        tableSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }

    // Clear and Reset all filters back to defaults
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            window.location.href = window.location.pathname;
        });
    }

    // Safe Global Pagination Jumper
    window.jumpToPage = function() {
        const jumpInput = document.getElementById('jump-page-input');
        if (!jumpInput) return;

        const targetPage = parseInt(jumpInput.value, 10);
        const maxPage = parseInt(jumpInput.getAttribute('max'), 10);

        if (targetPage >= 1 && targetPage <= maxPage) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', targetPage);
            window.location.href = window.location.pathname + '?' + urlParams.toString();
        } else {
            alert(`Please enter a valid page number between 1 and ${maxPage}.`);
        }
    };


    // ==========================================
    // 2. MODAL CLIENT / PATIENT LOOKUP CONTROLS
    // ==========================================
    const searchInput = document.getElementById('customer-search-input');
    const dropdownList = document.getElementById('customer-dropdown-list');
    const hiddenInput = document.getElementById('global-customer-id');
    const optionItems = document.querySelectorAll('.customer-option-item');
    const noMatchItem = document.getElementById('no-customer-match');

    if (!searchInput || !dropdownList) return;

    // Show selection dropdown window pane when input context gains active focus
    searchInput.addEventListener('focus', () => {
        dropdownList.classList.remove('hidden');
    });

    // Hide selection dropdown safely when clicking outside modal selection targets
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.customer-search-container')) {
            dropdownList.classList.add('hidden');
        }
    });

    // Filter list item cards dynamically match text strings typed inside search box field
    searchInput.addEventListener('input', function() {
        const value = this.value.toLowerCase().trim();
        let visibleCount = 0;

        optionItems.forEach(item => {
            const matchString = item.getAttribute('data-search-string') || '';
            if (matchString.includes(value)) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // Toggle visibility state for clear missing indicator fallback alerts
        if (noMatchItem) {
            if (visibleCount === 0) {
                noMatchItem.style.display = 'block';
            } else {
                noMatchItem.style.display = 'none';
            }
        }
    });

    // Intercept target click updates to dynamically bind records onto input state fields
    optionItems.forEach(item => {
        item.addEventListener('click', function() {
            const selectedId = this.getAttribute('data-id');
            const nameEl = this.querySelector('.cust-name-text');
            const selectedName = nameEl ? nameEl.textContent.trim() : '';

            if (hiddenInput) hiddenInput.value = selectedId;
            searchInput.value = selectedName; // Fill box with customer's formatted real name
            
            dropdownList.classList.add('hidden');
            
            // Highlight list selection styles natively inside interactive dashboard card components
            optionItems.forEach(el => el.style.backgroundColor = 'transparent');
            this.style.backgroundColor = '#f0fdf4'; // Light accent background tint indicator
        });
    });
});


document.addEventListener("DOMContentLoaded", function() {
    const dropdownBtn = document.getElementById("customDropdownBtn");
    const dropdownMenu = document.getElementById("customDropdownMenu");

    // Click to toggle dropdown
    dropdownBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        dropdownMenu.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function(event) {
        if (!document.getElementById("customActionDropdown").contains(event.target)) {
            dropdownMenu.classList.remove("show");
        }
    });
});

/*============= AUTO-OPEN MODAL FROM URL PARAM =============*/
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const openParam = urlParams.get('open');

    if (openParam === 'sale') {
        const purchaseModal = document.getElementById('purchaseAssetModal');
        if (purchaseModal) {
            purchaseModal.classList.remove('hidden');
        }
    } else if (openParam === 'rental') {
        const rentModal = document.getElementById('rentAssetModal');
        if (rentModal) {
            resetRentModal();
            rentModal.classList.remove('hidden');
        }
    }

    // Clean the URL so refreshing doesn't re-open the modal
    if (openParam) {
        const cleanUrl = window.location.pathname + 
            (window.location.search.replace(/[?&]open=[^&]*/g, '').replace(/^&/, '?') || '');
        window.history.replaceState({}, '', cleanUrl);
    }
});
/*============= END OF AUTO-OPEN MODAL FROM URL PARAM =============*/