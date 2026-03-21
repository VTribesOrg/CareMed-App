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

    // 4. Modal Handlers (Attached to window for HTML accessibility)
    window.openAssetModal = function() {
        regModal?.classList.remove('hidden');
    };

    window.closeAssetModal = function() {
        regModal?.classList.add('hidden');
    };

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

    window.openHistoryModal = function(button) {
        const row = button.closest('tr');
        if (!row) return;

        const assetTag = row.cells[1].innerText;
        const equipmentName = row.cells[2].innerText;

        document.getElementById('history-asset-id').innerText = `${equipmentName} • ID: ${assetTag}`;
        histModal?.classList.remove('hidden');
    };

    window.closeHistoryModal = function() {
        histModal?.classList.add('hidden');
    };

    // --- NEW EVENT LISTENERS FOR CSP COMPLIANCE ---

    // Bind Close Buttons for All Modals
    document.querySelectorAll('.close-reg-modal').forEach(btn => btn.addEventListener('click', window.closeAssetModal));
    document.querySelectorAll('.close-edit-modal').forEach(btn => btn.addEventListener('click', window.closeEditModal));
    document.querySelectorAll('.close-history-modal').forEach(btn => btn.addEventListener('click', window.closeHistoryModal));

    // Bind Add Equipment Button
    addEquipmentBtn?.addEventListener('click', window.openAssetModal);

    // Bind Print Button
    document.getElementById('btn-print-history')?.addEventListener('click', () => window.print());

    // Bind File Input Triggers (Clicking the dropzone opens the file browser)
    document.getElementById('product-dropzone')?.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-file-reset')) document.getElementById('product-image-input').click();
    });
    document.getElementById('edit-product-dropzone')?.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-file-reset')) document.getElementById('edit-product-image-input').click();
    });

    // Bind File Change Events
    document.getElementById('product-image-input')?.addEventListener('change', function() {
        window.updateUploadUI('product-dropzone', 'product-preview-text', 'product-file-name', this.files);
    });
    document.getElementById('edit-product-image-input')?.addEventListener('change', function() {
        window.updateUploadUI('edit-product-dropzone', 'edit-product-preview-text', 'edit-product-file-name', this.files);
    });

    // Bind Reset Buttons
    document.getElementById('reset-product-upload')?.addEventListener('click', (e) => {
        window.resetUpload(e, 'product-image-input', 'product-dropzone', 'product-preview-text');
    });
    document.getElementById('reset-edit-upload')?.addEventListener('click', (e) => {
        window.resetUpload(e, 'edit-product-image-input', 'edit-product-dropzone', 'edit-product-preview-text');
    });

    // 5. Image Upload & Drag/Drop Logic
    window.handleProductUpload = function(input) {
        const previewContainer = document.getElementById('product-preview-text');
        const fileNameDisplay = document.getElementById('product-file-name');

        if (input.files && input.files[0]) {
            if (previewContainer) previewContainer.style.display = 'block';
            if (fileNameDisplay) fileNameDisplay.innerText = input.files[0].name;
            input.parentElement.style.borderColor = '#10b981';
        }
    };

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

    function initDragAndDrop(dropzoneId, inputId, previewId, nameId) {
        const dropzone = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId);
        if (!dropzone || !input) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, e => { 
                e.preventDefault(); 
                e.stopPropagation(); 
            });
        });

        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, () => dropzone.classList.add('upload-hover'));
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, () => dropzone.classList.remove('upload-hover'));
        });

        dropzone.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                window.updateUploadUI(dropzoneId, previewId, nameId, files);
            }
        });
    }

    // Initialize drag and drop for both modals
    initDragAndDrop('product-dropzone', 'product-image-input', 'product-preview-text', 'product-file-name');
    initDragAndDrop('edit-product-dropzone', 'edit-product-image-input', 'edit-product-preview-text', 'edit-product-file-name');

    const inventoryTable = document.getElementById('inventory-table');

    if (inventoryTable) {
        inventoryTable.addEventListener('click', (e) => {
            // 1. Find if an action button was clicked
            const editBtn = e.target.closest('.asset-action-btn.edit');
            const logsBtn = e.target.closest('.asset-action-btn.logs');
            const deleteBtn = e.target.closest('.asset-action-btn.delete');

            // 2. Route to the correct function
            if (editBtn) {
                window.openEditModal(editBtn);
            } 
            else if (logsBtn) {
                window.openHistoryModal(logsBtn);
            } 
            else if (deleteBtn) {
                const row = deleteBtn.closest('tr');
                const assetTag = row.cells[1].innerText;
                if (confirm(`Are you sure you want to delete asset ${assetTag}?`)) {
                    console.log("Deleting...", assetTag);
                    // row.remove(); // Optional: remove from UI immediately
                }
            }
        });
    }

    
});

const rentModal = document.getElementById('rentAssetModal');
const rentBtns = document.querySelectorAll('.asset-action-btn.rent');

// 1. Open Modal Logic
rentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const equipmentName = btn.getAttribute('data-name') || "Equipment";
        const equipmentId = btn.getAttribute('data-id') || "";
        const rentNameDisplay = document.getElementById('rent-equipment-name');
        
        if (rentNameDisplay) {
            rentNameDisplay.textContent = `${equipmentName} (${equipmentId})`;
        }

        rentModal.classList.remove('hidden');
    });
});

// 2. Close Modal Logic (Delegation)
// This will now work because the elements have the 'close-rent-modal' class
rentModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-rent-modal') || 
        e.target.classList.contains('medical-modal-overlay')) {
        rentModal.classList.add('hidden');
    }
});

// 3. Calculation Logic
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


// Get Modal and Buttons
const addStockModal = document.getElementById('addStockModal');
const openStockBtns = document.querySelectorAll('.open-stock-modal');
const closeStockBtns = document.querySelectorAll('.close-stock-modal');

// Open Modal Logic
openStockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Logic to "find" the data from the row (Optional but recommended)
        // const itemName = btn.closest('.asset-row').querySelector('.asset-name').innerText;
        // document.getElementById('stock-equipment-name').innerText = itemName;

        addStockModal.classList.remove('hidden');
    });
});

// Close Modal Logic
closeStockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        addStockModal.classList.add('hidden');
    });
});