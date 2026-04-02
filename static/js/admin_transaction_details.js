    document.addEventListener('DOMContentLoaded', () => {
        const printBtn = document.getElementById('trigger-print');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    });


/*=================================== START OF ADD PAYMENT MODAL ===================================*/

document.addEventListener('DOMContentLoaded', function() {
    const paymentModal = document.getElementById('addPaymentModal');
    const paymentForm = document.getElementById('payment-form');
    const postBtn = document.getElementById('submit-payment');
    
    // UI Elements inside Modal
    const txnIdInput = document.getElementById('payment-txn-id');
    const summaryRef = document.getElementById('summary-ref');
    const summaryType = document.getElementById('summary-type');
    const summaryBalance = document.getElementById('summary-balance');
    const amountInput = document.getElementById('payment-amount');
    const amountError = document.getElementById('amount-error');
    const rentalQuickPay = document.getElementById('rental-quick-pay');
    const quickPayContainer = document.getElementById('quick-pay-button-container'); // Ensure this ID is in your HTML
    
    // Method/Ref Elements
    const paymentMethodSelect = document.getElementById('payment-method');
    const refGroup = document.getElementById('pm-ref-group');
    const refLabel = document.getElementById('pm-ref-label');
    const refInput = document.getElementById('payment-reference');

    let currentMonthlyRate = 0;
    let currentBalance = 0;
    let currentType = 'Rental';

    // 1. OPEN MODAL & DYNAMICALLY GENERATE BUTTONS
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-add-payment');
        if (!btn) return;

        e.preventDefault();

        // Extract Data
        const txnId = btn.getAttribute('data-txn-id');
        const refNo = btn.getAttribute('data-ref');
        currentType = btn.getAttribute('data-type') || 'Rental';
        currentBalance = parseFloat(btn.getAttribute('data-balance') || 0);
        currentMonthlyRate = parseFloat(btn.getAttribute('data-monthly-rate') || 0);
        const unpaidMonths = parseInt(btn.getAttribute('data-unpaid-count') || 1);

        // Populate Fields
        txnIdInput.value = txnId;
        summaryRef.innerText = refNo || 'N/A';
        summaryType.innerText = currentType;
        summaryBalance.innerText = `₱${currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        amountInput.value = currentBalance.toFixed(2);
        
        amountError.style.display = 'none';

        // 2. DYNAMIC QUICK PAY GENERATION
        if (currentType === 'Rental' && unpaidMonths > 1) {
            rentalQuickPay.style.display = 'block';
            quickPayContainer.innerHTML = ''; // Clear old buttons

            for (let i = 1; i <= unpaidMonths; i++) {
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'btn-month-pill';
                pill.innerText = `${i}${i === 1 ? 'mo' : 'mos'}`;
                
                pill.onclick = function() {
                    const total = (currentMonthlyRate * i).toFixed(2);
                    amountInput.value = total;
                    
                    // Toggle active class
                    document.querySelectorAll('.btn-month-pill').forEach(b => b.classList.remove('active'));
                    pill.classList.add('active');
                };
                quickPayContainer.appendChild(pill);
            }
            amountInput.placeholder = `Monthly Rate: ₱${currentMonthlyRate.toFixed(2)}`;
        } else {
            rentalQuickPay.style.display = 'none';
        }

        paymentModal.classList.remove('hidden');
    });

    // 3. PAYMENT METHOD LOGIC
    paymentMethodSelect.addEventListener('change', function() {
        const isCash = this.value === 'Cash';
        refGroup.style.display = isCash ? 'none' : 'block';
        refInput.required = !isCash;
        
        if (!isCash) {
            refLabel.innerText = (this.value === 'Check') ? "Check Number" : "Reference Number";
            refInput.placeholder = (this.value === 'Check') ? "Enter check #" : "Enter reference ID";
        }
    });

    // 4. VALIDATION & SUBMIT
    paymentForm.addEventListener('submit', function(e) {
        const amount = parseFloat(amountInput.value);

        if (isNaN(amount) || amount <= 0) {
            e.preventDefault();
            alert("Please enter a valid payment amount.");
            return;
        }

        postBtn.disabled = true;
        postBtn.innerHTML = `<span class="material-symbols-rounded">sync</span> Processing...`;
    });

    // 5. MODAL CLOSE LOGIC
    const closeModal = () => {
        paymentModal.classList.add('hidden');
        paymentForm.reset();
        refGroup.style.display = 'none';
        if(quickPayContainer) quickPayContainer.innerHTML = ''; 
    };

    document.querySelectorAll('#close-payment-modal, #cancel-payment').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) closeModal();
    });
});

/*=================================== END OF ADD PAYMENT MODAL ===================================*/