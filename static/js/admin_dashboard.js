
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
