document.addEventListener('DOMContentLoaded', function() {
    const headerSelectAll = document.getElementById('select-all');
    const footerSelectAll = document.getElementById('footer-select-all');
    const itemCheckboxes = document.querySelectorAll('.item-checkbox');
    const liveTotal = document.getElementById('live-total');
    const selectedCount = document.getElementById('selected-count');

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

    // Function to sync all master toggles
    function syncMasterToggles(isChecked) {
        if (headerSelectAll) headerSelectAll.checked = isChecked;
        if (footerSelectAll) footerSelectAll.checked = isChecked;
        itemCheckboxes.forEach(cb => cb.checked = isChecked);
        calculateTotal();
    }

    // Header Toggle
    if (headerSelectAll) {
        headerSelectAll.addEventListener('change', function() {
            syncMasterToggles(this.checked);
        });
    }

    // Footer Toggle
    if (footerSelectAll) {
        footerSelectAll.addEventListener('change', function() {
            syncMasterToggles(this.checked);
        });
    }

    // Individual Checkboxes
    itemCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const allChecked = Array.from(itemCheckboxes).every(c => c.checked);
            
            // Update both master toggles
            if (headerSelectAll) headerSelectAll.checked = allChecked;
            if (footerSelectAll) footerSelectAll.checked = allChecked;
            
            calculateTotal();
        });
    });

    calculateTotal();

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