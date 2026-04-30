// --- UI Elements ---
const notifBtn = document.getElementById('notif-btn');
const notifDropdown = document.getElementById('notif-dropdown');

// --- Avatar Logic ---
const avatarContainer = document.getElementById('avatar-container');
const avatarInput = document.getElementById('avatar-upload');
const profileDisplay = document.getElementById('profile-img-display');
const headerDisplay = document.getElementById('header-avatar-img');
const removeBtn = document.getElementById('remove-avatar');

// Trigger upload
avatarContainer?.addEventListener('click', () => avatarInput.click());

// Handle Image Update & Header Sync
avatarInput?.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const newImg = e.target.result;
            if (profileDisplay) profileDisplay.src = newImg;
            if (headerDisplay) headerDisplay.src = newImg; // Sync with header!
            if (removeBtn) removeBtn.style.display = 'flex';
        }
        reader.readAsDataURL(file);
    }
});

// Remove Photo Logic
removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm("Restore default profile photo?")) {
        const placeholderUrl = ""; // Add your default image path here
        if (profileDisplay) profileDisplay.src = placeholderUrl;
        if (headerDisplay) headerDisplay.src = placeholderUrl;
        avatarInput.value = "";
        removeBtn.style.display = 'none';
    }
});

// --- Navigation & Dropdown Interaction ---
function toggleDropdown(dropdown) {
    document.querySelectorAll('.header-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });
    dropdown?.classList.toggle('active');
}

notifBtn?.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    toggleDropdown(notifDropdown); 
});

window.addEventListener('click', (e) => {
    if (notifBtn && !notifBtn.contains(e.target)) notifDropdown?.classList.remove('active');
});

/*============= START OF STICKY NAV OBSERVER =============*/
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
/*============= END OF STICKY NAV OBSERVER =============*/