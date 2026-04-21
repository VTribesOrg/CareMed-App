
/* --------------------------------------------------
    TOAST
-------------------------------------------------- */
function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

/* --------------------------------------------------
    ORIGINAL SCRIPTS (preserved exactly)
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
            const dropdowns = document.getElementsByClassName("dropdown-menu");
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

    if (aboutSection) {
        observer.observe(aboutSection);
    }

    // Show/hide elements based on auth state
    if (document.body.classList.contains("logged-in")) {
        document.querySelectorAll(".guest-only").forEach(el => el.style.display = "none");
    } else {
        document.querySelectorAll(".auth-only").forEach(el => el.style.display = "none");
    }

    // Profile image fallback
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

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('rentalModal');
    const form = document.getElementById('quickRentalForm');
    const modalName = document.getElementById('modalProductName');
    const modalPeriod = document.getElementById('modalRentPeriod');
    const viewDetailsLink = document.getElementById('viewDetailsLink');
    const startDateInput = document.getElementById('startDateInput');

    // 1. Handle "Add Rental" button clicks
    document.querySelectorAll('.open-rental-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Extract data from the clicked button's attributes
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const period = this.getAttribute('data-period');
            const detailsUrl = this.getAttribute('data-details-url'); // Get the Flask-generated URL

            // Populate Modal Data
            modalName.textContent = name;
            modalPeriod.textContent = period;
            
            // Set the form action dynamically for the specific product
            form.action = `/cart/add/${id}`;
            
            // Set the "View Details" link using the URL from the data attribute
            if (viewDetailsLink && detailsUrl) {
                viewDetailsLink.href = detailsUrl;
            }
            
            // Set default date to today for the start_date input
            if (startDateInput) {
                const today = new Date().toISOString().split('T')[0];
                startDateInput.value = today;
            }

            // Display the modal
            modal.style.display = 'flex';
        });
    });

    // 2. Handle Closing the Modal
    const closeElements = [
        document.getElementById('closeModalX'),
        document.getElementById('closeModalBtn'),
        modal // This handles clicking on the blurred overlay/background
    ];

    closeElements.forEach(el => {
        if (!el) return;
        el.addEventListener('click', function(e) {
            // Close if: clicked 'X', clicked 'Cancel', or clicked the dark overlay itself
            if (e.target === modal || e.target.closest('.close-modal') || e.target.id === 'closeModalBtn') {
                modal.style.display = 'none';
            }
        });
    });
});

