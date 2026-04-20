
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

