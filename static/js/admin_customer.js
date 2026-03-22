
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const notifBtn = document.getElementById('notif-btn');
const notifDropdown = document.getElementById('notif-dropdown');
const settingsBtn = document.getElementById('settings-toggle-btn');
const settingsPopup = document.getElementById('settings-menu-popup');

function toggleDropdown(dropdown) {
    document.querySelectorAll('.header-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });
    dropdown.classList.toggle('active');
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
    settingsPopup.classList.toggle('hidden');
});

window.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target)) profileDropdown.classList.remove('active');
    if (!notifBtn.contains(e.target)) notifDropdown.classList.remove('active');

    if (!settingsPopup.contains(e.target) && e.target !== settingsBtn) {
        settingsPopup.classList.add('hidden');
    }
});

// --- UPLOAD LOGIC ---
function handleFileUpload(input) {
    const display = document.getElementById('id-preview-text');
    const nameSpan = document.getElementById('file-name-display');
    if (input.files && input.files[0]) {
        display.style.display = 'block';
        nameSpan.innerText = input.files[0].name;
    }
}

// --- MODAL TOGGLES ---
function openRegisterModal() { document.getElementById('registerModal').classList.remove('hidden'); }
function closeRegisterModal() { document.getElementById('registerModal').classList.add('hidden'); }
function openProfileModal(name, id) {
    document.getElementById('modalName').innerText = name;
    document.getElementById('modalID').innerText = "ID: " + id;
    document.getElementById('profileModal').classList.remove('hidden');
}
function closeProfileModal() { document.getElementById('profileModal').classList.add('hidden'); }
function openResetModal(name) { document.getElementById('resetName').innerText = name; document.getElementById('resetModal').classList.remove('hidden'); }
function closeResetModal() { document.getElementById('resetModal').classList.add('hidden'); }

// --- SEARCH LOGIC ---
document.getElementById('customerSearch').addEventListener('input', function (e) {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#customerTableBody tr');
    rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; });
});

function handleProductUpload(input) {
    const previewContainer = document.getElementById('product-preview-text');
    const fileNameDisplay = document.getElementById('product-file-name');

    if (input.files && input.files[0]) {
        previewContainer.style.display = 'block';
        fileNameDisplay.innerText = input.files[0].name;

        input.parentElement.style.borderColor = '#10b981';
    }
}

// --- REUSABLE RESET LOGIC ---
function resetUpload(event, inputId, dropzoneId, previewId) {
    event.stopPropagation();

    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(dropzoneId);
    const preview = document.getElementById(previewId);
    const previewContainer = document.getElementById('registration-id-preview-container');

    input.value = "";
    preview.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'none'; // Hide image preview

    dropzone.style.borderColor = '#cbd5e1';
    dropzone.style.background = '#f8fafc';
}
// --- UPDATED UI LOGIC ---
function updateUploadUI(dropzoneId, previewId, nameId, input) {
    const files = input.files;
    if (files && files[0]) {
        // Handle Text & Colors
        document.getElementById(previewId).style.display = 'flex';
        document.getElementById(nameId).innerText = files[0].name;
        const dropzone = document.getElementById(dropzoneId);
        dropzone.style.borderColor = '#10b981';
        dropzone.style.background = '#f0fdf4';

        // Handle Image Preview
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewImg = document.getElementById('registration-id-img');
            const previewContainer = document.getElementById('registration-id-preview-container');
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
        }
        reader.readAsDataURL(files[0]);
    }
}

// --- REUSABLE DRAG & DROP INITIALIZER ---
function initDragAndDrop(dropzoneId, inputId, previewId, nameId) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, e => { e.preventDefault(); e.stopPropagation(); });
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
            updateUploadUI(dropzoneId, previewId, nameId, files);
        }
    });
}

// Initialize for ID
initDragAndDrop('id-dropzone', 'id-upload', 'id-preview-text', 'file-name-display');

function previewFile(input, targetImageId) {
    const file = input.files[0];
    const previewImg = document.getElementById(targetImageId);
    const container = previewImg.parentElement;

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            // Set the src of the <img> to the file's data
            previewImg.src = e.target.result;
            // Show the container
            container.style.display = 'block';
        }

        reader.readAsDataURL(file);
    }
}

// 1. Immediately apply the saved state before the page renders
const sidebarState = localStorage.getItem('sidebar-collapsed');
const checkbox = document.getElementById('sidebar-state');

// If 'true', we want it unchecked (collapsed). 
// If 'false' or null, we want it checked (expanded/default).
checkbox.checked = sidebarState !== 'true';

// 2. Listen for changes to save the preference
checkbox.addEventListener('change', function() {
    // Save 'true' if the sidebar is now collapsed (unchecked)
    localStorage.setItem('sidebar-collapsed', !this.checked);
});



/*============= START OF PAGINATION =============*/
document.addEventListener('DOMContentLoaded', () => {
    const rowSelect = document.getElementById('row-limit-select');
    const tableBody = document.getElementById('customerTableBody'); // Specific to your Patient Table
    const paginationContainer = document.querySelector('.pagination-controls');
    
    let currentPage = 1;

    function updateTableDisplay() {
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

