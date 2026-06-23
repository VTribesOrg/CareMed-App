document.addEventListener('DOMContentLoaded', () => {

    /* ── Inventory Tab Switcher ──────────────────────────────── */
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

});