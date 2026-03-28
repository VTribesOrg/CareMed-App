
/*============= START OF PAGINATION =============*/
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. CORE LOGIC: Update URL based on UI State ---
    const updateFilters = () => {
        const searchVal = document.getElementById('table-search')?.value.trim();
        const limitVal = document.getElementById('row-limit-select')?.value;

        const urlParams = new URLSearchParams();
        
        if (searchVal) urlParams.set('q', searchVal);
        if (limitVal) urlParams.set('limit', limitVal);
        
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
                alert(`Success! Transaction Recorded.`);
                window.location.reload(); 
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('Purchase Error:', error);
            alert(error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        });
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

/**
 * Toggles visibility of delivery address fields
 */
function togglePurchaseDelivery(isDelivery) {
    const deliveryFields = document.getElementById('purchase-delivery-fields');
    if (deliveryFields) {
        deliveryFields.style.display = isDelivery ? 'grid' : 'none';
        const addrInput = deliveryFields.querySelector('input[name="delivery_address"]');
        if (addrInput) addrInput.required = isDelivery;
    }
}

/*============= END OF PURCHASE SUBMISSION LOGIC =============*/



/*============= START OF RENTMODAL =============*/

const rentModal = document.getElementById('rentAssetModal');
const rentBtns = document.querySelectorAll('.asset-action-btn.rent');

rentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
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
    }
});

const rentForm = document.getElementById('rentEntryForm');
const rentRateInput = document.getElementById('rent-rate-display');
const depositInput = document.getElementById('security-deposit-input');
const totalDisplay = document.querySelector('.total-amount-display');

if (rentForm) {
    rentForm.addEventListener('input', () => {
        const rate = parseFloat(rentRateInput.value) || 0;
        const deposit = parseFloat(depositInput.value) || 0;
        
        if (totalDisplay) {
            const total = rate + deposit;
            totalDisplay.textContent = `₱${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    });
}


document.addEventListener('DOMContentLoaded', function() {
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
            // POPULATE RENTAL
            document.getElementById('rent-equipment-name').innerText = name;
            document.getElementById('rent-stock-display').innerText = `${stock} Units Available`;
            document.getElementById('rent-rate-display').value = rentPrice;
            document.getElementById('rentAssetModal').classList.remove('hidden');
        } else {
            // POPULATE PURCHASE
            activePurchaseProductId = productId; 

            // --- CRITICAL FIX START ---
            const qtyInput = document.getElementById('purchase-qty');
            if (qtyInput) {
                qtyInput.max = stock; // Update the max limit so validation passes
                qtyInput.value = stock > 0 ? 1 : 0; // Default to 1 if stock exists
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