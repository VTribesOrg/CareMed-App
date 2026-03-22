document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Element Selectors
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const settingsBtn = document.getElementById('settings-toggle-btn');
    const settingsPopup = document.getElementById('settings-menu-popup');
    const checkbox = document.getElementById('sidebar-state');
    
    const regModal = document.getElementById('registerAssetModal');
    const editModal = document.getElementById('editAssetModal');
    const histModal = document.getElementById('assetHistoryModal');
    
    const addEquipmentBtn = document.getElementById('add-equipment-btn');

    // 2. Sidebar Initialization
    const sidebarState = localStorage.getItem('sidebar-collapsed');
    if (checkbox) {
        checkbox.checked = sidebarState !== 'true';
        checkbox.addEventListener('change', function() {
            localStorage.setItem('sidebar-collapsed', !this.checked);
        });
    }

    // 3. Dropdown & Navigation Handlers
    function toggleDropdown(dropdown) {
        document.querySelectorAll('.header-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('active');
        });
        dropdown?.classList.toggle('active');
    }

    profileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(profileDropdown);
    });

    notifBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(notifDropdown);
    });

    settingsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        settingsPopup?.classList.toggle('hidden');
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

    window.addEventListener('click', (e) => {
        if (profileBtn && !profileBtn.contains(e.target)) profileDropdown?.classList.remove('active');
        if (notifBtn && !notifBtn.contains(e.target)) notifDropdown?.classList.remove('active');
        if (settingsPopup && !settingsPopup.contains(e.target) && e.target !== settingsBtn) {
            settingsPopup.classList.add('hidden');
        }
        
        if (e.target === regModal) window.closeAssetModal();
        if (e.target === editModal) window.closeEditModal();
        if (e.target === histModal) window.closeHistoryModal();
    });

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

        const assetTag = row.cells[1].innerText;
        const type = row.cells[2].innerText;
        const model = row.cells[3].innerText;
        const stock = row.cells[4].innerText.replace(' Units', '');
        const price = row.cells[6].innerText.replace('₱', '').replace(',', '');
        const rent = row.cells[7].innerText.replace('₱', '').replace(',', '');

        document.getElementById('edit-tag').value = assetTag;
        document.getElementById('edit-type').value = type;
        document.getElementById('edit-model').value = model;
        document.getElementById('edit-stock').value = stock;
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

    document.getElementById('product-dropzone')?.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-file-reset')) document.getElementById('product-image-input').click();
    });
    document.getElementById('edit-product-dropzone')?.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-file-reset')) document.getElementById('edit-product-image-input').click();
    });

    document.getElementById('product-image-input')?.addEventListener('change', function() {
        window.updateUploadUI('product-dropzone', 'product-preview-text', 'product-file-name', this.files);
    });
    document.getElementById('edit-product-image-input')?.addEventListener('change', function() {
        window.updateUploadUI('edit-product-dropzone', 'edit-product-preview-text', 'edit-product-file-name', this.files);
    });

    document.getElementById('reset-product-upload')?.addEventListener('click', (e) => {
        window.resetUpload(e, 'product-image-input', 'product-dropzone', 'product-preview-text');
    });
    document.getElementById('reset-edit-upload')?.addEventListener('click', (e) => {
        window.resetUpload(e, 'edit-product-image-input', 'edit-product-dropzone', 'edit-product-preview-text');
    });

    window.resetUpload = function(event, inputId, dropzoneId, previewId) {
        event.stopPropagation();
        const input = document.getElementById(inputId);
        const dropzone = document.getElementById(dropzoneId);
        const preview = document.getElementById(previewId);

        if (input) input.value = "";
        if (preview) preview.style.display = 'none';
        if (dropzone) {
            dropzone.style.borderColor = '#cbd5e1';
            dropzone.style.background = '#f8fafc';
        }
    };

    window.updateUploadUI = function(dropzoneId, previewId, nameId, files) {
        const preview = document.getElementById(previewId);
        const nameDisp = document.getElementById(nameId);
        const dropzone = document.getElementById(dropzoneId);

        if (files && files[0]) {
            if (preview) preview.style.display = 'flex';
            if (nameDisp) nameDisp.innerText = files[0].name;
            if (dropzone) {
                dropzone.style.borderColor = '#10b981';
                dropzone.style.background = '#f0fdf4';
            }
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
const closeButtons = document.querySelectorAll('.close-modal-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
let assetIdToDelete = null;

document.addEventListener('click', function(e) {
    const deleteBtn = e.target.closest('.dropdown-item.delete');
    
    if (deleteBtn) {
        const row = deleteBtn.closest('tr');
        assetIdToDelete = row.getAttribute('data-id');
        
        const assetName = row.cells[2].innerText; 
        const deleteNameDisplay = document.getElementById('delete-asset-name');
        if (deleteNameDisplay) deleteNameDisplay.innerText = assetName;

        deleteModal.classList.remove('hidden');
    }
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        assetIdToDelete = null;
    });
});

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
        if (assetIdToDelete) {
            console.log("Processing deletion for Asset ID:", assetIdToDelete);
            deleteModal.classList.add('hidden');
        }
    });
}

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