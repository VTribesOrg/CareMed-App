document.addEventListener('DOMContentLoaded', () => {


    const regModal = document.getElementById('registerAssetModal');
    
    const addEquipmentBtn = document.getElementById('add-equipment-btn');



    /*============= ACTION DROPDOWN TOGGLE =============*/
    // Handle individual row selection
    const allRows = document.querySelectorAll('#inventory-table tbody tr');

    allRows.forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('.asset-action-btn')) return;

            const isActive = this.classList.contains('row-active');

            allRows.forEach(r => r.classList.remove('row-active'));
            document.querySelectorAll('.action-dropdown').forEach(d => d.classList.remove('active'));

            if (!isActive) {
                this.classList.add('row-active');
            }
        });
    });

    document.querySelectorAll('.more-trigger').forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const parentDropdown = this.closest('.action-dropdown');
            const parentRow = this.closest('tr');

            document.querySelectorAll('.action-dropdown').forEach(d => {
                if (d !== parentDropdown) d.classList.remove('active');
            });

            parentDropdown.classList.toggle('active');

            allRows.forEach(r => r.classList.remove('row-active'));
            parentRow.classList.add('row-active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#inventory-table')) {
            allRows.forEach(r => r.classList.remove('row-active'));
            document.querySelectorAll('.action-dropdown').forEach(d => d.classList.remove('active'));
        }
    });
    /*============= END OF ACTION DROPDOWN TOGGLE =============*/
    

    /*============= HISTORYMODAL =============*/

    function getMarkerClass(action) {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('return') || actionLower.includes('sold')) return 'warning';
        if (actionLower.includes('clean') || actionLower.includes('ready') || actionLower.includes('restock')) return 'ready';
        if (actionLower.includes('delete') || actionLower.includes('repair')) return 'danger';
        return 'info'; // Default
    }

    const histModal = document.getElementById('assetHistoryModal');

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.logs'); 
        if (!btn) return;

        const row = btn.closest('tr');
        if (!row) return;

        const productId = btn.dataset.productId;

        const equipmentName = row.cells[1].innerText;
        const model = row.cells[2].innerText;

        document.getElementById('history-asset-id').innerText =
            `${equipmentName} ${model} • ID: ${productId}`;

        const container = document.querySelector('.history-timeline-container');
        container.innerHTML = "<p>Loading...</p>";

        try {
            const res = await fetch(`/admin/product/${productId}/history`);
            const logs = await res.json();

            if (!logs.length) {
                container.innerHTML = "<p>No history available.</p>";
            } else {
                container.innerHTML = logs.map(log => `
                    <div class="timeline-item">
                        <div class="timeline-marker ${getMarkerClass(log.action)}"></div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <span class="event-title">${log.action}</span>
                                <span class="event-time">${log.date}</span>
                            </div>
                            <p class="event-details">${log.note || "No additional notes."}</p>
                            <div class="event-meta">
                                <span><i class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">person</i> ${log.user || 'System'}</span>
                                ${log.quantity ? `<span><i class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">inventory_2</i> Qty: ${log.quantity}</span>` : ""}
                            </div>
                        </div>
                    </div>
                `).join("");
            }

        } catch (err) {
            container.innerHTML = "<p>Error loading history.</p>";
            console.error(err);
        }

        histModal.classList.remove('hidden');
    });

    window.closeHistoryModal = function() {
        histModal?.classList.add('hidden');
    };

    document.querySelectorAll('.close-history-modal').forEach(btn => {
        btn.addEventListener('click', window.closeHistoryModal);
    });

    document.getElementById('btn-print-history')?.addEventListener('click', () => window.print());

    window.addEventListener('click', (e) => {
        if (e.target === histModal) {
            window.closeHistoryModal();
        }
    });

    /*============= END OF HISTORYMODAL =============*/


/*============= REGISTERASSETMODAL =============*/

    window.openAssetModal = function() {
        regModal?.classList.remove('hidden');
    };

    window.closeAssetModal = function() {
        regModal?.classList.add('hidden');
        
        // 1. Reset the standard form fields 
        // Note: Using 'assetEntryForm' to match the ID in your HTML
        const regForm = document.getElementById('assetEntryForm');
        if (regForm) regForm.reset();

        // 2. Reset the Image Upload specific elements
        const fileInput = document.getElementById('product-image-input');
        const imagePreview = document.getElementById('product-image-preview');
        const placeholder = document.getElementById('product-upload-placeholder');
        const previewContainer = document.getElementById('product-preview-container');
        const dropzone = document.getElementById('product-dropzone');

        if (fileInput) fileInput.value = "";
        
        // FIX: Remove the attribute entirely and clear alt text to stop the broken icon
        if (imagePreview) {
            imagePreview.removeAttribute('src');
            imagePreview.removeAttribute('alt');
        }
        
        // Restore placeholder and hide preview container
        if (placeholder) placeholder.style.display = 'block';
        if (previewContainer) previewContainer.style.display = 'none';

        // Revert dropzone styles to original state
        if (dropzone) {
            dropzone.style.borderColor = '#e2e8f0';
            dropzone.style.backgroundColor = '#f8fafc'; // Changed to match your initial style
            dropzone.style.cursor = 'pointer';
        }
    };

    document.querySelectorAll('.close-reg-modal').forEach(btn => btn.addEventListener('click', window.closeAssetModal));
    addEquipmentBtn?.addEventListener('click', window.openAssetModal);

    /*============= END OF REGISTERASSETMODAL =============*/


/*============= EDITASSETMODAL =============*/
// Variable to store the values as they were when the modal opened
let originalAssetData = {};

window.openEditModal = function(productData) {
    const editModal = document.getElementById('editAssetModal');
    const editForm = document.getElementById('editAssetForm');
    const updateBtn = document.getElementById('update-asset-btn'); // Ensure your button has this ID

    if (!editModal || !editForm) return;

    // Update the form action URL
    editForm.action = `/admin/edit-product/${productData.id}`;

    // Fill fields and store original state for comparison
    const fields = {
        'edit-product-id': productData.id,
        'edit-type': productData.type || '',
        'edit-model': productData.model || '',
        'edit-description': productData.description || '',
        'edit-offer-type': productData.offer_type || 'both',
        'edit-rent': String(productData.rent_price || 0),
        'edit-rent-period': productData.rent_period || 'Monthly',
        'edit-price': String(productData.sale_price || 0)
    };

    // Store these values to compare later
    originalAssetData = { ...fields };

    // Apply values to DOM
    Object.keys(fields).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = fields[id];
    });

    // Handle Image Preview
    const previewContainer = document.getElementById('edit-product-preview-container');
    const previewImg = document.getElementById('edit-product-image-preview');
    const placeholder = document.getElementById('edit-product-upload-placeholder');
    const offerTypeEl = document.getElementById('edit-offer-type');
    if (offerTypeEl) {
        offerTypeEl.dispatchEvent(new Event('change'));
    }

    if (productData.image && productData.image !== 'None' && productData.image !== '') {
        previewImg.src = `/static/${productData.image}`;
        previewContainer.style.display = 'flex';
        placeholder.style.display = 'none';
    } else {
        previewImg.removeAttribute('src');
        previewContainer.style.display = 'none';
        placeholder.style.display = 'block';
    }

    // Initial button state: disabled until change detected
    if (updateBtn) updateBtn.disabled = true;

    document.getElementById('edit-offer-type')?.dispatchEvent(new Event('change'));
    editModal.classList.remove('hidden');

};

// 2. Change Detection Logic
// This listener checks if current inputs match the original data
document.getElementById('editAssetForm')?.addEventListener('input', function() {
    const updateBtn = document.getElementById('update-asset-btn');
    const fileInput = document.getElementById('edit-product-image-input');
    
    const currentData = {
        'edit-product-id': document.getElementById('edit-product-id').value,
        'edit-type': document.getElementById('edit-type').value,
        'edit-model': document.getElementById('edit-model').value,
        'edit-description': document.getElementById('edit-description').value,
        'edit-offer-type': document.getElementById('edit-offer-type').value,
        'edit-rent': document.getElementById('edit-rent').value,
        'edit-rent-period': document.getElementById('edit-rent-period').value,
        'edit-price': document.getElementById('edit-price').value
    };

    // Check if any text/number changed
    const hasChanged = Object.keys(currentData).some(key => 
        String(currentData[key]) !== String(originalAssetData[key])
    );

    // Check if a new file has been picked
    const hasNewFile = fileInput && fileInput.files.length > 0;

    if (updateBtn) {
        updateBtn.disabled = !(hasChanged || hasNewFile);
    }
});

document.getElementById('edit-offer-type')?.addEventListener('change', () => {
    document.getElementById('editAssetForm').dispatchEvent(new Event('input'));
});
document.getElementById('edit-rent-period')?.addEventListener('change', () => {
    document.getElementById('editAssetForm').dispatchEvent(new Event('input'));
});

// 3. Close Modal Handler
window.closeEditModal = function() {
    const editModal = document.getElementById('editAssetModal');
    const editForm = document.getElementById('editAssetForm');
    const fileInput = document.getElementById('edit-product-image-input');
    
    editModal?.classList.add('hidden');
    
    // Cleanup
    const previewImg = document.getElementById('edit-product-image-preview');
    if (previewImg) previewImg.removeAttribute('src');
    
    // Reset file input so it doesn't stay "changed" for the next product
    if (fileInput) fileInput.value = "";
};

const originalCloseModal = window.closeEditModal;
window.closeEditModal = function() {
    originalCloseModal(); // Call your existing cleanup
    
    const updateBtn = document.getElementById('update-asset-btn');
    if (updateBtn) {
        const btnText = updateBtn.querySelector('.btn-text');
        const btnSpinner = updateBtn.querySelector('.btn-spinner');
        
        updateBtn.disabled = true;
        if (btnText) btnText.style.opacity = '1';
        if (btnSpinner) btnSpinner.classList.add('hidden');
    }
};

document.querySelectorAll('.close-edit-modal').forEach(btn => {
    btn.addEventListener('click', window.closeEditModal);
});


document.getElementById('editAssetForm')?.addEventListener('submit', function() {
    const updateBtn = document.getElementById('update-asset-btn');
    const btnText = updateBtn.querySelector('.btn-text');
    const btnSpinner = updateBtn.querySelector('.btn-spinner');

    if (updateBtn) {
        // Disable again to prevent double-clicks
        updateBtn.disabled = true;
        updateBtn.style.cursor = 'wait';
        
        // Hide text, show spinner
        if (btnText) btnText.style.opacity = '0';
        if (btnSpinner) btnSpinner.classList.remove('hidden');
    }
});
/*============= END OF EDITASSETMODAL =============*/



/*============= IMAGE UPLOAD & DRAG-DROP (CLEAN & SAFE) =============*/
(function() {
    const setupUpload = (dropzoneId, inputId, placeholderId, previewContainerId, imagePreviewId, resetBtnId) => {
        const dropzone = document.getElementById(dropzoneId);
        const fileInput = document.getElementById(inputId);
        const placeholder = document.getElementById(placeholderId);
        const previewContainer = document.getElementById(previewContainerId);
        const imagePreview = document.getElementById(imagePreviewId);
        const resetBtn = document.getElementById(resetBtnId);

        if (!dropzone || !fileInput || !previewContainer) return;

        /* ========= SAFER STATE CHECK ========= */
        const isPreviewVisible = () => {
            return window.getComputedStyle(previewContainer).display !== 'none';
        };

        /* ========= UI HELPERS ========= */
        const showPreview = (src) => {
            imagePreview.src = src;
            placeholder.style.display = 'none';
            previewContainer.style.display = 'flex';

            dropzone.style.borderColor = '#10b981';
            dropzone.style.background = '#f0fdf4';
            dropzone.style.cursor = 'default';
        };

        const resetPreview = () => {
            fileInput.value = "";

            if (imagePreview) {
                imagePreview.removeAttribute('src');
                imagePreview.removeAttribute('alt');
            }

            placeholder.style.display = 'block';
            previewContainer.style.display = 'none';

            dropzone.style.borderColor = '#e2e8f0';
            dropzone.style.background = '#f8fafc';
            dropzone.style.cursor = 'pointer';
        };

        /* ========= CLICK TO UPLOAD ========= */
        dropzone.addEventListener('click', (e) => {
            if (!isPreviewVisible() && !e.target.closest(`#${resetBtnId}`)) {
                fileInput.click();
            }
        });

        /* ========= FILE SELECT ========= */
        fileInput.addEventListener('change', function() {
            const file = this.files[0];

            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = (e) => {
                    showPreview(e.target.result);
                };

                reader.readAsDataURL(file);
            } else if (file) {
                alert("Please upload a valid image file.");
                this.value = "";
            }
        });

        /* ========= RESET BUTTON ========= */
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetPreview();
            });
        }

        /* ========= DRAG EVENTS ========= */
        ['dragenter', 'dragover'].forEach(event => {
            dropzone.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!isPreviewVisible()) {
                    dropzone.style.borderColor = '#0ea5e9';
                    dropzone.style.background = '#f0f9ff';
                }
            });
        });

        ['dragleave', 'drop'].forEach(event => {
            dropzone.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (isPreviewVisible()) {
                    dropzone.style.borderColor = '#10b981';
                    dropzone.style.background = '#f0fdf4';
                } else {
                    dropzone.style.borderColor = '#e2e8f0';
                    dropzone.style.background = '#f8fafc';
                }
            });
        });

        /* ========= DROP FILE ========= */
        dropzone.addEventListener('drop', (e) => {
            if (isPreviewVisible()) return;

            const files = e.dataTransfer.files;

            if (files.length > 0 && files[0].type.startsWith('image/')) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });

        /* ========= INITIAL RESET (IMPORTANT) ========= */
        // Ensures no ghost image on load
        resetPreview();
    };

    /* ========= INIT ========= */
    setupUpload(
        'product-dropzone', 
        'product-image-input', 
        'product-upload-placeholder', 
        'product-preview-container', 
        'product-image-preview', 
        'reset-product-upload'
    );

    setupUpload(
        'edit-product-dropzone', 
        'edit-product-image-input', 
        'edit-product-upload-placeholder', 
        'edit-product-preview-container', 
        'edit-product-image-preview', 
        'reset-edit-upload'
    );
})();
/*============= END OF IMAGE UPLOAD =============*/

    const inventoryTable = document.getElementById('inventory-table');

    if (inventoryTable) {
        inventoryTable.addEventListener('click', (e) => {
            // Change '.btn-edit-trigger' to '.dropdown-item.edit' to match your HTML
            const editBtn = e.target.closest('.dropdown-item.edit');
            const logsBtn = e.target.closest('.dropdown-item.logs');
            const deleteBtn = e.target.closest('.dropdown-item.delete');

            if (editBtn) {
                const rawDesc = editBtn.dataset.description;
                
                const productData = {
                    id: editBtn.dataset.id,
                    type: editBtn.dataset.type,
                    model: editBtn.dataset.model,
                    stock: editBtn.dataset.stock,
                    offer_type: editBtn.dataset.offer || 'both', 
                    rent_period: editBtn.dataset.period || 'Monthly',
                    rent_price: editBtn.dataset.rent || '0',
                    sale_price: editBtn.dataset.price || '0',
                    description: (rawDesc === "None" || !rawDesc) ? "" : rawDesc.trim(),
                    image: editBtn.dataset.image
                };
                
                // Now call the modal function with the object it expects
                window.openEditModal(productData);
            } 
                else if (deleteBtn) {
                    const row = deleteBtn.closest('tr');
                    const assetTag = row.cells[1].innerText;
                    console.log("Deleting...", assetTag);
                }
            });
    }
});


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


/*============= RENTAL CUSTOMER SELECTION =============*/
const customerSelect = document.getElementById('rental-customer-id');
const idStatusIcon = document.getElementById('customer-id-status');

if (customerSelect) {
    customerSelect.addEventListener('change', function() {
        if (this.value) {
            // Turns the circle next to "Select Customer" into a green checkmark
            idStatusIcon.innerText = 'check_circle';
            idStatusIcon.style.color = '#10b981'; 
        } else {
            // Reverts to an empty circle if no valid customer is selected
            idStatusIcon.innerText = 'radio_button_unchecked';
            idStatusIcon.style.color = '#cbd5e1';
        }
    });
}


/*============= END OF RENTMODAL =============*/


/*============= ADDSTOCKMODAL =============*/

document.addEventListener('DOMContentLoaded', function() {
    const stockModal = document.getElementById('addStockModal');
    const stockForm = document.getElementById('addStockForm');
    const stockInput = document.getElementById('stock-increment-input');
    const currentStockDisplay = document.getElementById('current-stock-display');
    const newTotalDisplay = document.getElementById('new-total-display');
    const stockEquipName = document.getElementById('stock-equipment-name');

    let currentBaseStock = 0;
    let activeProductId = null;

    // --- 1. Event Delegation for Opening Modal ---
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.add-stock-trigger');
        if (btn) {
            activeProductId = btn.dataset.id;
            currentBaseStock = parseInt(btn.dataset.stock) || 0;
            
            stockEquipName.innerText = btn.dataset.name;
            currentStockDisplay.innerText = `${currentBaseStock} Units`;
            newTotalDisplay.innerText = `${currentBaseStock} Units`;
            stockInput.value = ''; 
            
            stockModal.classList.remove('hidden');
        }

        // Handle closing modal
        if (e.target.closest('.close-stock-modal')) {
            stockModal.classList.add('hidden');
        }
    });

    // --- 2. Live Calculation ---
    stockInput.addEventListener('input', function() {
        const val = parseInt(this.value) || 0;
        const total = currentBaseStock + val;
        newTotalDisplay.innerText = `${total} Units`;
        newTotalDisplay.style.color = total < currentBaseStock ? "#ef4444" : "#52B788";
    });

    // --- 3. Form Submission (AJAX) ---
    stockForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const incrementVal = stockInput.value;
        const reasonVal = this.querySelector('textarea').value;

        fetch(`/admin/update_stock/${activeProductId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                increment: parseInt(incrementVal),
                reason: reasonVal
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.reload(); 
            }
        })
        .catch(err => console.error("CSP-Compliant Fetch Error:", err));
    });
});


/*============= END OF ADDSTOCKMODAL =============*/

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


/*============= DELETEMODAL =============*/
const deleteModal = document.getElementById('deleteAssetModal');
const deleteForm = document.getElementById('deleteAssetForm'); // Reference the form
const closeButtons = document.querySelectorAll('.close-modal-btn');
let assetIdToDelete = null;

document.addEventListener('click', function(e) {
    const deleteBtn = e.target.closest('.dropdown-item.delete');
    
    if (deleteBtn) {
        const row = deleteBtn.closest('tr');
        assetIdToDelete = row.getAttribute('data-id');
        
        // Grab the name from the 3rd cell (index 2)
        const assetName = row.cells[2].innerText; 
        const deleteNameDisplay = document.getElementById('delete-asset-name');
        if (deleteNameDisplay) deleteNameDisplay.innerText = assetName;

        // DYNAMICALLY SET THE FORM ACTION URL
        // Assumes your route is /admin/delete-product/<id>
        if (deleteForm) {
            deleteForm.action = `/admin/delete-product/${assetIdToDelete}`;
        }

        deleteModal.classList.remove('hidden');
    }
});

// Logic to hide the modal
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        assetIdToDelete = null;
    });
});

// Close when clicking outside the modal content
window.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        deleteModal.classList.add('hidden');
    }
});
/*============= END OF DELETEMODAL =============*/

/*============= START OF PAGINATION =============*/
document.addEventListener('DOMContentLoaded', function() {
    
    const updateFilters = () => {
        const searchVal = document.getElementById('table-search')?.value.trim();
        const limitVal = document.getElementById('row-limit-select')?.value;
        const typeVal = document.getElementById('type-filter')?.value;
        const fullVal = document.getElementById('fulfillment-filter')?.value;

        const urlParams = new URLSearchParams();
        
        if (searchVal) urlParams.set('q', searchVal);
        if (limitVal) urlParams.set('limit', limitVal);
        if (typeVal) urlParams.set('type', typeVal);
        if (fullVal) urlParams.set('fulfillment', fullVal);
        
        urlParams.set('page', 1);

        window.location.href = window.location.pathname + '?' + urlParams.toString();
    };

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

    const filters = ['row-limit-select', 'type-filter', 'fulfillment-filter'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateFilters);
    });

    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            window.location.href = window.location.pathname;
        });
    }

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



/*============= START OF FLASK MESSAGE =============*/
document.addEventListener("DOMContentLoaded", function () {
    const alerts = document.querySelectorAll(".auto-dismiss");

    alerts.forEach(alert => {
        const duration = 5000; // 5 seconds (change to 3000 for 3 sec)
        const progressBar = alert.querySelector(".progress-bar");

        // Animate progress bar
        progressBar.style.width = "100%";
        progressBar.style.transition = `width ${duration}ms linear`;

        setTimeout(() => {
            progressBar.style.width = "0%";
        }, 10);

        // Auto close alert
        setTimeout(() => {
            let bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, duration);
    });
});
/*============= END OF FLASK MESSAGE =============*/



/*============= START OF PRODUCT TYPE =============*/
document.addEventListener('DOMContentLoaded', function() {
    const offerTypeSelect = document.getElementById('reg-offer-type');
    const pricingRow = document.getElementById('pricing-row-container');
    const rentField = document.getElementById('rent-field');
    const saleField = document.getElementById('sale-field');

    if (offerTypeSelect && pricingRow) {
        offerTypeSelect.addEventListener('change', function() {
            const val = this.value;
            rentField.style.display = 'none';
            saleField.style.display = 'none';

            if (val === 'Rent') {
                rentField.style.display = 'block';
                pricingRow.style.gridTemplateColumns = '200px 260px'; 
            } 
            else if (val === 'Sale') {
                saleField.style.display = 'block';
                pricingRow.style.gridTemplateColumns = '200px 180px'; 
            } 
            else if (val === 'Both') {
                rentField.style.display = 'block';
                saleField.style.display = 'block';
                pricingRow.style.gridTemplateColumns = '200px 260px 180px'; 
            }
        });
    }
});
/*============= END OF PRODUCT TYPE =============*/


/*============= START OF EDIT PRODUCT TYPE =============*/
document.addEventListener('DOMContentLoaded', function() {
    const editOfferType = document.getElementById('edit-offer-type');
    const editPricingRow = document.getElementById('edit-pricing-row-container');
    const editRentField = document.getElementById('edit-rent-field');
    const editSaleField = document.getElementById('edit-sale-field');

    if (editOfferType && editPricingRow) {
        editOfferType.addEventListener('change', function() {
            const val = this.value;
            editRentField.style.display = 'none';
            editSaleField.style.display = 'none';

            if (val === 'Rent') {
                editRentField.style.display = 'block';
                editPricingRow.style.gridTemplateColumns = '200px 260px'; 
            } 
            else if (val === 'Sale') {
                editSaleField.style.display = 'block';
                editPricingRow.style.gridTemplateColumns = '200px 180px'; 
            } 
            else if (val === 'Both') {
                editRentField.style.display = 'block';
                editSaleField.style.display = 'block';
                editPricingRow.style.gridTemplateColumns = '200px 260px 180px'; 
            }
        });
    }
});
/*============= END OF EDIT PRODUCT TYPE =============*/