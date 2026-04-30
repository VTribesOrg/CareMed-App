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
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeIdModal();
        }
    });

    // 5. Close on Escape Key
    document.addEventListener('keydown', function(e) {
        if (e.key === "Escape" && modal.style.display === 'flex') {
            closeIdModal();
        }
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
        window.location.href = row.dataset.href;
    });
});