document.addEventListener('DOMContentLoaded', function() {
    const headerSelectAll = document.getElementById('select-all'); 
    const footerSelectAll = document.getElementById('footer-select-all'); 
    const sectionCheckboxes = document.querySelectorAll('.section-checkbox'); 
    const itemCheckboxes = document.querySelectorAll('.item-checkbox');
    const liveTotal = document.getElementById('live-total');
    const selectedCount = document.getElementById('selected-count');

    function calculateTotal() {
        let total = 0;
        let count = 0;
        itemCheckboxes.forEach(cb => {
            if (cb.checked) {
                const row = cb.closest('.cart-item-row');
                const basePrice = parseFloat(row.getAttribute('data-price')) || 0;
                
                // Find the quantity input inside this specific row
                const qtyInput = row.querySelector('.cart-qty-input');
                const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                
                total += basePrice * quantity;
                count++;
            }
        });
        
        if (liveTotal) liveTotal.innerText = total.toLocaleString();
        if (selectedCount) selectedCount.innerText = count;
    }

    function updateSectionHeaders() {
        sectionCheckboxes.forEach(header => {
            const sectionType = header.getAttribute('data-section');
            const items = document.querySelectorAll(`.${sectionType}-item`);
            const checkedItems = document.querySelectorAll(`.${sectionType}-item:checked`);
            
            header.checked = items.length > 0 && items.length === checkedItems.length;
        });
    }

    function updateGlobalToggles() {
        const allChecked = Array.from(itemCheckboxes).every(c => c.checked);
        if (headerSelectAll) headerSelectAll.checked = allChecked;
        if (footerSelectAll) footerSelectAll.checked = allChecked;
    }


    sectionCheckboxes.forEach(headerCheck => {
        headerCheck.addEventListener('change', function() {
            const sectionType = this.getAttribute('data-section');
            const items = document.querySelectorAll(`.${sectionType}-item`);
            
            items.forEach(item => {
                item.checked = this.checked;
            });
            
            updateGlobalToggles();
            calculateTotal();
        });
    });

    const masterToggles = [headerSelectAll, footerSelectAll];
    masterToggles.forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', function() {
                const isChecked = this.checked;
                
                itemCheckboxes.forEach(cb => cb.checked = isChecked);
                sectionCheckboxes.forEach(scb => scb.checked = isChecked);
                
                if (headerSelectAll) headerSelectAll.checked = isChecked;
                if (footerSelectAll) footerSelectAll.checked = isChecked;
                
                calculateTotal();
            });
        }
    });

    itemCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            updateSectionHeaders();
            updateGlobalToggles();
            calculateTotal();
        });
    });

    document.querySelectorAll('.cart-qty-input').forEach(input => {
        input.addEventListener('input', function() {
            calculateTotal(); 
        });

        input.addEventListener('blur', function() {
            if (this.value === '' || parseInt(this.value) < 1) {
                this.value = 1; 
                calculateTotal(); 

            }
        });
    });

    calculateTotal();
    updateSectionHeaders();
    updateGlobalToggles();


    /* --------------------------------------------------
        DROPDOWN & PROFILE UI
    -------------------------------------------------- */
    const trigger = document.getElementById("profileTrigger");
    const menu = document.getElementById("dropdownMenu");

    if (trigger && menu) {
        trigger.addEventListener("click", function (e) {
            e.stopPropagation();
            menu.classList.toggle("show");
        });
    }

    window.addEventListener("click", function (event) {
        if (!event.target.closest(".user-profile-widget")) {
            const dropdowns = document.getElementsByClassName("dropdown-menu");
            for (let i = 0; i < dropdowns.length; i++) {
                let openDropdown = dropdowns[i];
                if (openDropdown.classList.contains("show")) {
                    openDropdown.classList.remove("show");
                }
            }
        }
    });


    const aboutSection = document.querySelector('#about');
    const aboutNavLink = document.querySelector('a[href="#about"]');
    const observerOptions = { root: null, threshold: 0.6 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && aboutNavLink) {
                aboutNavLink.classList.add('active-link');
            } else if (aboutNavLink) {
                aboutNavLink.classList.remove('active-link');
            }
        });
    }, observerOptions);

    if (aboutSection) {
        observer.observe(aboutSection);
    }


    if (document.body.classList.contains("logged-in")) {
        document.querySelectorAll(".guest-only").forEach(el => el.style.display = "none");
    } else {
        document.querySelectorAll(".auth-only").forEach(el => el.style.display = "none");
    }

    const profileImages = document.querySelectorAll('.user-photo-img');
    profileImages.forEach(img => {
        img.onerror = function() {
            const container = this.parentElement;
            container.innerHTML = '<span class="material-symbols-outlined icon-placeholder">account_circle</span>';
            const placeholder = container.querySelector('.icon-placeholder');
            if (container.classList.contains('profile-avatar-large')) {
                placeholder.style.fontSize = "100px";
            } else {
                placeholder.style.fontSize = "38px";
            }
        };
    });

    const urlParams = new URLSearchParams(window.location.search);
    const addedId = urlParams.get('added_id');
    const addedType = urlParams.get('added_type');

    if (addedId && addedType) {
        const targetValue = `${addedId}:${addedType}`;
        
        const checkbox = document.querySelector(`input[name="selected_items"][value="${targetValue}"]`);
        
        if (checkbox) {
            checkbox.checked = true;

            checkbox.dispatchEvent(new Event('change', { bubbles: true }));

            checkbox.closest('.cart-item-row').scrollIntoView({ behavior: 'smooth', block: 'center' });

            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: cleanUrl}, '', cleanUrl);
        }
    }
});


function openRentalModal(itemId, currentDate, currentDuration) {
    const modal = document.getElementById('rentalModal');
    const form = document.getElementById('update-rental-form');
    
    form.action = `/user/update_rental/${itemId}`;
    
    document.getElementById('modal-start-date').value = currentDate;
    document.getElementById('modal-duration').value = currentDuration;
    
    modal.style.display = "flex";
}

function closeModal() {
    document.getElementById('rentalModal').style.display = "none";
}

window.onclick = function(event) {
    if (event.target == document.getElementById('rentalModal')) {
        closeModal();
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const rentalModal = document.getElementById('rentalModal');
    const updateForm = document.getElementById('update-rental-form');
    const closeBtn = document.getElementById('close-rental-modal');
    
    // Close modal functio
    const hideModal = () => { if(rentalModal) rentalModal.style.display = 'none'; };

    document.querySelectorAll('.open-rental-modal').forEach(trigger => {
        trigger.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            
            document.getElementById('modal-start-date').value = this.dataset.startDate;
            document.getElementById('modal-duration').value = this.dataset.durationVal;

            updateForm.action = "/user/update_rental/" + itemId;

            rentalModal.style.display = 'flex';
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', hideModal);

    window.addEventListener('click', (e) => {
        if (e.target === rentalModal) hideModal();
    });
});



/*================== START OF MESSAGE NOTIFICATION ==================*/

function showToast(message, category = 'info') {
    const container = document.getElementById('main-toast-container');
    const template = document.getElementById('toast-template');
    
    if (!container || !template) return;

    const toastClone = template.content.cloneNode(true);
    const toastDiv = toastClone.querySelector('.medical-toast');

    toastDiv.classList.add(category);

    const icons = { 
        success: 'check_circle', 
        error: 'error', 
        warning: 'warning', 
        info: 'info' 
    };
    const iconElement = toastDiv.querySelector('.toast-icon');
    iconElement.textContent = icons[category] || 'info';

    const titleElement = toastDiv.querySelector('.toast-title');
    const messageElement = toastDiv.querySelector('.toast-message');
    
    titleElement.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    messageElement.textContent = message;

    container.appendChild(toastDiv);

    setupToastAutoRemove(toastDiv);
}


function setupToastAutoRemove(toastElement) {
    setTimeout(() => {
        if (toastElement.parentNode) {
            toastElement.style.animation = 'toast-fade-out 0.5s ease forwards';
            
            toastElement.addEventListener('animationend', (e) => {
                if (e.animationName === 'toast-fade-out') {
                    toastElement.remove();
                }
            });
        }
    }, 4500); 
}

document.addEventListener('DOMContentLoaded', () => {
    const existingToasts = document.querySelectorAll('.medical-toast');
    existingToasts.forEach(toast => {
        setupToastAutoRemove(toast);
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("main-toast-container");

    if (!container) return;

    container.addEventListener("click", function (e) {
        const closeBtn = e.target.closest(".toast-close");

        if (closeBtn) {
            const toast = closeBtn.closest(".medical-toast");
            if (toast) toast.remove();
        }
    });
});