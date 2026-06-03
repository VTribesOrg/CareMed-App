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

    // --- Sticky Layout Navigation Intersection Observer ---
    const settingsLinks = document.querySelectorAll('.settings-nav .nav-link');
    const sections = document.querySelectorAll('section.content-section');

    if (settingsLinks.length > 0 && sections.length > 0) {
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
    }
});