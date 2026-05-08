document.addEventListener("DOMContentLoaded", function () {
    // --- Elements ---
    const editModal = document.getElementById('editModal');
    const passModal = document.getElementById('passwordModal');
    const initialImageHTML = document.getElementById('imagePreview')?.innerHTML;
    
    // Updated IDs to match your new HTML
    const profileInput = document.getElementById('profile_path'); 
    const removePhotoInput = document.getElementById('removePhotoInput');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    
    const dropdownMenu = document.getElementById('dropdownMenu');

    // Password modal elements
    const newPass = document.getElementById('new_password');
    const confirmPass = document.getElementById('confirm_password');
    const currentPass = document.getElementById('current_password');
    const matchMsg = document.getElementById('match-message');
    const passwordSaveBtn = document.querySelector('#passwordModal .btn-save');
    const passwordForm = passModal?.querySelector("form");

    // --- Create per-field error elements ---
    ['current_password', 'new_password', 'confirm_password'].forEach(id => {
        const inputEl = document.getElementById(id);
        if(inputEl && !document.getElementById(`error_${id}`)) {
            const errorDiv = document.createElement('div');
            errorDiv.id = `error_${id}`;
            errorDiv.className = 'error-msg';
            inputEl.parentElement.parentElement.appendChild(errorDiv);
        }
    });

    // Profile modal submit button
    const submitBtn = document.getElementById('saveProfileBtn');
    const btnText = document.getElementById('btnText');

    // --- Modal Open/Close ---
    const openModal = () => { 
        editModal?.classList.add('active'); 
        document.body.style.overflow = 'hidden'; 
    };
    const closeModal = () => { 
        resetProfileModal();
        editModal?.classList.remove('active'); 
        document.body.style.overflow = 'auto'; 
    };
    const openPassModal = () => { 
        passModal?.classList.add('active'); 
        document.body.style.overflow = 'hidden'; 
    };
    const closePassModal = () => { 
        passModal?.classList.remove('active'); 
        document.body.style.overflow = 'auto'; 

        [newPass, confirmPass, currentPass].forEach(el => { 
            if(el) el.value = ""; 
        });

        if(matchMsg) { 
            matchMsg.textContent = ""; 
            matchMsg.style.opacity = "0"; 
        }

        if(passwordSaveBtn) passwordSaveBtn.disabled = false;

        // Clear all per-field errors
        ['current_password', 'new_password', 'confirm_password'].forEach(id => {
            const err = document.getElementById(`error_${id}`);
            if(err) err.textContent = "";
        });

        document.querySelectorAll('#passwordModal .toggle-password').forEach(icon => {
            const targetId = icon.getAttribute('data-target');
            const input = document.getElementById(targetId);

            if (input) {
                input.type = "password";
            }

            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        });
    };

    // --- Reset Profile Modal ---
    const resetProfileModal = () => {
        const form = document.querySelector(".modal-form");

        if (form) {
            form.reset(); 
        }

        // reset hidden fields
        if (profileInput) profileInput.value = "";
        if (removePhotoInput) removePhotoInput.value = "false";

        // reset image preview
        const preview = document.getElementById('imagePreview');
        if (preview && initialImageHTML) {
            preview.innerHTML = initialImageHTML;
        }

        // reset submit state
        if (submitBtn) submitBtn.disabled = true;
    };

    // --- Event Listeners for Modal Open ---
    document.getElementById('editProfileBtn')?.addEventListener('click', openModal);
    document.getElementById('openPassBtn')?.addEventListener('click', openPassModal);

    // Close buttons and cancel buttons
    document.querySelectorAll('.close-modal-trigger, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal();
            closePassModal();
        });
    });


    // --- Dropdown toggle ---
    document.getElementById("profileTrigger")?.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu?.classList.toggle('show');
    });

    // --- Password validation ---
    const validatePasswordMatch = () => {
        if (!confirmPass || confirmPass.value.length === 0) {
            if(matchMsg) { matchMsg.textContent = ""; matchMsg.style.opacity = "0"; }
            if(passwordSaveBtn) passwordSaveBtn.disabled = false;
            return;
        }
        matchMsg.style.opacity = "1"; 
        if (newPass.value === confirmPass.value) {
            matchMsg.textContent = "✓ Passwords match";
            matchMsg.style.color = "#10b981";
            passwordSaveBtn.disabled = false;
        } else {
            matchMsg.textContent = "✕ Passwords do not match";
            matchMsg.style.color = "#ef4444";
            passwordSaveBtn.disabled = true;
        }
    };
    newPass?.addEventListener('keyup', validatePasswordMatch);
    confirmPass?.addEventListener('keyup', validatePasswordMatch);

    // --- Password visibility toggle ---
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input && input.type === "password") {
                input.type = "text";
                this.classList.replace('fa-eye-slash', 'fa-eye');
            } else if (input) {
                input.type = "password";
                this.classList.replace('fa-eye', 'fa-eye-slash');
            }
        });
    });

    // --- Image Preview & Remove (Refined for new UI) ---
    profileInput?.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            if (removePhotoInput) removePhotoInput.value = "false";
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" class="user-photo-img">`;
            };
            reader.readAsDataURL(this.files[0]);
            checkChanges(); // Trigger change check
        }
    });

    removePhotoBtn?.addEventListener('click', () => {
        if (confirm("Are you sure you want to remove your profile photo? This cannot be undone.")) {
            if (removePhotoInput) removePhotoInput.value = "true";
            if (profileInput) profileInput.value = "";
            
            const iconHTML = '<span class="material-symbols-outlined icon-placeholder">account_circle</span>';
            
            // Update all preview containers
            ['imagePreview', 'navAvatarContainer', 'mobileAvatarContainer', 'sidebarAvatarContainer'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = iconHTML;
            });
            
            if (submitBtn) submitBtn.disabled = false; // Enable save to commit the removal
        }
    });

    // --- Enable submit on changes ---
    const form = document.querySelector(".modal-form");
    
    const checkChanges = () => {
        if (!form || !submitBtn) return;
        const inputs = form.querySelectorAll("input, textarea, select");
        let changed = false;
        
        inputs.forEach(input => {
            if (input.type === "file" && input.files.length > 0) changed = true;
            else if (input.id === "removePhotoInput" && input.value === "true") changed = true;
            else if (input.defaultValue !== undefined && input.value !== input.defaultValue) changed = true;
        });
        
        submitBtn.disabled = !changed;
    };

    if (form && submitBtn) {
        form.querySelectorAll("input, textarea, select").forEach(input => {
            input.addEventListener("input", checkChanges);
        });
    }

    // --- Profile submit with AJAX and Toast ---
    const profileForm = document.querySelector(".modal-form");

    profileForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.disabled = true;
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Updating...";

        const formData = new FormData(this);
        formData.append('submit_profile', 'true'); 

        fetch(this.action, { 
            method: "POST", 
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return res.json();
            } else {
                throw new TypeError("Oops, we haven't got JSON!");
            }
        })
        .then(data => {
            if(data.status === "success") {
                closeModal();
                showToast(data.message, "success");
                setTimeout(() => { location.reload(); }, 1500);
            } else {
                showToast(data.message || "Update failed", "error");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showToast("An error occurred.", "error");
        })
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.innerText = originalText;
        });
    });

    // --- Password modal AJAX submission ---
    passwordForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        if(!passwordSaveBtn) return;

        passwordSaveBtn.disabled = true;
        const originalText = passwordSaveBtn.innerText;
        passwordSaveBtn.innerText = "Saving...";

        // Clear previous errors
        ['current_password', 'new_password', 'confirm_password'].forEach(id => {
            const err = document.getElementById(`error_${id}`);
            if(err) err.textContent = "";
        });

        const formData = new FormData(passwordForm);
        fetch(passwordForm.action, { method: "POST", body: formData })
            .then(res => res.json())
            .then(data => {
                if(data.status === "success") {
                    passwordForm.reset();
                    if(matchMsg) matchMsg.textContent = "";
                    closePassModal(); 
                    showToast(data.message, "success"); 
                } else if(data.status === "error") {
                    if(data.errors) {
                        Object.keys(data.errors).forEach(field => {
                            const errEl = document.getElementById(`error_${field}`);
                            if(errEl) errEl.textContent = data.errors[field][0];
                        });
                    }
                }
            })
            .catch(err => { console.error(err); })
            .finally(() => {
                passwordSaveBtn.disabled = false;
                passwordSaveBtn.innerText = originalText;
            });
    });
});

function showToast(message, type="success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === "success" ? "#10b981" : "#ef4444";
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

