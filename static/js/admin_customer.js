/*============= START OF SAFE HELPERS =============*/
function safeText(el, fallback = "") {
    return el ? el.innerText : fallback;
}

function safeDataset(btn, key, fallback = "") {
    return (btn && btn.dataset && btn.dataset[key]) ? btn.dataset[key] : fallback;
}
/*============= END OF SAFE HELPERS =============*/


/*============= MODAL FUNCTIONS =============*/
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.remove('hidden');
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.add('hidden');
}

function openProfileModal(btn) {
    const modal = document.getElementById('profileModal');
    if (!modal || !btn) return;

    const modalName = document.getElementById('modalName');
    const modalID = document.getElementById('modalID');
    const modalPhone = document.getElementById('modalPhone');
    const modalAddress = document.getElementById('modalAddress');

    const avatarImg = document.getElementById('modalAvatarImg');
    const avatarFallback = document.getElementById('modalAvatarFallback');

    const idImg = document.getElementById('modalIDImg');
    const idFallback = document.getElementById('modalIDFallback');

    const id = btn.dataset.id;
    const name = btn.dataset.name;
    const phone = btn.dataset.phone;
    const address = btn.dataset.address;
    const avatar = btn.dataset.avatar;
    const validId = btn.dataset.idimg;

    modal.classList.remove('hidden');

    modalName.innerText = name || "N/A";
    modalID.innerText = id ? "Customer ID: " + id : "N/A";
    modalPhone.innerText = phone || "N/A";
    modalAddress.innerText = address || "N/A";

    // Avatar
    if (avatar) {
        avatarImg.src = avatar.startsWith('/') ? avatar : `/static/${avatar}`;
        avatarImg.style.display = "block";
        avatarFallback.style.display = "none";
    } else {
        avatarImg.style.display = "none";
        avatarFallback.style.display = "flex";
    }

    // ID
    if (validId) {
        idImg.src = validId;
        idImg.style.display = "block";
        idFallback.style.display = "none";
    } else {
        idImg.style.display = "none";
        idFallback.style.display = "flex";
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.add('hidden');
}

/*============= START OF EDIT MODAL =============*/
async function openEditModal(btn) {
    const modal = document.getElementById('editCustomerModal');
    const customerId = btn.dataset.id;
    if (!modal || !customerId) return;

    try {
        // 1. Fetch data from your updated API
        const response = await fetch(`/admin/get_customer/${customerId}`);
        const result = await response.json();

        if (result.status === "success") {
            const customer = result.data;

            // 2. Map Text/Form Data
            document.getElementById('edit_customer_id').value = customer.id || "";
            document.getElementById('edit_full_name').value = customer.full_name || "";
            document.getElementById('edit_contact_number').value = customer.phone || "";
            document.getElementById('edit_home_address').value = customer.address || "";
            
            // 3. Map Birthday and Gender
            const bdayField = document.getElementById('edit_birthday');
            const genderField = document.getElementById('edit_gender');
            
            if (bdayField) bdayField.value = customer.birthday || "";
            if (genderField) genderField.value = customer.gender || "";

            // 4. Handle Image UI Design
            const idImgPath = customer.valid_id_path;
            const dropzone = document.getElementById('edit-id-dropzone');
            const previewContainer = document.getElementById('edit-id-preview-text');
            const previewImg = document.getElementById('edit-id-img-preview');

            if (idImgPath) {
                previewImg.src = idImgPath;
                previewContainer.style.display = 'flex';
                
                if (dropzone) {
                    dropzone.classList.add('has-file');
                    dropzone.style.pointerEvents = "auto"; 
                }
            } else {
                previewImg.src = "#";
                previewContainer.style.display = 'none';
                if (dropzone) dropzone.classList.remove('has-file');
            }

            // 5. Reveal Modal
            modal.classList.remove('hidden');
        } else {
            console.error("API Error:", result.message);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editCustomerModal');
    if (!modal) return;

    modal.classList.add('hidden');

    const form = document.getElementById('editCustomerForm');
    if (form) form.reset();

    // Reset Image UI
    const dropzone = document.getElementById('edit-id-dropzone');
    const preview = document.getElementById('edit-id-preview-text');
    if (dropzone) dropzone.classList.remove('has-file');
    if (preview) preview.style.display = "none";
}

/*============= END OF EDIT MODAL =============*/

/*============= UPLOAD =============*/
function updateUploadUI(dropzoneId, previewId, nameId, input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const preview = document.getElementById(previewId);
    const nameEl = document.getElementById(nameId);
    const dropzone = document.getElementById(dropzoneId);

    if (dropzone) {
        dropzone.classList.add('has-file');
        dropzone.style.pointerEvents = "none";
    }

    if (nameEl) nameEl.innerText = file.name;

    if (preview) {
        preview.style.display = 'flex';

        const img = preview.querySelector('img');
        const reader = new FileReader();

        reader.onload = e => {
            if (img) img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }
}

function resetUpload(event, inputId, dropzoneId, previewId) {
    if (event) event.stopPropagation();

    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(dropzoneId);
    const preview = document.getElementById(previewId);

    if (input) input.value = "";

    if (preview) preview.style.display = "none";

    if (dropzone) {
        dropzone.classList.remove('has-file');
        dropzone.style.pointerEvents = "auto";
    }
}

function enableDragAndDrop(dropzoneId, inputId) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);

    if (!dropzone || !input) return;

    dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });
}

/*============= LIGHTBOX =============*/
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

/*============= RESET MODAL =============*/
function openResetModal(name) {
    const modal = document.getElementById('resetModal');
    if (modal) {
        document.getElementById('resetName').innerText = name;
        modal.classList.remove('hidden');
    }
}

function closeResetModal() {
    const modal = document.getElementById('resetModal');
    if (modal) modal.classList.add('hidden');
}

/*============= SINGLE DOM READY BLOCK (IMPORTANT) =============*/
document.addEventListener('DOMContentLoaded', () => {

    // OPEN REGISTER
    const regBtn = document.querySelector('.register-asset-btn');
    if (regBtn) {
        regBtn.addEventListener('click', e => {
            e.preventDefault();
            openRegisterModal();
        });
    }

    // CLOSE MODALS
    document.querySelectorAll('.modal-close, .btn-medical-outline').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.medical-modal-overlay');
            if (modal) modal.classList.add('hidden');
        });
    });

    // CLICK TO UPLOAD
    document.querySelectorAll('.upload-container').forEach(dropzone => {
        dropzone.addEventListener('click', () => {
            const input = dropzone.querySelector('input[type="file"]');
            if (input) input.click();
        });
    });

    // FILE CHANGE
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function () {
            if (this.id === 'id-upload') {
                updateUploadUI('id-dropzone', 'id-preview-text', 'file-name-display', this);
            }

            if (this.id === 'edit-id-upload') {
                // Pass 'edit-file-name' or null if you don't have a name display for edit
                updateUploadUI('edit-id-dropzone', 'edit-id-preview-text', 'edit-file-name', this);
            }
        });
    });

    // RESET BUTTONS
    document.querySelectorAll('.btn-file-reset').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            resetUpload(e, btn.dataset.input, btn.dataset.dropzone, btn.dataset.preview);
        });
    });

    // DRAG & DROP
    enableDragAndDrop('id-dropzone', 'id-upload');
    enableDragAndDrop('edit-id-dropzone', 'edit-id-upload');

    // TABLE ACTIONS
    const table = document.getElementById('customerTableBody');
    if (table) {
        table.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;

            if (btn.classList.contains('logs')) openProfileModal(btn);

            if (btn.classList.contains('edit')) openEditModal(btn); 
        });
    }

    // SEARCH
    const search = document.getElementById('customerSearch');
    if (search) {
        search.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#customerTableBody tr').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

});