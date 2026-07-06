document.addEventListener('DOMContentLoaded', () => {

    /* ── 1. Inventory Tab Switcher ──────────────────────────────── */
    const tabButtons = document.querySelectorAll('.custom-tab-trigger');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const container = this.closest('.inventory-tracking-container');
            if (!container) return;

            // Deactivate all panels and buttons inside this container
            container.querySelectorAll('.inventory-data-panel').forEach(panel => {
                panel.classList.remove('is-active');
            });
            container.querySelectorAll('.custom-tab-trigger').forEach(btn => {
                btn.classList.remove('is-active');
            });

            // Activate selected panel and button
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('is-active');
            this.classList.add('is-active');
        });
    });

    /* ── 2. Oxygen Refill Modal Logic ───────────────────────────── */
    const oxygenModal = document.getElementById('oxygen-request-modal');
    const closeBtn = document.getElementById('close-oxygen-modal');
    const refillForm = document.getElementById('refill-form');
    // Targeting the oxygen panel specifically ensures this only affects oxygen tanks
    const oxygenPanel = document.getElementById('oxygen-tanks-panel');

    if (oxygenPanel) {
        oxygenPanel.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-refill-trigger');
            if (btn) {
                // Populate hidden inputs
                document.getElementById('refill-product-id').value = btn.dataset.productId;
                document.getElementById('refill-product-name').value = btn.dataset.productName;
                
                // Show modal
                oxygenModal.classList.remove('hidden');
            }
        });
    }

    // Function to close and reset
    const closeAndResetModal = () => {
        oxygenModal.classList.add('hidden');
        if (refillForm) refillForm.reset();
    };

    // Close Button Listener
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAndResetModal);
    }

    // Close when clicking overlay background
    if (oxygenModal) {
        oxygenModal.addEventListener('click', (e) => {
            if (e.target === oxygenModal) {
                closeAndResetModal();
            }
        });
    }

});