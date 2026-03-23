/*============= START OF MODAL TOGGLES =============*/
function openRegisterModal() { 
    const modal = document.getElementById('registerModal');
    if(modal) modal.classList.remove('hidden'); 
}

function closeRegisterModal() { 
    const modal = document.getElementById('registerModal');
    if(modal) modal.classList.add('hidden'); 
}

function openProfileModal(name, id) {
    const modal = document.getElementById('profileModal');
    if(modal) {
        document.getElementById('modalName').innerText = name;
        document.getElementById('modalID').innerText = "ID: " + id;
        modal.classList.remove('hidden');
    }
}

function closeProfileModal() { 
    const modal = document.getElementById('profileModal');
    if(modal) modal.classList.add('hidden'); 
}

function openResetModal(name) { 
    const modal = document.getElementById('resetModal');
    if(modal) {
        document.getElementById('resetName').innerText = name; 
        modal.classList.remove('hidden'); 
    }
}

function closeResetModal() { 
    const modal = document.getElementById('resetModal');
    if(modal) modal.classList.add('hidden'); 
}
/*============= END OF MODAL TOGGLES =============*/


/*============= START OF SEARCH LOGIC =============*/
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#customerTableBody tr');
            rows.forEach(row => { 
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; 
            });
        });
    }
});
/*============= END OF SEARCH LOGIC =============*/


/*============= START OF UPLOAD LOGIC =============*/
function resetUpload(event, inputId, dropzoneId, previewId) {
    event.stopPropagation();
    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(dropzoneId);
    const preview = document.getElementById(previewId);
    const previewContainer = document.getElementById('registration-id-preview-container');

    if(input) input.value = "";
    if(preview) preview.style.display = 'none';
    if(previewContainer) previewContainer.style.display = 'none'; 

    if(dropzone) {
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
    }
}

function updateUploadUI(dropzoneId, previewId, nameId, input) {
    const files = input.files;
    if (files && files[0]) {
        const previewEl = document.getElementById(previewId);
        const nameEl = document.getElementById(nameId);
        const dropzone = document.getElementById(dropzoneId);

        if(previewEl) previewEl.style.display = 'flex';
        if(nameEl) nameEl.innerText = files[0].name;
        if(dropzone) {
            dropzone.style.borderColor = '#10b981';
            dropzone.style.background = '#f0fdf4';
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const previewImg = document.getElementById('registration-id-img');
            const previewContainer = document.getElementById('registration-id-preview-container');
            if(previewImg) previewImg.src = e.target.result;
            if(previewContainer) previewContainer.style.display = 'block';
        }
        reader.readAsDataURL(files[0]);
    }
}
/*============= END OF UPLOAD LOGIC =============*/


/*============= START OF PAGINATION =============*/
document.addEventListener('DOMContentLoaded', () => {
    const rowSelect = document.getElementById('row-limit-select');
    const tableBody = document.getElementById('customerTableBody'); 
    const paginationContainer = document.querySelector('.pagination-controls');
    let currentPage = 1;

    function updateTableDisplay() {
        if(!tableBody || !rowSelect) return;
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const limit = parseInt(rowSelect.value);
        const totalPages = Math.ceil(rows.length / limit);
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
        if(!paginationContainer) return;
        const totalPages = Math.ceil(totalItems / limit);
        paginationContainer.innerHTML = ''; 
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pag-btn';
        prevBtn.disabled = currentPage === 1;
        prevBtn.innerHTML = '<span class="material-symbols-rounded">chevron_left</span>';
        prevBtn.onclick = () => { if(currentPage > 1) { currentPage--; updateTableDisplay(); }};
        paginationContainer.appendChild(prevBtn);
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `pag-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.onclick = () => { currentPage = i; updateTableDisplay(); };
                paginationContainer.appendChild(pageBtn);
            }
        }
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pag-btn';
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        nextBtn.innerHTML = '<span class="material-symbols-rounded">chevron_right</span>';
        nextBtn.onclick = () => { if(currentPage < totalPages) { currentPage++; updateTableDisplay(); }};
        paginationContainer.appendChild(nextBtn);
    }

    function updatePaginationInfo(start, end, total) {
        const infoLabel = document.querySelector('.pagination-info');
        if (infoLabel) {
            infoLabel.textContent = total === 0 ? `Showing 0 to 0 of 0 entries` : `Showing ${start} to ${end} of ${total} entries`;
        }
    }

    if (rowSelect) { rowSelect.addEventListener('change', () => { currentPage = 1; updateTableDisplay(); }); }
    updateTableDisplay();
});
/*============= END OF PAGINATION =============*/


/*============= START OF CSP EVENT BINDING =============*/
document.addEventListener('DOMContentLoaded', () => {
    // 1. Open Register Modal
    const regBtn = document.querySelector('.register-asset-btn');
    if(regBtn) regBtn.addEventListener('click', openRegisterModal);

    // 2. Close Buttons (General)
    document.querySelectorAll('.modal-close, .btn-medical-outline').forEach(btn => {
        btn.addEventListener('click', () => {
            closeRegisterModal();
            closeProfileModal();
            closeResetModal();
        });
    });

    // 3. Table Buttons (Visibility & Reset)
    const tableBody = document.getElementById('customerTableBody');
    if(tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if(!btn) return;

            // Get data from the row
            const row = btn.closest('tr');
            const name = row.querySelector('strong').innerText;
            const id = row.cells[1].innerText;

            if(btn.classList.contains('logs')) {
                openProfileModal(name, id);
            } else if(btn.classList.contains('edit')) {
                openResetModal(name);
            }
        });
    }

    // 4. File Upload Triggers
    const dropzone = document.getElementById('id-dropzone');
    const fileInput = document.getElementById('id-upload');
    if(dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', function() {
            updateUploadUI('id-dropzone', 'id-preview-text', 'file-name-display', this);
        });
    }

    // 5. File Reset Trigger
    const resetBtn = document.querySelector('.btn-file-reset');
    if(resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            resetUpload(e, 'id-upload', 'id-dropzone', 'id-preview-text');
        });
    }
});
/*============= END OF CSP EVENT BINDING =============*/