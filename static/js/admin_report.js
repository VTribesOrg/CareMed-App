// Move declarations to the top so they are available to all functions/listeners
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const notifBtn = document.getElementById('notif-btn');
const notifDropdown = document.getElementById('notif-dropdown');
const settingsBtn = document.getElementById('settings-toggle-btn');
const settingsPopup = document.getElementById('settings-menu-popup');
const checkbox = document.getElementById('sidebar-state');

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

window.addEventListener('click', (e) => {
    if (profileBtn && !profileBtn.contains(e.target)) profileDropdown.classList.remove('active');
    if (notifBtn && !notifBtn.contains(e.target)) notifDropdown.classList.remove('active');

    // Fixed: Reference 'e' instead of 'event' and ensure settingsBtn exists
    if (settingsPopup && !settingsPopup.contains(e.target) && e.target !== settingsBtn) {
        settingsPopup.classList.add('hidden');
    }
});

function openAssetModal() {
    document.getElementById('registerAssetModal').classList.remove('hidden');
}

function closeAssetModal() {
    document.getElementById('registerAssetModal').classList.add('hidden');
}

settingsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    settingsPopup.classList.toggle('hidden');
});

// 1. Immediately apply the saved state before the page renders
const sidebarState = localStorage.getItem('sidebar-collapsed');

// Ensure checkbox exists before setting property
if (checkbox) {
    // If 'true', we want it unchecked (collapsed). 
    // If 'false' or null, we want it checked (expanded/default).
    checkbox.checked = sidebarState !== 'true';

    // 2. Listen for changes to save the preference
    checkbox.addEventListener('change', function() {
        // Save 'true' if the sidebar is now collapsed (unchecked)
        localStorage.setItem('sidebar-collapsed', !this.checked);
    });
}
