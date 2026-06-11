/*============= START OF SAFE HELPERS =============*/
function safeText(el, fallback = "") {
    return el ? el.innerText : fallback;
}

function safeDataset(btn, key, fallback = "") {
    return (btn && btn.dataset && btn.dataset[key]) ? btn.dataset[key] : fallback;
}
/*============= END OF SAFE HELPERS =============*/


/*============= START OF MODAL FUNCTIONS =============*/
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.remove('hidden');
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.add('hidden');
}
/*============= END OF MODAL FUNCTIONS =============*/

/*============= START OF PROFILE MODAL FUNCTIONS =============*/
function openProfileModal(btn) {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    const modalName = document.getElementById('modalName');
    const modalPhone = document.getElementById('modalPhone');
    const modalAddress = document.getElementById('modalAddress');
    const modalBirthday = document.getElementById('modalBirthday');
    const modalGender = document.getElementById('modalGender');

    /* ===== START OF NEW ID ELEMENTS ===== */
    const primaryImg = document.getElementById('modalPrimaryIDImg');
    const primaryFallback = document.getElementById('modalPrimaryIDFallback');
    const secondaryImg = document.getElementById('modalSecondaryIDImg');
    const secondaryFallback = document.getElementById('modalSecondaryIDFallback');
    const primaryType = document.getElementById('modalPrimaryIDType');
    const secondaryType = document.getElementById('modalSecondaryIDType');
    /* ===== END OF NEW ID ELEMENTS ===== */

    const name = btn.dataset.name;
    const phone = btn.dataset.phone;
    const address = btn.dataset.address;
    const birthday = btn.dataset.birthday;
    const gender = btn.dataset.gender;

    /* ===== START OF NEW DATASETS ===== */
    const primaryIdUrl = btn.dataset.primaryid;
    const secondaryIdUrl = btn.dataset.secondaryid;
    const primaryIdType = btn.dataset.primarytype;
    const secondaryIdType = btn.dataset.secondarytype;
    /* ===== END OF NEW DATASETS ===== */

    // ✅ FIX: handle "None", "null", empty
    if (modalName) modalName.innerHTML = (name && name !== "None" && name !== "null") ? name : '<span class="na-text">N/A</span>';
    if (modalPhone) modalPhone.innerHTML = (phone && phone !== "None" && phone !== "null") ? phone : '<span class="na-text">N/A</span>';
    if (modalAddress) modalAddress.innerHTML = (address && address !== "None" && address !== "null") ? address : '<span class="na-text">N/A</span>';
    if (modalBirthday) modalBirthday.innerHTML = (birthday && birthday !== "None" && birthday !== "null") ? birthday : '<span class="na-text">N/A</span>';
    if (modalGender) modalGender.innerHTML = (gender && gender !== "None" && gender !== "null") ? gender : '<span class="na-text">N/A</span>';

    /* ===== START PRIMARY ID DISPLAY ===== */
    if (primaryImg && primaryFallback) {
        if (primaryIdUrl && primaryIdUrl.trim() !== "" && primaryIdUrl !== "None" && primaryIdUrl !== "null") {
            primaryImg.src = primaryIdUrl;
            primaryImg.style.display = "block";
            primaryFallback.style.display = "none";
        } else {
            primaryImg.style.display = "none";
            primaryFallback.style.display = "flex";
        }
    }
    /* ===== END PRIMARY ID DISPLAY ===== */

    /* ===== START SECONDARY ID DISPLAY ===== */
    if (secondaryImg && secondaryFallback) {
        if (secondaryIdUrl && secondaryIdUrl.trim() !== "" && secondaryIdUrl !== "None" && secondaryIdUrl !== "null") {
            secondaryImg.src = secondaryIdUrl;
            secondaryImg.style.display = "block";
            secondaryFallback.style.display = "none";
        } else {
            secondaryImg.style.display = "none";
            secondaryFallback.style.display = "flex";
        }
    }
    /* ===== END SECONDARY ID DISPLAY ===== */

    /* ===== START ID TYPES ===== */
    if (primaryType) primaryType.innerHTML = (primaryIdType && primaryIdType !== "None" && primaryIdType !== "null") ? primaryIdType : '<span class="na-text">N/A</span>';
    if (secondaryType) secondaryType.innerHTML = (secondaryIdType && secondaryIdType !== "None" && secondaryIdType !== "null") ? secondaryIdType : '<span class="na-text">N/A</span>';
    /* ===== END ID TYPES ===== */

    modal.classList.remove('hidden');
}


function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    modal.classList.add('hidden');

    ['modalPrimaryIDImg','modalSecondaryIDImg'].forEach(id => {
        const img = document.getElementById(id);
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
    });

    ['modalPrimaryIDFallback','modalSecondaryIDFallback'].forEach(id => {
        const fallback = document.getElementById(id);
        if (fallback) fallback.style.display = 'flex';
    });
}
/*============= END OF PROFILE MODAL FUNCTIONS =============*/

async function openEditModal(btn) {
    const modal = document.getElementById('editCustomerModal');
    const customerId = btn.dataset.id;
    if (!modal || !customerId) return;

    try {
        const response = await fetch(`/admin/get_customer/${customerId}`);
        const result = await response.json();

        if (result.status === "success") {
            const customer = result.data;

            // Hidden ID field
            const idField = document.getElementById('edit_customer_id');
            if (idField) idField.value = customer.id || "";

            // Profile fields with safe checks to prevent script crashes
            const fNameField = document.getElementById('edit_first_name');
            if (fNameField) fNameField.value = customer.first_name || "";
            
            const lNameField = document.getElementById('edit_last_name');
            if (lNameField) lNameField.value = customer.last_name || "";
            
            const contactField = document.getElementById('edit_contact_number');
            if (contactField) contactField.value = customer.contact_number || "";

            const secContactField = document.getElementById('edit_secondary_contact_number');
            if (secContactField) secContactField.value = customer.secondary_contact_number || "";
            
            const addressField = document.getElementById('edit_home_address');
            if (addressField) addressField.value = customer.home_address || "";

            // Gender select
            const genderField = document.getElementById('edit_gender');
            if (genderField && customer.gender) {
                const genderValue = (customer.gender || "").toLowerCase();
                genderField.value = genderValue;
            }

            // Primary / Secondary ID types
            const pIdTypeField = document.getElementById('edit_primary_id_type');
            if (pIdTypeField) pIdTypeField.value = customer.primary_id_type || "";
            
            const sIdTypeField = document.getElementById('edit_secondary_id_type');
            if (sIdTypeField) sIdTypeField.value = customer.secondary_id_type || "";

            // Primary ID preview
            const previewImg = document.getElementById('edit-id-img-preview');
            const dropzone = document.getElementById('edit-id-dropzone');
            const previewContainer = document.getElementById('edit-id-preview-text');
            if (customer.valid_id_path && previewImg) {
                previewImg.src = customer.valid_id_path;
                if (previewContainer) previewContainer.style.display = 'block';
                if (dropzone) dropzone.classList.add('has-file');
                const placeholder = dropzone.querySelector('#edit-id-placeholder-content');
                if (placeholder) placeholder.style.display = 'none';
            } else {
                // Reset to default empty state if there is no path
                if (previewImg) previewImg.src = '#';
                if (previewContainer) previewContainer.style.display = 'none';
                if (dropzone) dropzone.classList.remove('has-file');
                const placeholder = dropzone.querySelector('#edit-id-placeholder-content');
                if (placeholder) placeholder.style.display = 'block';
            }

            // Secondary ID preview
            const docImg = document.getElementById('edit-doc-img-preview');
            const docDropzone = document.getElementById('edit-doc-dropzone');
            const docPreview = document.getElementById('edit-doc-preview-text');
            if (customer.secondary_id_path && docImg) {
                docImg.src = customer.secondary_id_path;
                if (docPreview) docPreview.style.display = 'block';
                if (docDropzone) docDropzone.classList.add('has-file');
                const placeholder = docDropzone.querySelector('#edit-doc-placeholder-content');
                if (placeholder) placeholder.style.display = 'none';
            } else {
                // Reset to default empty state if there is no path
                if (docImg) docImg.src = '#';
                if (docPreview) docPreview.style.display = 'none';
                if (docDropzone) docDropzone.classList.remove('has-file');
                const placeholder = docDropzone.querySelector('#edit-doc-placeholder-content');
                if (placeholder) placeholder.style.display = 'block';
            }

            modal.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editCustomerModal');
    if (modal) modal.classList.add('hidden');
}


/*============= START OF UPLOAD LOGIC FUNCTIONS =============*/
function updateUploadUI(dropzoneId, previewId, input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const preview = document.getElementById(previewId);
    const dropzone = document.getElementById(dropzoneId);

    if (preview && file.type.startsWith('image/')) {
        const reader = new FileReader();
        const img = preview.querySelector('img');

        reader.onload = e => {
            if (img) img.src = e.target.result;
            preview.style.display = 'block';
            if (dropzone) dropzone.classList.add('has-file');
            
            const placeholder = dropzone.querySelector('div[id$="-placeholder-content"]');
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function enableDragAndDrop(dropzoneId, inputId, previewId) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);

    if (!dropzone || !input) return;

    dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.style.borderColor = "#3b82f6";
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = "#e2e8f0";
    });

    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.style.borderColor = "#e2e8f0";
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            updateUploadUI(dropzoneId, previewId, input);
        }
    });
}
/*============= END OF UPLOAD LOGIC FUNCTIONS =============*/


/*============= START OF LIGHTBOX FUNCTIONS =============*/
function openLightbox() {
    const img = document.getElementById('modalIDImg');
    const lightbox = document.getElementById('idLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    if (img && img.src) {
        lightboxImg.src = img.src;
        lightbox.classList.remove('hidden');
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('idLightbox');
    if (lightbox) lightbox.classList.add('hidden');
}
/*============= END OF LIGHTBOX FUNCTIONS =============*/


/*============= START OF SINGLE DOM READY BLOCK =============*/
document.addEventListener('DOMContentLoaded', () => {

    // 1. REGISTRATION MODAL TRIGGER
    const regBtn = document.querySelector('.register-asset-btn');
    if (regBtn) {
        regBtn.addEventListener('click', e => {
            e.preventDefault();
            openRegisterModal();
        });
    }

    // 2. CLOSE ALL MODALS (General)
    document.querySelectorAll('.modal-close, .btn-medical-outline').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.medical-modal-overlay');
            if (modal) modal.classList.add('hidden');
        });
    });

    // 3. EDIT MODAL CANCEL
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            closeEditModal();
        });
    }

    // 4. CLICK TO UPLOAD
    document.querySelectorAll('.upload-container').forEach(dropzone => {
        dropzone.addEventListener('click', (e) => {
            if (e.target.closest('.btn-file-reset')) return;

            let previewId;
            const input = dropzone.querySelector('input[type="file"]');
            if (!input) return;

            if (input.id === 'id-upload') previewId = 'id-preview-text';
            else if (input.id === 'doc-upload') previewId = 'doc-preview-text';
            else if (input.id === 'edit-id-upload') previewId = 'edit-id-preview-text';
            else if (input.id === 'edit-doc-upload') previewId = 'edit-doc-preview-text';

            const previewBox = document.getElementById(previewId);
            if (previewBox && previewBox.style.display === 'block') {
                e.preventDefault();
                return;
            }
            input.click();
        });
    });

    // 5. FILE CHANGE HANDLERS
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;

            let previewId;
            if (this.id === 'id-upload') previewId = 'id-preview-text';
            else if (this.id === 'doc-upload') previewId = 'doc-preview-text';
            else if (this.id === 'edit-id-upload') previewId = 'edit-id-preview-text';
            else if (this.id === 'edit-doc-upload') previewId = 'edit-doc-preview-text';

            const reader = new FileReader();
            reader.onload = (e) => {
                const previewBox = document.getElementById(previewId);
                if (previewBox) {
                    const img = previewBox.querySelector('img');
                    if (img) img.src = e.target.result;
                    previewBox.style.display = 'block';
                    
                    const container = this.closest('.upload-container');
                    const placeholder = container.querySelector('div[id$="-placeholder-content"]');
                    if (placeholder) placeholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        });
    });

    // 6. RESET / REMOVE IMAGE ACTION
    document.querySelectorAll('.btn-file-reset').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            const inputId = btn.dataset.input;
            const dropzoneId = btn.dataset.dropzone;
            const previewId = btn.dataset.preview;

            const input = document.getElementById(inputId);
            const dropzone = document.getElementById(dropzoneId);
            const preview = document.getElementById(previewId);

            if (input) input.value = ""; // Clear file input

            if (dropzone) dropzone.classList.remove('has-file'); // Remove "has-file" class

            // Show placeholder
            const placeholder = dropzone ? dropzone.querySelector(`div[id$="-placeholder-content"]`) : null;
            if (placeholder) placeholder.style.display = 'block';

            // Hide preview
            if (preview) {
                const img = preview.querySelector('img');
                if (img) img.src = "#"; // reset image
                preview.style.display = 'none';
            }

            // Create or set hidden input so server knows to delete the file
            let removeInputName = '';
            if (inputId === 'edit-id-upload') removeInputName = 'remove_valid_id';
            else if (inputId === 'edit-doc-upload') removeInputName = 'remove_secondary_id';

            if (removeInputName) {
                let form = btn.closest('form');
                let removeInput = form.querySelector(`input[name="${removeInputName}"]`);
                if (!removeInput) {
                    removeInput = document.createElement('input');
                    removeInput.type = 'hidden';
                    removeInput.name = removeInputName;
                    form.appendChild(removeInput);
                }
                removeInput.value = "true";
            }
        });
    });

    // 7. INITIALIZE DRAG & DROP
    enableDragAndDrop('id-dropzone', 'id-upload', 'id-placeholder-content');
    enableDragAndDrop('doc-dropzone', 'doc-upload', 'doc-placeholder-content');
    enableDragAndDrop('edit-id-dropzone', 'edit-id-upload', 'edit-id-preview-text');
    enableDragAndDrop('edit-doc-dropzone', 'edit-doc-upload', 'edit-doc-preview-text');

    // 8. ✅ TABLE CLICKS (FIXED FOR TARGET SELECTION COLLISIONS)
    const tableBody = document.getElementById('customerTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', e => {
            // Find the closest interactive actionable element
            const targetElement = e.target.closest('.asset-action-btn');
            if (!targetElement) return;

            // The "logs" class logic has been removed so it no longer triggers a modal
            if (targetElement.classList.contains('edit')) {
                openEditModal(targetElement);
            }
            // If you have other buttons like 'logs' that should do nothing, 
            // you can simply leave them out of this if/else block.
        });
    }
});
/*============= END OF SINGLE DOM READY BLOCK =============*/


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