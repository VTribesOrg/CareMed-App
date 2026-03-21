// --- UI Elements ---
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const notifBtn = document.getElementById('notif-btn');
const notifDropdown = document.getElementById('notif-dropdown');
const settingsBtn = document.getElementById('settings-toggle-btn');
const settingsPopup = document.getElementById('settings-menu-popup');

// --- Avatar Logic ---
const avatarContainer = document.getElementById('avatar-container');
const avatarInput = document.getElementById('avatar-upload');
const profileDisplay = document.getElementById('profile-img-display');
const headerDisplay = document.getElementById('header-avatar-img');
const removeBtn = document.getElementById('remove-avatar');

// Trigger upload
avatarContainer.addEventListener('click', () => avatarInput.click());

// Handle Image Update & Header Sync
avatarInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const newImg = e.target.result;
            profileDisplay.src = newImg;
            headerDisplay.src = newImg; // Sync with header!
            removeBtn.style.display = 'flex';
        }
        reader.readAsDataURL(file);
    }
});

// Remove Photo Logic
removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm("Restore default profile photo?")) {
        profileDisplay.src = placeholderUrl;
        headerDisplay.src = placeholderUrl;
        avatarInput.value = "";
        removeBtn.style.display = 'none';
    }
});

// --- Navigation & Dropdown Interaction ---
function toggleDropdown(dropdown) {
    document.querySelectorAll('.header-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });
    dropdown.classList.toggle('active');
}

profileBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(profileDropdown); });
notifBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(notifDropdown); });
settingsBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); settingsPopup.classList.toggle('hidden'); });

window.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target)) profileDropdown.classList.remove('active');
    if (!notifBtn.contains(e.target)) notifDropdown.classList.remove('active');
    if (!settingsPopup.contains(e.target) && e.target !== settingsBtn) settingsPopup.classList.add('hidden');
});

// --- Intersection Observer for Sticky Nav ---
const settingsLinks = document.querySelectorAll('.settings-nav .nav-link');
const sections = document.querySelectorAll('section.content-section');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            settingsLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
            });
        }
    });
}, { threshold: 0.6 });
sections.forEach(section => observer.observe(section));

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
