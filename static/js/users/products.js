/*================== START OF MESSAGE NOTIFICATION ==================*/
/**
 * Core function to create and show a toast notification
 */
function showToast(message, category = 'info') {
    const container = document.getElementById('main-toast-container');
    const template = document.getElementById('toast-template');
    
    if (!container || !template) return;

    // 1. Clone the template
    const toastClone = template.content.cloneNode(true);
    const toastDiv = toastClone.querySelector('.medical-toast');

    // 2. Set Category Class (success, error, warning, info)
    toastDiv.classList.add(category);

    // 3. Set the Icon
    const icons = { 
        success: 'check_circle', 
        error: 'error', 
        warning: 'warning', 
        info: 'info' 
    };
    const iconElement = toastDiv.querySelector('.toast-icon');
    iconElement.textContent = icons[category] || 'info';

    // 4. Set Titles and Message
    const titleElement = toastDiv.querySelector('.toast-title');
    const messageElement = toastDiv.querySelector('.toast-message');
    
    titleElement.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    messageElement.textContent = message;

    // 5. Add to the DOM
    container.appendChild(toastDiv);

    // 6. Handle Auto-Removal
    setupToastAutoRemove(toastDiv);
}

/**
 * Shared logic to handle the fade-out and removal of a toast element
 */
function setupToastAutoRemove(toastElement) {
    setTimeout(() => {
        if (toastElement.parentNode) {
            // Apply the fade-out animation via JS
            toastElement.style.animation = 'toast-fade-out 0.5s ease forwards';
            
            toastElement.addEventListener('animationend', (e) => {
                if (e.animationName === 'toast-fade-out') {
                    toastElement.remove();
                }
            });
        }
    }, 4500); // 4.5s visible + 0.5s fade = 5s total
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

/* --------------------------------------------------
    GLOBAL PRODUCTS URL
-------------------------------------------------- */



const PRODUCTS_ROUTE = PRODUCTS_URL;


/* --------------------------------------------------
    ORIGINAL SCRIPTS
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {

    // Dropdown toggle
    const trigger = document.getElementById("profileTrigger");
    const menu = document.getElementById("dropdownMenu");

    if (trigger && menu) {
        trigger.addEventListener("click", function (e) {
            e.stopPropagation();
            menu.classList.toggle("show");
        });
    }

    // Close dropdown when clicking outside
    window.addEventListener("click", function (event) {

        if (!event.target.closest(".user-profile-widget")) {

            const dropdowns =
                document.getElementsByClassName("dropdown-menu");

            for (let i = 0; i < dropdowns.length; i++) {

                let openDropdown = dropdowns[i];

                if (openDropdown.classList.contains("show")) {
                    openDropdown.classList.remove("show");
                }

            }

        }

    });

    // About section IntersectionObserver
    const aboutSection = document.querySelector('#about');
    const aboutNavLink = document.querySelector('a[href="#about"]');

    if (aboutSection && aboutNavLink) {

        const observerOptions = {
            root: null,
            threshold: 0.6
        };

        const observer = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {
                    aboutNavLink.classList.add('active-link');
                } else {
                    aboutNavLink.classList.remove('active-link');
                }

            });

        }, observerOptions);

        observer.observe(aboutSection);

    }

    // Show/hide elements based on auth state
    if (document.body.classList.contains("logged-in")) {

        document.querySelectorAll(".guest-only")
            .forEach(el => el.style.display = "none");

    } else {

        document.querySelectorAll(".auth-only")
            .forEach(el => el.style.display = "none");

    }

    // Profile image fallback
    const profileImages =
        document.querySelectorAll('.user-photo-img');

    profileImages.forEach(img => {

        img.onerror = function () {

            const container = this.parentElement;

            container.innerHTML =
                '<span class="material-symbols-outlined icon-placeholder">account_circle</span>';

            const placeholder =
                container.querySelector('.icon-placeholder');

            if (!placeholder) return;

            if (container.classList.contains('profile-avatar-large')) {
                placeholder.style.fontSize = "100px";
            } else {
                placeholder.style.fontSize = "38px";
            }

        };

    });

});


/* --------------------------------------------------
    RENTAL MODAL
-------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {

    // Modal Elements
    const rentalButtons =
        document.querySelectorAll('.open-rental-btn');

    const modal =
        document.getElementById('rentalModal');

    const form =
        document.getElementById('quickRentalForm');

    const modalName =
        document.getElementById('modalProductName');

    const modalPeriod =
        document.getElementById('modalRentPeriod');

    const viewDetailsLink =
        document.getElementById('viewDetailsLink');

    const startDateInput =
        document.getElementById('startDateInput');

    const closeModalX =
        document.getElementById('closeModalX');

    const closeModalBtn =
        document.getElementById('closeModalBtn');

    /* ----------------------------------------------
        OPEN MODAL
    ---------------------------------------------- */
    rentalButtons.forEach(btn => {

        btn.addEventListener('click', () => {

            // Product Data
            const productId = btn.dataset.id;
            const productName = btn.dataset.name;
            const rentPeriod = btn.dataset.period;
            const detailsUrl = btn.dataset.detailsUrl;
            const cartUrl = btn.dataset.cartUrl;

            // Set Product Name
            if (modalName) {
                modalName.textContent = productName;
            }

            // Set Rental Period
            if (modalPeriod) {
                modalPeriod.textContent = rentPeriod;
            }

            // Set Details Link
            if (viewDetailsLink && detailsUrl) {
                viewDetailsLink.href = detailsUrl;
            }

            // Set Form Action
            if (form && cartUrl) {

                form.action = cartUrl;

            } else if (form && productId) {

                form.action = `/add-to-cart/${productId}`;

            }

            // Default Date = Today
            if (startDateInput) {

                const today =
                    new Date().toISOString().split('T')[0];

                startDateInput.value = today;

            }

            // Show Modal
            if (modal) {
                modal.style.display = 'flex';
            }

        });

    });

    /* ----------------------------------------------
        CLOSE MODAL
    ---------------------------------------------- */
    function closeRentalModal() {

        if (modal) {
            modal.style.display = 'none';
        }

    }

    // Close via X
    if (closeModalX) {
        closeModalX.addEventListener(
            'click',
            closeRentalModal
        );
    }

    // Close via Cancel
    if (closeModalBtn) {
        closeModalBtn.addEventListener(
            'click',
            closeRentalModal
        );
    }

    // Close when clicking overlay
    if (modal) {

        modal.addEventListener('click', function (e) {

            if (e.target === modal) {
                closeRentalModal();
            }

        });

    }

    // Close on ESC
    document.addEventListener('keydown', function (e) {

        if (
            e.key === 'Escape' &&
            modal &&
            modal.style.display === 'flex'
        ) {
            closeRentalModal();
        }

    });

});


/* --------------------------------------------------
    PRODUCT FILTERING / CATEGORY TABS
-------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {

    const tabButtons =
        document.querySelectorAll('.tab-btn');

    const searchInput =
        document.getElementById('productSearch');

    const sortSelect =
        document.getElementById('sortOrder');

    /* ----------------------------------------------
        REDIRECT HELPER
    ---------------------------------------------- */
    function redirectProducts(category, search, sort) {

        const params = new URLSearchParams();

        if (category && category !== 'All') {
            params.set('category', category);
        }

        if (search && search.trim() !== '') {
            params.set('search', search.trim());
        }

        if (sort && sort !== 'default') {
            params.set('sort', sort);
        }

        const finalUrl = params.toString()
            ? `${PRODUCTS_ROUTE}?${params.toString()}`
            : PRODUCTS_ROUTE;

        window.location.href = finalUrl;

    }

    /* ----------------------------------------------
        CATEGORY TAB CLICK
    ---------------------------------------------- */
    tabButtons.forEach(button => {

        button.addEventListener('click', function () {

            // Remove active from all tabs
            tabButtons.forEach(tab => {
                tab.classList.remove('active');
            });

            // Add active to clicked
            this.classList.add('active');

            // Values
            const category =
                this.dataset.cat || 'All';

            const search =
                searchInput ? searchInput.value : '';

            const sort =
                sortSelect ? sortSelect.value : 'default';

            redirectProducts(category, search, sort);

        });

    });

    /* ----------------------------------------------
        SEARCH INPUT
    ---------------------------------------------- */
    if (searchInput) {

        let searchTimeout;

        searchInput.addEventListener('input', function () {

            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(() => {

                const activeTab =
                    document.querySelector('.tab-btn.active');

                const category =
                    activeTab
                        ? activeTab.dataset.cat
                        : 'All';

                const search = this.value || '';

                const sort =
                    sortSelect
                        ? sortSelect.value
                        : 'default';

                redirectProducts(category, search, sort);

            }, 400);

        });

    }

    /* ----------------------------------------------
        SORT SELECT
    ---------------------------------------------- */
    if (sortSelect) {

        sortSelect.addEventListener('change', function () {

            const activeTab =
                document.querySelector('.tab-btn.active');

            const category =
                activeTab
                    ? activeTab.dataset.cat
                    : 'All';

            const search =
                searchInput
                    ? searchInput.value
                    : '';

            const sort =
                this.value || 'default';

            redirectProducts(category, search, sort);

        });

    }

});