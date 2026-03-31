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
    const equipmentSelect = document.getElementById('global-equipment-select');

    // --- NEW: Visual Validation for Selection ---
    if (equipmentSelect) {
        equipmentSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const stock = parseInt(selectedOption.getAttribute('data-stock') || 0);

            if (stock <= 0) {
                // Flash red if out of stock
                this.style.borderColor = '#ef4444';
                this.style.color = '#ef4444';
            } else {
                // Reset to standard medical blue/dark text if okay
                this.style.borderColor = '#3b82f6';
                this.style.color = '#1e293b';
            }
        });
    }

    // 2. Open Selection Modal
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            selectionModal.classList.remove('hidden');
        });
    }

    // 3. Close Selection Modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            selectionModal.classList.add('hidden');
        });
    }

    // 4. Handle Transaction Type Selection (Rental vs Sale)
    document.querySelectorAll('[data-flow]').forEach(button => {
        button.addEventListener('click', function() {
            const flowType = this.getAttribute('data-flow');
            const selectedOption = equipmentSelect.options[equipmentSelect.selectedIndex];

            // Validation: Ensure an item is picked
            if (!selectedOption || !selectedOption.value) {
                alert("Please select an equipment item first.");
                return;
            }

            // Pull data from the <option> attributes (matching your Product model columns)
            const name = selectedOption.getAttribute('data-name');
            const stock = selectedOption.getAttribute('data-stock');
            const price = selectedOption.getAttribute('data-price');
            const rent = selectedOption.getAttribute('data-rent');

            // Prevent proceeding if stock is 0
            if (parseInt(stock) <= 0) {
                alert("This item is currently out of stock.");
                return;
            }

            // Close the selection modal
            selectionModal.classList.add('hidden');

            // Open and populate the specific Process Modals
            if (flowType === 'Rental') {
                document.getElementById('rent-equipment-name').innerText = name;
                document.getElementById('rent-stock-display').innerText = `${stock} Units Available`;
                document.getElementById('rent-rate-display').value = rent;
                document.getElementById('rentAssetModal').classList.remove('hidden');
            } else {
                document.getElementById('purchase-equipment-name').innerText = name;
                document.getElementById('purchase-stock-display').innerText = `${stock} Units Available`;
                document.getElementById('purchase-unit-price').value = price;
                document.getElementById('purchaseAssetModal').classList.remove('hidden');
            }
        });
    });
});

/*============= END OF TRANSACTION MODAL =============*/



/*============= PURCHASE SUBMISSION LOGIC =============*/

const purchaseForm = document.getElementById('purchaseEntryForm');
const purchaseModal = document.getElementById('purchaseAssetModal'); 
let activePurchaseProductId = null;

/**
 * Handles toggling delivery fields without using onclick in HTML
 */
purchaseForm?.addEventListener('change', function(e) {
    if (e.target.name === 'fulfillment_type') {
        const isDelivery = e.target.value === 'Delivery';
        togglePurchaseDelivery(isDelivery);
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
/**
 * Updates the Grand Total and auto-fills the Amount Paid
 */
function updatePurchaseTotal() {
    const qtyInput = document.getElementById('purchase-qty');
    const priceInput = document.getElementById('purchase-unit-price');
    const amountPaidInput = document.getElementById('purchase-amount-paid');
    const totalDisplay = document.getElementById('purchase-total-display');

    if (qtyInput && priceInput && totalDisplay) {
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const total = qty * price;
        
        totalDisplay.innerText = `₱${total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

        // Auto-fill Amount Paid to match the total by default
        if (amountPaidInput) {
            amountPaidInput.value = total.toFixed(2);
        }
    }
}

/**
 * Clears form data and resets UI states
 */
function resetPurchaseModal() {
    activePurchaseProductId = null;
    if (purchaseForm) {
        purchaseForm.reset();
        togglePurchaseDelivery(false); // Hide delivery fields by default
    }
    const display = document.getElementById('purchase-total-display');
    if (display) display.innerText = "₱0.00";
}

/**
 * Global click listener to open modal and populate data
 */
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.asset-action-btn.purchase');
    if (btn) {
        resetPurchaseModal(); 
        
        activePurchaseProductId = btn.getAttribute('data-id'); 
        const stockValue = parseInt(btn.getAttribute('data-stock')) || 0;
        
        const stockBadge = document.getElementById('purchase-stock-badge');
        const stockDisplay = document.getElementById('purchase-stock-display');
        const qtyInput = document.getElementById('purchase-qty');

        if (stockDisplay) {
            stockDisplay.innerText = `${stockValue} Units Available`;
        }

        if (stockBadge) {
            stockBadge.classList.remove('status-in-stock', 'status-low-stock', 'status-out-of-stock');
            if (stockValue <= 0) {
                stockBadge.classList.add('status-out-of-stock');
            } else if (stockValue < 5) {
                stockBadge.classList.add('status-low-stock');
            } else {
                stockBadge.classList.add('status-in-stock');
            }
        }

        if (qtyInput) {
            qtyInput.max = stockValue; // Set HTML constraint
            qtyInput.value = stockValue > 0 ? 1 : 0;
        }

        const nameLabel = document.getElementById('purchase-equipment-name');
        const unitPriceInput = document.getElementById('purchase-unit-price');

        if (nameLabel) nameLabel.innerText = btn.getAttribute('data-name');
        if (unitPriceInput) unitPriceInput.value = btn.getAttribute('data-price');
        
        updatePurchaseTotal();
        purchaseModal?.classList.remove('hidden');
    }
});

// Real-time calculation listeners
document.getElementById('purchase-qty')?.addEventListener('input', updatePurchaseTotal);
document.getElementById('purchase-unit-price')?.addEventListener('input', updatePurchaseTotal);

/**
 * Form Submission Logic
 */
if (purchaseForm) {
    purchaseForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        const formData = new FormData(this);

        // 1. Validation: Product Selection
        if (!activePurchaseProductId) {
            alert("Error: No product selected.");
            return;
        }

        // 2. Validation: Stock Check
        const qtyToPurchase = parseInt(formData.get('quantity'));
        const qtyInput = document.getElementById('purchase-qty');
        const maxAvailable = parseInt(qtyInput?.max) || 0;

        if (qtyToPurchase > maxAvailable) {
            alert(`Insufficient Stock! Only ${maxAvailable} units available.`);
            return;
        }

        // 3. Validation: Customer Selection
        if (!formData.get('customer_id')) {
            alert("Please select a valid buyer/customer.");
            return;
        }

        const payload = {
            product_id: activePurchaseProductId,
            customer_id: formData.get('customer_id'),
            quantity: qtyToPurchase,
            unit_price: parseFloat(formData.get('unit_price')),
            amount_paid: parseFloat(formData.get('amount_paid')),
            payment_method: formData.get('payment_method'),
            payment_ref: formData.get('reference_number'),
            fulfillment_type: formData.get('fulfillment_type'),
            delivery_address: formData.get('delivery_address') || "",
            landmark: formData.get('landmark') || "",
            warranty_or_notes: formData.get('warranty_or_notes').trim()
        };

        // UI: Loading State
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing Transaction...";

        fetch('/admin/process-purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('input[name="csrf_token"]')?.value || ''
            },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Server error occurred");
            return data;
        })
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            showToast("A system error occurred.", "error");
        });

        if (e.target.name === 'fulfillment_type') {
            const isDelivery = e.target.value === 'Delivery';
            togglePurchaseDelivery(isDelivery);
        }
        
        // ADD THIS: Payment Method Logic
        if (e.target.id === 'purchase-payment-method') {
            updatePurchaseRefVisibility();
        }
    });
}

/**
 * Modal Close Handling
 */
document.addEventListener('click', function(e) {
    if (e.target.closest('.close-purchase-modal') || e.target === purchaseModal) {
        purchaseModal?.classList.add('hidden');
        resetPurchaseModal();
    }
});

const purchasePaymentMethod = document.getElementById('purchase-payment-method');
const purchaseRefGroup = document.getElementById('purchase-ref-group');

/**
 * Handles showing/hiding the reference field for Purchase
 */
function updatePurchaseRefVisibility() {
    if (purchasePaymentMethod && purchaseRefGroup) {
        // Show for GCash and Bank Transfer, Hide for Cash
        const isElectronic = purchasePaymentMethod.value !== 'Cash';
        purchaseRefGroup.style.display = isElectronic ? 'block' : 'none';
        
        if (!isElectronic) {
            const refInput = purchaseRefGroup.querySelector('input');
            if (refInput) refInput.value = '';
        }
    }
}


/*============= END OF PURCHASE SUBMISSION LOGIC =============*/

/*============= START OF RENTMODAL =============*/

const rentModal = document.getElementById('rentAssetModal');
const rentBtns = document.querySelectorAll('.asset-action-btn.rent');
const rentPaymentMethod = document.getElementById('rent-payment-method');
const rentRefGroup = document.getElementById('rent-ref-group');

/**
 * Handles showing/hiding the reference field based on method
 */
function updateRentRefVisibility() {
    if (rentPaymentMethod && rentRefGroup) {
        // Show for everything EXCEPT Cash
        const isElectronic = rentPaymentMethod.value !== 'Cash';
        rentRefGroup.style.display = isElectronic ? 'block' : 'none';
        
        // Optional: Clear the input if hidden so old data isn't submitted
        if (!isElectronic) {
            const refInput = rentRefGroup.querySelector('input');
            if (refInput) refInput.value = '';
        }
    }
}

/**
 * Handles toggling delivery fields for the Rent Modal
 */
function toggleRentDelivery(isDelivery) {
    const deliveryFields = document.getElementById('rent-delivery-fields');
    if (deliveryFields) {
        deliveryFields.style.display = isDelivery ? 'grid' : 'none';
        const addrInput = deliveryFields.querySelector('input[name="delivery_address"]');
        if (addrInput) addrInput.required = isDelivery;
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
    const display = document.getElementById('rent-total-display');
    if (display) display.innerText = "₱0.00";
}

rentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        resetRentModal(); // Reset before populating
        const row = btn.closest('tr');
        const equipmentName = row.cells[1].innerText;
        const equipmentId = row.cells[1].innerText;
        const rentNameDisplay = document.getElementById('rent-equipment-name');
        
        if (rentNameDisplay) {
            rentNameDisplay.textContent = `${equipmentName} (${equipmentId})`;
        }

        rentModal.classList.remove('hidden');
    });
});

rentModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-rent-modal') || 
        e.target.classList.contains('medical-modal-overlay')) {
        rentModal.classList.add('hidden');
        resetRentModal(); // Ensure reset on close
    }
});

const rentForm = document.getElementById('rentEntryForm');
const rentRateInput = document.getElementById('rent-rate-display');
const depositInput = document.getElementById('security-deposit-input');
const totalDisplay = document.querySelector('#rent-total-display'); // Specific ID for clarity

if (rentForm) {
    // Listener for Fulfillment Type & Payment Method Changes
    rentForm.addEventListener('change', (e) => {
        if (e.target.name === 'fulfillment_type') {
            toggleRentDelivery(e.target.value === 'Delivery');
        }
        if (e.target.id === 'rent-payment-method') {
            updateRentRefVisibility();
        }
    });

    rentForm.addEventListener('input', () => {
        const rate = parseFloat(rentRateInput.value) || 0;
        const deposit = parseFloat(depositInput.value) || 0;
        
        if (totalDisplay) {
            const total = rate + deposit;
            totalDisplay.textContent = `₱${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    });
}
/*============= START OF RENTAL SELECTION =============*/

document.addEventListener('DOMContentLoaded', function() {
    // Initial check for reference visibility
    updateRentRefVisibility();

    // Helper function to update status icons
    const updateStatusIcon = (selectElement, iconId) => {
        const icon = document.getElementById(iconId);
        if (!icon) return;
        
        if (selectElement.value) {
            icon.innerText = 'check_circle';
            icon.style.color = '#10b981'; // Medical Green
        } else {
            icon.innerText = 'radio_button_unchecked';
            icon.style.color = '#cbd5e1'; // Muted Gray
        }
    };

    // 1. Listen for Rental Customer Selection
    const rentalSelect = document.getElementById('rental-customer-id');
    if (rentalSelect) {
        rentalSelect.addEventListener('change', () => updateStatusIcon(rentalSelect, 'rental-customer-status'));
    }

    // 2. Listen for Purchase Customer Selection
    const purchaseSelect = document.getElementById('purchase-customer');
    if (purchaseSelect) {
        purchaseSelect.addEventListener('change', () => updateStatusIcon(purchaseSelect, 'purchase-customer-status'));
    }

    // 3. The Hand-off from Selection Modal to Final Modals
    const equipmentSelect = document.getElementById('global-equipment-select');

    document.querySelectorAll('.type-choice-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const flow = this.getAttribute('data-flow');
            const selectedOption = equipmentSelect.options[equipmentSelect.selectedIndex];

            if (!selectedOption || !selectedOption.value) {
                alert("Please select equipment first.");
                return;
            }

            const productId = selectedOption.value;
            const name = selectedOption.getAttribute('data-name');
            const stock = parseInt(selectedOption.getAttribute('data-stock')) || 0;
            const rentPrice = selectedOption.getAttribute('data-rent');
            const salePrice = selectedOption.getAttribute('data-price');

            // Close selection modal
            document.getElementById('txnSelectionModal').classList.add('hidden');

            if (flow === 'Rental') {
                resetRentModal(); // Clear previous data
                
                // --- FIX 1: POPULATE HIDDEN PRODUCT ID FOR RENTAL ---
                const rentHiddenInput = document.getElementById('rent-product-id');
                if (rentHiddenInput) rentHiddenInput.value = productId;

                // POPULATE RENTAL UI
                document.getElementById('rent-equipment-name').innerText = name;
                document.getElementById('rent-stock-display').innerText = `${stock} Units Available`;
                document.getElementById('rent-rate-display').value = rentPrice;
                document.getElementById('rentAssetModal').classList.remove('hidden');
            } else {
                // POPULATE PURCHASE
                activePurchaseProductId = productId; 

                // --- FIX 2: POPULATE HIDDEN PRODUCT ID FOR PURCHASE ---
                // (Assuming your purchase modal also has a hidden input with this ID)
                const purchaseHiddenInput = document.getElementById('purchase-product-id');
                if (purchaseHiddenInput) purchaseHiddenInput.value = productId;

                // --- CRITICAL FIX START ---
                const qtyInput = document.getElementById('purchase-qty');
                if (qtyInput) {
                    qtyInput.max = stock; 
                    qtyInput.value = stock > 0 ? 1 : 0; 
                }
                // --- CRITICAL FIX END ---

                document.getElementById('purchase-equipment-name').innerText = name;
                document.getElementById('purchase-stock-display').innerText = `${stock} Units Available`;
                document.getElementById('purchase-unit-price').value = salePrice;
                
                if (typeof updatePurchaseTotal === "function") {
                    updatePurchaseTotal();
                }
                
                document.getElementById('purchaseAssetModal').classList.remove('hidden');
            }
        });
    });
});

/*============= END OF RENTAL SELECTION =============*/

/*============= START OF REFERENCE NO. =============*/

document.addEventListener('DOMContentLoaded', function() {
    // Find all copy hint containers
    const copyButtons = document.querySelectorAll('.btn-copy-hint');

    copyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Find the input field that is a "sibling" to this button
            const input = this.parentElement.querySelector('.ref-id-input');
            
            if (input) {
                // Select the text
                input.select();
                input.setSelectionRange(0, 99999); // Mobile support

                // Copy to clipboard
                navigator.clipboard.writeText(input.value).then(() => {
                    // Visual feedback
                    const icon = this.querySelector('i');
                    const originalIcon = icon.innerText;
                    
                    icon.innerText = 'check';
                    this.style.color = '#22c55e'; // Success green
                    
                    setTimeout(() => {
                        icon.innerText = originalIcon;
                        this.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            }
        });
    });
});
/*============= END OF REFERENCE NO. =============*/

/*=================================== START OF ADD PAYMENT MODAL ===================================*/
document.addEventListener('DOMContentLoaded', function() {
    const paymentModal = document.getElementById('addPaymentModal');
    const paymentForm = document.getElementById('payment-form');
    const postBtn = paymentForm.querySelector('.pm-btn-post'); // Target within form
    
    // Elements for the Fields
    const txnIdInput = document.getElementById('payment-txn-id');
    const summaryRef = document.getElementById('summary-ref');
    const summaryBalance = document.getElementById('summary-balance');
    const paymentMethodSelect = document.getElementById('payment-method');
    const refGroup = document.getElementById('pm-ref-group');
    const refLabel = document.getElementById('pm-ref-label');
    const refInput = document.getElementById('payment-reference');
    const receiptInput = document.getElementById('receipt-image');
    const amountInput = document.getElementById('payment-amount');

    // 1. Open Modal via Event Delegation
    document.addEventListener('click', function(e) {
        // Find the button even if they click the <i> tag inside it
        const btn = e.target.closest('.btn-add-payment');
        if (!btn) return;

        e.preventDefault(); // Stop any default jump behavior

        // --- EXTRACT DATA ---
        const txnId = btn.getAttribute('data-txn-id');
        const refNo = btn.getAttribute('data-ref');
        const rawBalance = btn.getAttribute('data-balance');
        const balance = parseFloat(rawBalance || 0);

        // --- POPULATE HIDDEN ID (Critical Fix) ---
        if (txnId) {
            txnIdInput.value = txnId;
            console.log("Transaction ID Loaded:", txnId); // For your debugging
        } else {
            console.error("ID not found on button!");
        }

        // Populate UI
        summaryRef.innerText = refNo || 'N/A';
        summaryBalance.innerText = `₱${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        summaryBalance.setAttribute('data-raw-balance', balance); // For JS validation
        
        // Set initial amount and max
        amountInput.value = balance > 0 ? balance.toFixed(2) : "";
        amountInput.max = balance; 

        // --- LOGIC FOR FULLY PAID ---
        if (balance <= 0) {
            postBtn.disabled = true;
            postBtn.classList.add('pm-btn-disabled');
            postBtn.innerHTML = `<span class="material-symbols-rounded">verified</span> Fully Paid`;
            amountInput.disabled = true;
        } else {
            postBtn.disabled = false;
            postBtn.classList.remove('pm-btn-disabled');
            postBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Post Payment`;
            amountInput.disabled = false;
        }

        // Reset Method & Reference fields
        paymentMethodSelect.value = 'Cash'; 
        refGroup.style.display = 'none';
        refInput.required = false;
        refInput.value = '';

        // Show Modal
        paymentModal.classList.remove('hidden');
    });

    // 2. DYNAMIC FIELD LOGIC (Method Change)
    paymentMethodSelect.addEventListener('change', function() {
        if (this.value === 'Cash') {
            refGroup.style.display = 'none';
            refInput.required = false;
            refInput.value = '';
        } else {
            refGroup.style.display = 'block';
            refInput.required = true;
            refLabel.innerText = (this.value === 'Check') ? "Check Number" : "Reference Number";
            refInput.placeholder = (this.value === 'Check') ? "Enter check #" : "Enter transaction ID";
        }
    });

    // 3. FORM SUBMISSION VALIDATION
    paymentForm.addEventListener('submit', function(e) {
        const idValue = txnIdInput.value;
        const amount = parseFloat(amountInput.value);
        const maxAmount = parseFloat(amountInput.max);

        if (!idValue || idValue === "") {
            e.preventDefault();
            alert("Critical Error: Transaction ID is missing. Please refresh and try again.");
            return;
        }

        if (amount <= 0) {
            e.preventDefault();
            alert("Please enter a valid amount.");
            return;
        }

        if (amount > maxAmount + 0.01) { // 0.01 buffer for rounding
            e.preventDefault();
            alert(`Payment exceeds balance. Max allowed: ₱${maxAmount.toFixed(2)}`);
            return;
        }

        // Change button to loading state
        postBtn.disabled = true;
        postBtn.innerHTML = `<span class="material-symbols-rounded">sync</span> Processing...`;
    });

    // 4. CLOSE LOGIC
    const closeModal = () => {
        paymentModal.classList.add('hidden');
        paymentForm.reset();
    };

    document.querySelectorAll('#close-payment-modal, #cancel-payment').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) closeModal();
    });
});
/*=================================== END OF ADD PAYMENT MODAL ===================================*/


