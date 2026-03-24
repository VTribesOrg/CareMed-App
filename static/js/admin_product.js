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
    };

    document.querySelectorAll('.close-reg-modal').forEach(btn => btn.addEventListener('click', window.closeAssetModal));
    addEquipmentBtn?.addEventListener('click', window.openAssetModal);

    /*============= END OF REGISTERASSETMODAL =============*/


    /*============= EDITASSETMODAL =============*/

    window.openEditModal = function(button) {
        const row = button.closest('tr');
        if (!row) return;


        const type = row.cells[1].innerText;
        const model = row.cells[2].innerText;
        const price = row.cells[5].innerText.replace('₱', '').replace(',', '');
        const rent = row.cells[6].innerText.replace('₱', '').replace(',', '');


        document.getElementById('edit-type').value = type;
        document.getElementById('edit-model').value = model;
        document.getElementById('edit-price').value = price;
        document.getElementById('edit-rent').value = rent;

        editModal?.classList.remove('hidden');
    };

    window.closeEditModal = function() {
        editModal?.classList.add('hidden');
    };

    document.querySelectorAll('.close-edit-modal').forEach(btn => btn.addEventListener('click', window.closeEditModal));

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


    /*============= IMAGEUPLOAD =============*/



    // Click triggers for Add and Edit
    document.getElementById('product-dropzone')?.addEventListener('click', function(e) {
        if (!e.target.closest('.btn-file-reset')) document.getElementById('product-image-input').click();
    });
    document.getElementById('edit-product-dropzone')?.addEventListener('click', function(e) {
        if (!e.target.closest('.btn-file-reset')) document.getElementById('edit-product-image-input').click();
    });

    // Change listeners
    document.getElementById('product-image-input')?.addEventListener('change', function() {
        window.updateUploadUI('product-dropzone', 'product-preview-text', 'product-file-name', this.files);
    });
    document.getElementById('edit-product-image-input')?.addEventListener('change', function() {
        window.updateUploadUI('edit-product-dropzone', 'edit-product-preview-text', 'edit-product-file-name', this.files);
    });

    // Reset listeners
    document.getElementById('reset-product-upload')?.addEventListener('click', (e) => {
        window.resetUpload(e, 'product-image-input', 'product-dropzone', 'product-preview-text');
    });
    document.getElementById('reset-edit-upload')?.addEventListener('click', (e) => {
        window.resetUpload(e, 'edit-product-image-input', 'edit-product-dropzone', 'edit-product-preview-text');
    });





    /*============= DRAG & DROP LOGIC =============*/

    document.getElementById('assetEntryForm')?.addEventListener('submit', function(e) {
        const fileInput = document.getElementById('product-image-input');
        const dropzone = document.getElementById('product-dropzone');

        // Check if the file input has any files
        if (!fileInput.files || fileInput.files.length === 0) {
            e.preventDefault(); // Stop the form from submitting

            // 1. Visual Error Feedback
            dropzone.classList.add('upload-error');
            dropzone.style.borderColor = '#ef4444';
            
            // 2. Shake the dropzone
            dropzone.style.animation = 'shake 0.4s ease-in-out';

            // 3. Optional: Alert the user
            alert("Clinical Registry Notice: A product image is required to save this entry.");

            // 4. Remove the shake class after animation so it can trigger again
            setTimeout(() => {
                dropzone.style.animation = '';
            }, 400);
            
            return false;
        }
    });


    ['product-dropzone', 'edit-product-dropzone'].forEach(id => {
        const zone = document.getElementById(id);
        if (!zone) return;

        // 1. Prevent browser from opening the file
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // 2. Visual feedback when hovering over the zone
        ['dragenter', 'dragover'].forEach(eventName => {
            zone.addEventListener(eventName, () => {
                zone.style.borderColor = '#0ea5e9'; // Blue highlight
                zone.style.background = '#f0f9ff';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, () => {
                // Only reset if no file is currently selected
                const inputId = id === 'product-dropzone' ? 'product-image-input' : 'edit-product-image-input';
                if (!document.getElementById(inputId).value) {
                    zone.style.borderColor = '#cbd5e1';
                    zone.style.background = '#f8fafc';
                }
            }, false);
        });

        zone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files && files.length > 0) {
                const file = files[0];

                // VALIDATION: Is it an image?
                if (!file.type.startsWith('image/')) {
                    // 1. Apply the error style and shake animation
                    zone.classList.add('upload-error');
                    
                    // 2. Optional: Change the icon color to red temporarily
                    const icon = zone.querySelector('.upload-icon');
                    if (icon) icon.style.color = '#ef4444';

                    // 3. Remove the error state after 1 second
                    setTimeout(() => {
                        zone.classList.remove('upload-error');
                        if (icon) icon.style.color = '#94a3b8';
                        zone.style.borderColor = '#cbd5e1';
                        zone.style.background = '#f8fafc';
                    }, 1000);

                    alert("Medical Registry Error: Please upload a valid image file (JPG/PNG).");
                    return;
                }

                // ... rest of your successful upload logic (updateUploadUI, etc.)
                const isEdit = id === 'edit-product-dropzone';
                const inputId = isEdit ? 'edit-product-image-input' : 'product-image-input';
                document.getElementById(inputId).files = files;
                window.updateUploadUI(id, 
                    isEdit ? 'edit-product-preview-text' : 'product-preview-text', 
                    isEdit ? 'edit-product-file-name' : 'product-file-name', 
                    files
                );
            }
        });
});
/**
 * FIXED: Now handles resetting the UI elements back to default visibility
 */
window.resetUpload = function(event, inputId, dropzoneId, previewId) {
    event.stopPropagation();
    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(dropzoneId);
    const previewBox = document.getElementById(previewId);
    const imgPreview = previewBox.querySelector('img');

    if (input) input.value = "";
    if (previewBox) previewBox.style.display = 'none';
    if (imgPreview) imgPreview.src = "#"; // Clear the image
    
    if (dropzone) {
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
        dropzone.querySelectorAll('.upload-icon, p').forEach(el => el.style.opacity = '1');
    }
};

/**
 * FIXED: Now hides background elements when a file is selected
 */
window.updateUploadUI = function(dropzoneId, previewId, nameId, files) {
    const previewBox = document.getElementById(previewId);
    const nameDisp = document.getElementById(nameId);
    const dropzone = document.getElementById(dropzoneId);
    
    // Find the <img> tag inside this specific dropzone/preview area
    const imgPreview = previewBox.querySelector('img');

    if (files && files[0]) {
        const reader = new FileReader();

        reader.onload = function(e) {
            if (imgPreview) imgPreview.src = e.target.result;
            if (previewBox) previewBox.style.display = 'flex';
            if (nameDisp) nameDisp.innerText = files[0].name;
            
            if (dropzone) {
                dropzone.style.borderColor = '#10b981';
                dropzone.style.background = '#f0fdf4';
                dropzone.querySelectorAll('.upload-icon, p').forEach(el => el.style.opacity = '0.1');
            }
        };

        reader.readAsDataURL(files[0]); // This converts the image to a format the <img> tag can show
    }
};
/*============= END OF IMAGEUPLOAD =============*/


    const inventoryTable = document.getElementById('inventory-table');

    if (inventoryTable) {
        inventoryTable.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.dropdown-item.edit');
            const logsBtn = e.target.closest('.dropdown-item.logs');
            const deleteBtn = e.target.closest('.dropdown-item.delete');

            if (editBtn) {
                window.openEditModal(editBtn);
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

const addStockModal = document.getElementById('addStockModal');
document.addEventListener('click', (e) => {
    if (e.target.closest('.open-stock-modal')) {
        addStockModal.classList.remove('hidden');
    }
});

const closeStockBtns = document.querySelectorAll('.close-stock-modal');
closeStockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        addStockModal.classList.add('hidden');
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