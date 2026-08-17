/*=================================== START OF ADD PAYMENT MODAL ===================================*/

document.addEventListener('DOMContentLoaded', function() {
    const paymentModal = document.getElementById('addPaymentModal');
    const paymentForm = document.getElementById('payment-form');
    const postBtn = document.getElementById('submit-payment');
    
    // UI Elements inside Modal
    const txnIdInput = document.getElementById('payment-txn-id');
    const invoiceIdInput = document.getElementById('payment-invoice-id');
    const paymentTypeInput = document.getElementById('payment-type'); 
    const summaryRef = document.getElementById('summary-ref'); // Added missing declaration
    const summaryType = document.getElementById('summary-type');
    const summaryBalance = document.getElementById('summary-balance');
    const amountInput = document.getElementById('payment-amount');
    const amountError = document.getElementById('amount-error');
    const rentalQuickPay = document.getElementById('rental-quick-pay');
    const quickPayContainer = document.getElementById('quick-pay-button-container');
    
    // Method/Ref Elements
    const paymentMethodSelect = document.getElementById('payment-method');
    const refGroup = document.getElementById('pm-ref-group');
    const refLabel = document.getElementById('pm-ref-label');
    const refInput = document.getElementById('payment-reference');

    // Receipt File Elements
    const receiptInput = document.getElementById('receipt-image');
    const receiptPreviewWrap = document.getElementById('receipt-preview-wrap');
    const receiptPreview = document.getElementById('receipt-preview');
    const receiptFilename = document.getElementById('receipt-filename');
    const receiptStatus = document.getElementById('receipt-status');
    const replaceFileBtn = document.getElementById('replace-file');
    const removeFileBtn = document.getElementById('remove-file');

    let currentMonthlyRate = 0;
    let currentBalance = 0;
    let currentType = 'Rental';

    // Helper to reset receipt input state
    const resetReceiptUpload = () => {
        if (receiptInput) receiptInput.value = '';
        if (receiptPreviewWrap) receiptPreviewWrap.style.display = 'none';
        if (receiptPreview) receiptPreview.src = '';
        if (receiptFilename) receiptFilename.innerText = '';
        if (receiptStatus) {
            receiptStatus.innerText = 'cloud_upload';
            receiptStatus.style.color = '#aaa';
        }
    };

    // 1. OPEN MODAL & DYNAMICALLY GENERATE BUTTONS
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-add-payment');
        if (!btn) return;

        e.preventDefault();

        // Extract Data (Including specific Invoice ID and payment type)
        const txnId = btn.getAttribute('data-txn-id');
        const invoiceId = btn.getAttribute('data-invoice-id') || '';
        const refNo = btn.getAttribute('data-ref');
        currentType = btn.getAttribute('data-type') || 'Rental';
        currentBalance = parseFloat(btn.getAttribute('data-balance') || 0);
        currentMonthlyRate = parseFloat(btn.getAttribute('data-monthly-rate') || 0);
        const unpaidMonths = parseInt(btn.getAttribute('data-unpaid-count') || 1);

        // Populate Hidden & Summary Fields
        if (txnIdInput) txnIdInput.value = txnId;
        if (invoiceIdInput) invoiceIdInput.value = invoiceId;
        if (paymentTypeInput) paymentTypeInput.value = currentType; // Populates InitialFill or Rental

        if (summaryRef) summaryRef.innerText = refNo || 'N/A';
        if (summaryType) summaryType.innerText = currentType === 'InitialFill' ? 'Initial Fill Fee' : currentType;
        if (summaryBalance) {
            summaryBalance.innerText = `₱${currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            summaryBalance.setAttribute('data-raw-balance', currentBalance);
        }

        if (amountInput) {
            amountInput.value = currentBalance.toFixed(2);
            amountInput.max = currentBalance;
        }
        
        if (amountError) amountError.style.display = 'none';

        // 2. DYNAMIC QUICK PAY GENERATION (Only for Rental invoices with multiple months)
        if (currentType === 'Rental' && unpaidMonths > 1) {
            if (rentalQuickPay) rentalQuickPay.style.display = 'block';
            if (quickPayContainer) {
                quickPayContainer.innerHTML = ''; // Clear old buttons

                for (let i = 1; i <= unpaidMonths; i++) {
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'btn-month-pill';
                    pill.innerText = `${i}${i === 1 ? 'mo' : 'mos'}`;
                    
                    pill.onclick = function() {
                        const total = (currentMonthlyRate * i).toFixed(2);
                        if (amountInput) amountInput.value = total;
                        
                        // Toggle active class
                        document.querySelectorAll('.btn-month-pill').forEach(b => b.classList.remove('active'));
                        pill.classList.add('active');
                    };
                    quickPayContainer.appendChild(pill);
                }
            }
            if (amountInput) amountInput.placeholder = `Monthly Rate: ₱${currentMonthlyRate.toFixed(2)}`;
        } else {
            if (rentalQuickPay) rentalQuickPay.style.display = 'none';
        }

        resetReceiptUpload();
        if (paymentModal) paymentModal.classList.remove('hidden');
    });

    // 3. PAYMENT METHOD LOGIC
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', function() {
            const isCash = this.value === 'Cash';
            if (refGroup) refGroup.style.display = isCash ? 'none' : 'block';
            if (refInput) refInput.required = !isCash;
            
            if (!isCash && refLabel && refInput) {
                refLabel.innerText = (this.value === 'Check') ? "Check Number" : "Reference Number";
                refInput.placeholder = (this.value === 'Check') ? "Enter check #" : "Enter reference ID";
            }
        });
    }

    // 4. RECEIPT FILE PREVIEW & ACTIONS
    if (receiptInput) {
        receiptInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                if (receiptFilename) receiptFilename.innerText = file.name;
                if (receiptStatus) {
                    receiptStatus.innerText = 'check_circle';
                    receiptStatus.style.color = '#2e7d32';
                }

                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        if (receiptPreview) receiptPreview.src = e.target.result;
                        if (receiptPreviewWrap) receiptPreviewWrap.style.display = 'flex';
                    };
                    reader.readAsDataURL(file);
                } else {
                    if (receiptPreview) receiptPreview.src = '';
                    if (receiptPreviewWrap) receiptPreviewWrap.style.display = 'flex';
                }
            }
        });
    }

    if (replaceFileBtn && receiptInput) {
        replaceFileBtn.addEventListener('click', () => receiptInput.click());
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', resetReceiptUpload);
    }

    // 5. VALIDATION & SUBMIT
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            const amount = parseFloat(amountInput.value);

            if (isNaN(amount) || amount <= 0) {
                e.preventDefault();
                alert("Please enter a valid payment amount.");
                return;
            }

            if (postBtn) {
                postBtn.disabled = true;
                postBtn.innerHTML = `<span class="material-symbols-rounded">sync</span> Processing...`;
            }
        });
    }

    // 6. MODAL CLOSE LOGIC
    const closeModal = () => {
        if (paymentModal) paymentModal.classList.add('hidden');
        if (paymentForm) paymentForm.reset();
        if (refGroup) refGroup.style.display = 'none';
        if (quickPayContainer) quickPayContainer.innerHTML = '';
        if (postBtn) {
            postBtn.disabled = false;
            postBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Post Payment`;
        }
        resetReceiptUpload();
    };

    document.querySelectorAll('#close-payment-modal, #cancel-payment').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) closeModal();
    });
});

/*=================================== END OF ADD PAYMENT MODAL ===================================*/


document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('cancelInvoiceModal');
    const form = document.getElementById('cancelInvoiceForm');
    const periodSpan = document.getElementById('cancelInvoicePeriod');

    document.querySelectorAll('.custom-open-cancel-modal').forEach(button => {
        button.addEventListener('click', function () {
            const cancelUrl = this.getAttribute('data-cancel-url');
            const period = this.getAttribute('data-period');

            form.action = cancelUrl;
            periodSpan.textContent = period;
            modal.style.display = 'flex';
        });
    });

    const closeModal = () => { modal.style.display = 'none'; };
    
    document.getElementById('closeCancelModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelCancelModal')?.addEventListener('click', closeModal);
    
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });
});


const input = document.getElementById("receipt-image");
const previewWrap = document.getElementById("receipt-preview-wrap");
const previewImg = document.getElementById("receipt-preview");
const fileName = document.getElementById("receipt-filename");
const statusIcon = document.getElementById("receipt-status");

const replaceBtn = document.getElementById("replace-file");
const removeBtn = document.getElementById("remove-file");

function resetUpload() {
    input.value = "";
    previewWrap.style.display = "none";

    statusIcon.textContent = "cloud_upload";
    statusIcon.style.color = "#aaa";
}

input.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    fileName.textContent = file.name;

    statusIcon.textContent = "check_circle";
    statusIcon.style.color = "#2e7d32";

    previewWrap.style.display = "flex";

    // Image preview only (skip PDF)
    if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = e => previewImg.src = e.target.result;
        reader.readAsDataURL(file);
    } else {
        previewImg.src =
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>
                <rect width='100%' height='100%' fill='#f2f2f2'/>
                <text x='50%' y='50%' text-anchor='middle' dy='.3em' font-size='10'>PDF</text>
            </svg>`);
    }
});

replaceBtn.addEventListener("click", () => {
    input.click();
});

removeBtn.addEventListener("click", () => {
    resetUpload();
});