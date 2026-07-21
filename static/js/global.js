/* ======================================= START OF PROFILE DROPDOWN & SETTINGS ======================================= */
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
    if (profileBtn && !profileBtn.contains(e.target)) profileDropdown.classList.remove('active');
    if (notifBtn && !notifBtn.contains(e.target)) notifDropdown.classList.remove('active');

    if (settingsPopup && !settingsPopup.contains(e.target) && e.target !== settingsBtn) {
        settingsPopup.classList.add('hidden');
    }
});
/* ======================================== END OF PROFILE DROPDOWN & SETTINGS ======================================== */


/* ======================================= START OF SIDEBAR STATE ======================================= */
document.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('sidebar-state');
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            localStorage.setItem('sidebar-collapsed', !this.checked);
        });
    }
});
/* ======================================== END OF SIDEBAR STATE ======================================== */



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
/*================== END OF MESSAGE NOTIFICATION ==================*/