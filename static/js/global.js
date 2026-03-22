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