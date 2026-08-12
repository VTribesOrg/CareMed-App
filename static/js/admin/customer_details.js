document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('idViewModal');
    const modalImg = document.getElementById('idViewImage');
    const closeBtn = document.querySelector('.idview-close-btn');

    // 1. Open Modal when clicking the View ID buttons
    document.querySelectorAll('.js-view-image').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const imgSrc = this.getAttribute('data-src');
            
            if (imgSrc) {
                modalImg.src = imgSrc;
                modal.style.display = 'flex';
                // Prevent body scroll when modal is open
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // 2. Close Modal function
    function closeIdModal() {
        modal.style.display = 'none';
        modalImg.src = ''; // Clear source to save memory
        document.body.style.overflow = ''; // Restore scroll
    }

    // 3. Close on Button Click
    if (closeBtn) {
        closeBtn.addEventListener('click', closeIdModal);
    }

    // 4. Close on Clicking Outside (Background)
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeIdModal();
            }
        });
    }

    // 5. Close on Escape Key
    document.addEventListener('keydown', function(e) {
        if (e.key === "Escape" && modal && modal.style.display === 'flex') {
            closeIdModal();
        }
    });

    // 6. Tab Switcher Logic for Active Rentals / Transaction History
    const tabBtns = document.querySelectorAll('.cdp-tab-btn');
    const tabPanels = document.querySelectorAll('.cdp-tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => {
                b.style.background = 'transparent';
                b.style.color = '#64748b';
                b.style.boxShadow = 'none';
                b.classList.remove('active');
            });

            this.style.background = '#ffffff';
            this.style.color = '#0f172a';
            this.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            this.classList.add('active');

            tabPanels.forEach(panel => panel.style.display = 'none');

            const targetId = this.getAttribute('data-target');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.style.display = 'block';
            }
        });
    });
});

document.addEventListener('submit', function (e) {
    // Check if the submitted form has our revoke class
    if (e.target && e.target.classList.contains('js-revoke-form')) {
        const confirmAction = confirm("Are you sure you want to revoke this user's verification? This action will restrict their account access.");
        
        if (!confirmAction) {
            // If user clicks 'Cancel', stop the form from submitting
            e.preventDefault();
        }
    }
});

document.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
        if (row.dataset.href) {
            window.location.href = row.dataset.href;
        }
    });
});