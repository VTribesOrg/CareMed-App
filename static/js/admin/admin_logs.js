document.addEventListener('DOMContentLoaded', function() {
    const rowLimitSelect = document.getElementById('row-limit-select');
    const jumpBtn = document.getElementById('jump-page-submit');
    const jumpInput = document.getElementById('jump-page-input');


    if (rowLimitSelect) {
        rowLimitSelect.addEventListener('change', function() {
            const url = new URL(window.location.href);
            url.searchParams.set('limit', this.value);
            url.searchParams.set('page', 1); 
            window.location.href = url.href;
        });
    }

    if (jumpBtn) {
        jumpBtn.addEventListener('click', function() {
            const page = parseInt(jumpInput.value);
            const maxPage = parseInt(jumpInput.max);

            if (page >= 1 && page <= maxPage) {
                const url = new URL(window.location.href);
                url.searchParams.set('page', page);
                window.location.href = url.href;
            }
        });
    }

    if (jumpInput) {
        jumpInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                jumpBtn.click();
            }
        });
    }
});