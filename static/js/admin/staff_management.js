document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Modals
    const createModal = document.getElementById('create-user-modal');
    const editModal = document.getElementById('edit-user-modal');
    
    // Create User Modal Logic
    const openCreateBtn = document.getElementById('open-modal-btn');
    const closeCreateBtn = document.getElementById('close-modal-btn');

    if (openCreateBtn) {
        openCreateBtn.addEventListener('click', () => createModal.classList.remove('hidden'));
    }
    if (closeCreateBtn) {
        closeCreateBtn.addEventListener('click', () => createModal.classList.add('hidden'));
    }

    // Edit User Modal Logic
    const closeEditBtn = document.getElementById('close-edit-modal-btn');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    }

    // 2. Table Event Delegation
    const staffTable = document.querySelector('.staff-data-table');
    if (staffTable) {
        staffTable.addEventListener('click', (e) => {
            // Handle Edit Click
            const editBtn = e.target.closest('.edit-user-btn');
            if (editBtn) {
                // Populate Basic Info
                document.getElementById('edit-user-id').value = editBtn.dataset.userId;
                document.getElementById('edit-user-role').value = editBtn.dataset.role;
                document.getElementById('edit-user-name').innerText = 
                    `Editing: ${editBtn.dataset.firstName} ${editBtn.dataset.lastName}`;
                
                // Populate Permission Toggles
                const permissionFields = [
                    'can_manage_customers', 'can_manage_products', 'can_process_transactions', 
                    'can_confirm_payments', 'can_manage_expenses', 'can_view_reports'
                ];

                permissionFields.forEach(field => {
                    const checkbox = editModal.querySelector(`input[name="${field}"]`);
                    if (checkbox) {
                        // Convert snake_case (can_manage_customers) to camelCase (canManageCustomers)
                        // because dataset attributes are automatically camelCased by the browser
                        const camelCaseField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                        
                        // Check the attribute and compare to the string "true"
                        checkbox.checked = editBtn.dataset[camelCaseField] === 'true';
                    }
                });
                
                editModal.classList.remove('hidden');
            }
        });
    }

    // 3. Delete Form Submission Confirmation
    document.querySelectorAll('.delete-user-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!confirm('WARNING: This will remove access for this user. Are you sure?')) {
                e.preventDefault();
            }
        });
    });
});