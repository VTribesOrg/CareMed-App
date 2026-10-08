document.addEventListener('DOMContentLoaded', function () {
    // --- UI Elements ---
    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');

    // --- Avatar DOM Elements ---
    const avatarContainer = document.getElementById('avatar-container');
    const avatarInput = document.getElementById('avatar-upload');
    const profileDisplay = document.getElementById('profile-img-display');
    const headerDisplay = document.getElementById('header-avatar-img'); // Top Navbar Sync Target
    const profileAvatarIcon = document.getElementById('profile-avatar-icon');
    const removeBtn = document.getElementById('remove-avatar');

    // --- security context tokens ---
    const csrfTokenInput = document.querySelector('input[name="csrf_token"]');
    const csrfToken = csrfTokenInput ? csrfTokenInput.value : '';

    // --- Empty-field styling: mark empty editable inputs so they render the
    //     muted / dashed "N/A" look from admin_profile.css (.is-empty). ---
    const editableTextInputs = document.querySelectorAll(
        '.profile-settings-wrapper .input-group input[type="text"]:not([disabled])'
    );
    function refreshEmptyStates() {
        editableTextInputs.forEach(function (input) {
            input.classList.toggle('is-empty', input.value.trim() === '');
        });
    }
    editableTextInputs.forEach(function (input) {
        input.addEventListener('input', refreshEmptyStates);
    });
    refreshEmptyStates();

    // --- Avatar Interaction & Upload Logic ---
    
    // Open system file selector on click wrapper
    avatarContainer?.addEventListener('click', () => avatarInput?.click());

    // Handle File processing and Backend Syncing
    avatarInput?.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const formData = new FormData();
            formData.append('avatar', file);

            // Send image directly to Flask backend route asynchronously
            fetch('/admin/profile/update-avatar', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update main profile picture
                    if (profileDisplay) {
                        profileDisplay.src = data.img_url;
                        profileDisplay.style.display = 'block';
                    }
                    
                    // Sync perfectly with Top Header Navbar Picture
                    if (headerDisplay) {
                        headerDisplay.src = data.img_url;
                    }

                    // Hide material placeholder icon fallback
                    if (profileAvatarIcon) {
                        profileAvatarIcon.style.display = 'none';
                    }

                    // Display 'close' removal item button safely
                    if (removeBtn) {
                        removeBtn.style.display = 'flex';
                    }
                } else {
                    alert(data.message || 'Error updating profile image.');
                }
            })
            .catch(error => {
                console.error('Upload Error:', error);
                alert('An error occurred during image upload.');
            });
        }
    });

    // Remove Profile Photo Request
    removeBtn?.addEventListener('click', function (e) {
        e.stopPropagation(); // Avoid popping open the file selection dialog wrapper again

        if (confirm("Are you sure you want to restore the default profile photo?")) {
            fetch('/admin/profile/remove-avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Clear image tracking nodes
                    if (profileDisplay) {
                        profileDisplay.src = '';
                        profileDisplay.style.display = 'none';
                    }
                    
                    // Reset header workspace fallback reference tracking state
                    if (headerDisplay) {
                        headerDisplay.src = ''; // Fallback image path can be applied here
                    }

                    // Re-render Material symbols default user avatar indicator
                    if (profileAvatarIcon) {
                        profileAvatarIcon.style.display = 'block';
                    }

                    // Hide picture cross removal trigger
                    if (removeBtn) {
                        removeBtn.style.display = 'none';
                    }

                    // Flush field reference values cleanly
                    if (avatarInput) {
                        avatarInput.value = '';
                    }
                } else {
                    alert(data.message || 'Error removing profile image.');
                }
            })
            .catch(error => {
                console.error('Removal Error:', error);
                alert('An error occurred while removing your profile picture.');
            });
        }
    });

    // --- Navigation & Header Dropdown Interaction ---
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
        if (notifBtn && !notifBtn.contains(e.target)) {
            notifDropdown?.classList.remove('active');
        }
    });

    // --- Password match hint ---
    const newPw = document.getElementById('new-password');
    const confirmPw = document.getElementById('confirm-password');
    const pwHint = document.getElementById('password-match-hint');
    const pwForm = document.getElementById('password-change-form');

    function refreshPwHint() {
        if (!pwHint || !newPw || !confirmPw) return;
        if (!newPw.value && !confirmPw.value) {
            pwHint.textContent = 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character (@$!%*?&).';
            pwHint.style.color = '#64748b';
            return;
        }
        if (newPw.value === confirmPw.value) {
            pwHint.textContent = 'Passwords match.';
            pwHint.style.color = '#16a34a';
        } else {
            pwHint.textContent = 'Passwords do not match yet.';
            pwHint.style.color = '#dc2626';
        }
    }

    newPw?.addEventListener('input', refreshPwHint);
    confirmPw?.addEventListener('input', refreshPwHint);
    pwForm?.addEventListener('submit', function (e) {
        if (newPw && confirmPw && newPw.value !== confirmPw.value) {
            e.preventDefault();
            refreshPwHint();
            confirmPw.focus();
        }
    });

    // --- Tab-based section navigation ---
    // Clicking a tab shows only that panel (no page scrolling) and
    // reflects the choice in the URL hash for deep-linking.
    const tabs = document.querySelectorAll('.profile-tabbar .profile-tab');
    const panels = document.querySelectorAll('.profile-tab-panels .profile-tab-panel');

    function activateTab(name) {
        let matched = false;
        tabs.forEach(tab => {
            const on = tab.dataset.tab === name;
            tab.classList.toggle('active', on);
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) matched = true;
        });
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === name);
        });
        return matched;
    }

    if (tabs.length > 0 && panels.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                activateTab(tab.dataset.tab);
            });
        });

        // Deep-link: open the panel named in the URL hash on load (e.g. #security-settings).
        const initial = window.location.hash.replace('#', '');
        if (initial) {
            activateTab(initial);
        }
    }
});