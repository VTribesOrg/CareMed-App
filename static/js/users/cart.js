document.addEventListener('DOMContentLoaded', function() {
    const headerSelectAll = document.getElementById('select-all'); // Top-most master (if exists)
    const footerSelectAll = document.getElementById('footer-select-all'); // Sticky footer master
    const sectionCheckboxes = document.querySelectorAll('.section-checkbox'); // Rental/Purchase headers
    const itemCheckboxes = document.querySelectorAll('.item-checkbox');
    const liveTotal = document.getElementById('live-total');
    const selectedCount = document.getElementById('selected-count');

    // --- 1. CALCULATION LOGIC ---
    function calculateTotal() {
        let total = 0;
        let count = 0;
        itemCheckboxes.forEach(cb => {
            if (cb.checked) {
                const row = cb.closest('.cart-item-row');
                const price = parseFloat(row.getAttribute('data-price')) || 0;
                total += price;
                count++;
            }
        });
        
        if (liveTotal) liveTotal.innerText = total.toLocaleString();
        if (selectedCount) selectedCount.innerText = count;
    }

    // --- 2. MASTER SYNC LOGIC ---
    // Update Section Headers (Check if all items in a category are checked)
    function updateSectionHeaders() {
        sectionCheckboxes.forEach(header => {
            const sectionType = header.getAttribute('data-section');
            const items = document.querySelectorAll(`.${sectionType}-item`);
            const checkedItems = document.querySelectorAll(`.${sectionType}-item:checked`);
            
            // Check the section header only if all items in it are checked
            header.checked = items.length > 0 && items.length === checkedItems.length;
        });
    }

    // Update the Global Toggles (Check if every single item in the cart is checked)
    function updateGlobalToggles() {
        const allChecked = Array.from(itemCheckboxes).every(c => c.checked);
        if (headerSelectAll) headerSelectAll.checked = allChecked;
        if (footerSelectAll) footerSelectAll.checked = allChecked;
    }

    // --- 3. EVENT LISTENERS ---

    // Section Header Toggles (Rentals/Purchases)
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

    // Global Toggles (Header/Footer "Select All")
    const masterToggles = [headerSelectAll, footerSelectAll];
    masterToggles.forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', function() {
                const isChecked = this.checked;
                
                // Set every single checkbox on the page to match
                itemCheckboxes.forEach(cb => cb.checked = isChecked);
                sectionCheckboxes.forEach(scb => scb.checked = isChecked);
                
                // Sync the other global toggle
                if (headerSelectAll) headerSelectAll.checked = isChecked;
                if (footerSelectAll) footerSelectAll.checked = isChecked;
                
                calculateTotal();
            });
        }
    });

    // Individual Item Checkboxes
    itemCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            updateSectionHeaders();
            updateGlobalToggles();
            calculateTotal();
        });
    });

    // Run on page load
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

        // 1. Get URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const addedId = urlParams.get('added_id');
    const addedType = urlParams.get('added_type');

    if (addedId && addedType) {
        // 2. Construct the value to look for (matches your checkbox 'value' attribute)
        const targetValue = `${addedId}:${addedType}`;
        
        // 3. Find the checkbox with that specific value
        const checkbox = document.querySelector(`input[name="selected_items"][value="${targetValue}"]`);
        
        if (checkbox) {
            // 4. Check the box
            checkbox.checked = true;

            // 5. Trigger the 'change' event so your Total Price calculation updates
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));

            // 6. Optional: Scroll the item into view if the cart is long
            checkbox.closest('.cart-item-row').scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 7. Clean up the URL (Removes the parameters so a page refresh doesn't keep checking it)
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: cleanUrl}, '', cleanUrl);
        }
    }
});

/* --------------------------------------------------
    TOAST NOTIFICATION
-------------------------------------------------- */
function showToast(msg) {
    const t = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (t && msgEl) {
        msgEl.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
}


function openRentalModal(itemId, currentDate, currentDuration) {
    const modal = document.getElementById('rentalModal');
    const form = document.getElementById('update-rental-form');
    
    // Set form action dynamically
    form.action = `/user/update_rental/${itemId}`;
    
    // Pre-fill values
    document.getElementById('modal-start-date').value = currentDate;
    document.getElementById('modal-duration').value = currentDuration;
    
    modal.style.display = "flex";
}

function closeModal() {
    document.getElementById('rentalModal').style.display = "none";
}

// Close modal if user clicks outside of it
window.onclick = function(event) {
    if (event.target == document.getElementById('rentalModal')) {
        closeModal();
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const rentalModal = document.getElementById('rentalModal');
    const updateForm = document.getElementById('update-rental-form');
    const closeBtn = document.getElementById('close-rental-modal');
    
    // Close modal function
    const hideModal = () => { if(rentalModal) rentalModal.style.display = 'none'; };

    document.querySelectorAll('.open-rental-modal').forEach(trigger => {
        trigger.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            
            document.getElementById('modal-start-date').value = this.dataset.startDate;
            document.getElementById('modal-duration').value = this.dataset.durationVal;

            // Change this to match the result of 'flask routes' exactly
            updateForm.action = "/user/update_rental/" + itemId;

            rentalModal.style.display = 'flex';
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', hideModal);

    window.addEventListener('click', (e) => {
        if (e.target === rentalModal) hideModal();
    });
});

