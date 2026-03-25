document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Element Selectors
    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    
    const regModal = document.getElementById('registerAssetModal');
    const editModal = document.getElementById('editAssetModal');
    const histModal = document.getElementById('assetHistoryModal');
    
    const addEquipmentBtn = document.getElementById('add-equipment-btn');

    // 2. Dropdown & Navigation Handlers
    function toggleDropdown(dropdown) {
        document.querySelectorAll('.header-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('active');
        });
        dropdown?.classList.toggle('active');
    }

    notifBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(notifDropdown);
    });

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

    window.openEditModal = function(productData) {
        const editModal = document.getElementById('editAssetModal');
        const editForm = document.getElementById('editAssetForm');

        if (!editModal || !editForm) return;

        // Update the form action URL
        editForm.action = `/admin/edit-product/${productData.id}`;

        // Fill fields
        document.getElementById('edit-product-id').value = productData.id;
        document.getElementById('edit-type').value = productData.type || '';
        document.getElementById('edit-model').value = productData.model || '';
        document.getElementById('edit-stock').value = productData.stock || 0;
        document.getElementById('edit-rent').value = productData.rent || 0;
        document.getElementById('edit-price').value = productData.price || 0;
        document.getElementById('edit-description').value = productData.description || '';

        // Handle Image Preview
        const previewContainer = document.getElementById('edit-product-preview-container');
        const previewImg = document.getElementById('edit-product-image-preview');
        const placeholder = document.getElementById('edit-product-upload-placeholder');

        if (productData.image && productData.image !== 'None' && productData.image !== '') {
            previewImg.src = `/static/${productData.image}`;
            previewContainer.style.display = 'flex';
            placeholder.style.display = 'none';
        } else {
            previewImg.removeAttribute('src');
            previewContainer.style.display = 'none';
            placeholder.style.display = 'block';
        }

        editModal.classList.remove('hidden');
    };



    // 2. Close Modal Handler
    window.closeEditModal = function() {
        const editModal = document.getElementById('editAssetModal');
        editModal?.classList.add('hidden');
        
        // Cleanup: remove src to prevent the "old" image flashing next time it opens
        const previewImg = document.getElementById('edit-product-image-preview');
        if (previewImg) {
            previewImg.removeAttribute('src');
        }
    };

    document.querySelectorAll('.close-edit-modal').forEach(btn => {
        btn.addEventListener('click', window.closeEditModal);
    });

/*============= END OF EDITASSETMODAL =============*/


    /*============= HISTORYMODAL =============*/

    window.openHistoryModal = function(button) {
        const row = button.closest('tr');
        if (!row) return;

        const assetTag = row.cells[1].innerText;
        const equipmentName = row.cells[2].innerText;

        const displayElement = document.getElementById('history-asset-id');
        if (displayElement) {
            displayElement.innerText = `${equipmentName} • ID: ${assetTag}`;
        }
        
        histModal?.classList.remove('hidden');
    };

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
                // Extract the dataset from the button to create the 'productData' object
                const productData = {
                    id: editBtn.dataset.id,
                    type: editBtn.dataset.type,
                    model: editBtn.dataset.model,
                    stock: editBtn.dataset.stock,
                    rent: editBtn.dataset.rent,
                    price: editBtn.dataset.price,
                    description: (rawDesc === "None" || !rawDesc || rawDesc.trim() === "") ? "" : rawDesc.trim(),
                    image: editBtn.dataset.image
                };
                
                // Now call the modal function with the object it expects
                window.openEditModal(productData);
            } 
            else if (logsBtn) {
                window.openHistoryModal(logsBtn);
            }
                else if (deleteBtn) {
                    const row = deleteBtn.closest('tr');
                    const assetTag = row.cells[1].innerText;
                    console.log("Deleting...", assetTag);
                }
            });
    }
});


/*============= RENTMODAL =============*/

const rentModal = document.getElementById('rentAssetModal');
const rentBtns = document.querySelectorAll('.asset-action-btn.rent');

rentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const equipmentName = row.cells[2].innerText;
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


/*============= PURCHASEMODAL =============*/

const purchaseModal = document.getElementById('purchaseAssetModal');

document.querySelectorAll('.asset-action-btn.purchase').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        const equipmentName = row.cells[2].innerText;
        const price = row.cells[6].innerText.replace('₱', '').replace(',', '');

        document.getElementById('purchase-equipment-name').innerText = equipmentName;
        document.getElementById('purchase-unit-price').value = price;
        updatePurchaseTotal();
        
        purchaseModal.classList.remove('hidden');
    });
});

document.querySelectorAll('.close-purchase-modal').forEach(btn => {
    btn.addEventListener('click', () => purchaseModal.classList.add('hidden'));
});

function updatePurchaseTotal() {
    const qtyInput = document.getElementById('purchase-qty');
    const priceInput = document.getElementById('purchase-unit-price');
    const totalDisplay = document.getElementById('purchase-total-display');

    if (qtyInput && priceInput && totalDisplay) {
        const qty = qtyInput.value || 0;
        const price = priceInput.value || 0;
        const total = qty * price;
        totalDisplay.innerText = `₱${total.toLocaleString()}`;
    }
}

document.getElementById('purchase-qty')?.addEventListener('input', updatePurchaseTotal);
document.getElementById('purchase-unit-price')?.addEventListener('input', updatePurchaseTotal);

/*============= END OF PURCHASEMODAL =============*/


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
document.addEventListener('DOMContentLoaded', () => {
    const rowSelect = document.getElementById('row-limit-select');
    const inventoryTable = document.getElementById('inventory-table');
    const tableBody = inventoryTable.querySelector('tbody');
    const paginationContainer = document.querySelector('.pagination-controls');
    
    let currentPage = 1;

    function updateTableDisplay() {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const limit = parseInt(rowSelect.value);
        const totalPages = Math.ceil(rows.length / limit);
        
        // Safety check for current page
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

        const startIndex = (currentPage - 1) * limit;
        const endIndex = startIndex + limit;

        rows.forEach((row, index) => {
            row.style.display = (index >= startIndex && index < endIndex) ? "" : "none";
        });

        updatePaginationInfo(startIndex + 1, Math.min(endIndex, rows.length), rows.length);
        renderPagination(rows.length, limit);
    }

    function renderPagination(totalItems, limit) {
        const totalPages = Math.ceil(totalItems / limit);
        paginationContainer.innerHTML = ''; 

        // 1. Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pag-btn';
        prevBtn.disabled = currentPage === 1;
        prevBtn.innerHTML = '<span class="material-symbols-rounded">chevron_left</span>';
        prevBtn.onclick = () => { if(currentPage > 1) { currentPage--; updateTableDisplay(); }};
        paginationContainer.appendChild(prevBtn);

        // 2. Dynamic Page Numbers (Show max 3 pages for brevity)
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `pag-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.onclick = () => { currentPage = i; updateTableDisplay(); };
                paginationContainer.appendChild(pageBtn);
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 5px';
                paginationContainer.appendChild(dots);
            }
        }

        // 3. Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pag-btn';
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        nextBtn.innerHTML = '<span class="material-symbols-rounded">chevron_right</span>';
        nextBtn.onclick = () => { if(currentPage < totalPages) { currentPage++; updateTableDisplay(); }};
        paginationContainer.appendChild(nextBtn);

        // 4. Jump to Page UI
        if (totalPages > 1) {
            const jumpWrapper = document.createElement('div');
            jumpWrapper.className = 'jump-to-wrapper';
            jumpWrapper.innerHTML = `
                <span class="jump-text">Go to:</span>
                <input type="number" class="jump-input" min="1" max="${totalPages}" value="${currentPage}">
                <button class="jump-btn">Go</button>
            `;
            
            const jBtn = jumpWrapper.querySelector('.jump-btn');
            const jInput = jumpWrapper.querySelector('.jump-input');
            
            const handleJump = () => {
                const val = parseInt(jInput.value);
                if (val >= 1 && val <= totalPages) {
                    currentPage = val;
                    updateTableDisplay();
                }
            };

            jBtn.onclick = handleJump;
            jInput.onkeypress = (e) => { if(e.key === 'Enter') handleJump(); };
            
            paginationContainer.appendChild(jumpWrapper);
        }
    }

    function updatePaginationInfo(start, end, total) {
        const infoLabel = document.querySelector('.pagination-info');
        if (infoLabel) {
            infoLabel.textContent = total === 0 ? `Showing 0 to 0 of 0 entries` : `Showing ${start} to ${end} of ${total} entries`;
        }
    }

    if (rowSelect) {
        rowSelect.addEventListener('change', function() {
            currentPage = 1;
            updateTableDisplay();
        });
    }

    updateTableDisplay();
});
/*============= END OF PAGINATION =============*/


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


