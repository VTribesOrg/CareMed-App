document.addEventListener('DOMContentLoaded', function() {
    const paymentModal = document.getElementById('addPaymentModal');
    if (paymentModal) {
        const txnIdInput = document.getElementById('payment-txn-id');
        const invoiceIdInput = document.getElementById('payment-invoice-id');
        const paymentTypeInput = document.getElementById('payment-type');
        const summaryType = document.getElementById('summary-type');
        const summaryRef = document.getElementById('summary-ref');
        const summaryBalance = document.getElementById('summary-balance');
        const paymentAmountInput = document.getElementById('payment-amount');

        // Attach click event to all Pay Now buttons
        document.querySelectorAll('.open-payment-modal').forEach(button => {
            button.addEventListener('click', function() {
                const txnId = this.getAttribute('data-txn-id');
                const invoiceId = this.getAttribute('data-invoice-id');
                const type = this.getAttribute('data-type');
                const ref = this.getAttribute('data-ref');
                const balance = parseFloat(this.getAttribute('data-balance')) || 0.00;

                // Populate hidden inputs and summary view
                if (txnIdInput) txnIdInput.value = txnId;
                if (invoiceIdInput) invoiceIdInput.value = invoiceId;
                if (paymentTypeInput) paymentTypeInput.value = type;
                
                if (summaryType) summaryType.textContent = type;
                if (summaryRef) summaryRef.textContent = ref;
                
                if (summaryBalance) {
                    summaryBalance.textContent = `₱${balance.toFixed(2)}`;
                    summaryBalance.setAttribute('data-raw-balance', balance);
                }

                // Pre-fill amount field with remaining balance by default
                if (paymentAmountInput) {
                    paymentAmountInput.value = balance.toFixed(2);
                    paymentAmountInput.max = balance.toFixed(2);
                }

                // Show the modal
                paymentModal.classList.remove('hidden');
            });
        });

        // Close modal handlers
        const closeModalBtn = document.getElementById('close-payment-modal');
        const cancelPaymentBtn = document.getElementById('cancel-payment');

        [closeModalBtn, cancelPaymentBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    paymentModal.classList.add('hidden');
                });
            }
        });
    }

    // Live search auto-submission with debounce handler
    const searchInput = document.getElementById('table-search');
    if (searchInput) {
        let debounceTimer;

        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);

            const searchQuery = this.value;

            // Wait 400ms after the user stops typing before triggering the search
            debounceTimer = setTimeout(() => {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('q', searchQuery);
                currentUrl.searchParams.set('page', '1');
                window.location.href = currentUrl.toString();
            }, 400);
        });
    }

    // Row limit selector handler
    const rowLimitSelect = document.getElementById('row-limit-select');
    if (rowLimitSelect) {
        rowLimitSelect.addEventListener('change', function() {
            const limit = this.value;
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('limit', limit);
            currentUrl.searchParams.set('page', '1'); // Reset to page 1 on limit change
            window.location.href = currentUrl.toString();
        });
    }
});