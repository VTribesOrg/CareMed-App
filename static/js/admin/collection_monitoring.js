document.addEventListener('DOMContentLoaded', function() {
    // Payment Modal Handler
    const paymentModal = document.getElementById('addPaymentModal');
    if (paymentModal) {
        const txnIdInput = document.getElementById('payment-txn-id');
        const invoiceIdInput = document.getElementById('payment-invoice-id');
        const paymentTypeInput = document.getElementById('payment-type');
        const summaryType = document.getElementById('summary-type');
        const summaryRef = document.getElementById('summary-ref');
        const summaryBalance = document.getElementById('summary-balance');
        const paymentAmountInput = document.getElementById('payment-amount');

        document.querySelectorAll('.open-payment-modal').forEach(button => {
            button.addEventListener('click', function() {
                const txnId = this.getAttribute('data-txn-id');
                const invoiceId = this.getAttribute('data-invoice-id');
                const type = this.getAttribute('data-type');
                const ref = this.getAttribute('data-ref');
                const balance = parseFloat(this.getAttribute('data-balance')) || 0.00;

                if (txnIdInput) txnIdInput.value = txnId;
                if (invoiceIdInput) invoiceIdInput.value = invoiceId;
                if (paymentTypeInput) paymentTypeInput.value = type;
                
                if (summaryType) summaryType.textContent = type;
                if (summaryRef) summaryRef.textContent = ref;
                
                if (summaryBalance) {
                    summaryBalance.textContent = `₱${balance.toFixed(2)}`;
                    summaryBalance.setAttribute('data-raw-balance', balance);
                }

                if (paymentAmountInput) {
                    paymentAmountInput.value = balance.toFixed(2);
                    paymentAmountInput.max = balance.toFixed(2);
                }

                paymentModal.classList.remove('hidden');
            });
        });

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
            currentUrl.searchParams.set('page', '1');
            window.location.href = currentUrl.toString();
        });
    }

    // ---------- Collection Note Modal Controller ----------
    const noteModal = document.getElementById('noteModal');
    if (noteModal) {
        const noteInvoiceId = document.getElementById('note-invoice-id');
        const noteInvoiceRef = document.getElementById('note-invoice-ref');
        const noteText = document.getElementById('note-text');
        const noteMsg = document.getElementById('note-msg');
        const closeNoteBtn = document.getElementById('close-note-modal');
        const cancelNoteBtn = document.getElementById('cancel-note');
        const saveNoteBtn = document.getElementById('save-note');
        const saveBtnText = document.getElementById('save-btn-text');
        const charCount = document.getElementById('note-char-count');
        const clearBtn = document.getElementById('clear-note-btn');
        
        const modalTitle = document.getElementById('note-modal-title');
        const modalIconWrap = document.getElementById('modal-icon-wrapper');
        const modalSymbol = document.getElementById('modal-header-symbol');

        let currentNoteBtn = null;

        const closeNoteModal = () => {
            noteModal.classList.add('hidden');
            currentNoteBtn = null;
            window.currentColNoteBtn = null;
            if (noteText) noteText.value = '';
            if (noteMsg) { noteMsg.textContent = ''; noteMsg.className = ''; }
            if (charCount) charCount.textContent = '0 / 300';
            if (clearBtn) clearBtn.style.display = 'none';
        };

        const updateNoteUI = () => {
            if (!noteText) return;
            const len = noteText.value.length;
            if (charCount) charCount.textContent = `${len} / 300`;
            if (clearBtn) clearBtn.style.display = len > 0 ? 'inline-flex' : 'none';
        };

        // Open modal on Collection Note button click (.col-note-btn)
        document.querySelectorAll('.col-note-btn').forEach(button => {
            button.addEventListener('click', function () {
                const mode = this.dataset.mode || (this.getAttribute('data-notes') ? 'edit' : 'create');
                const invoiceId = this.getAttribute('data-invoice-id');
                const invoiceRefAttr = this.getAttribute('data-invoice-ref');
                const notes = this.getAttribute('data-notes') || '';
                
                const td = this.closest('td');
                const row = td ? td.parentElement : null;
                const customerCell = row ? row.querySelector('td:first-child') : null;
                const customerName = customerCell ? customerCell.textContent.trim() : '';

                if (noteInvoiceId) noteInvoiceId.value = invoiceId;
                
                if (noteInvoiceRef) {
                    if (invoiceRefAttr) {
                        noteInvoiceRef.textContent = invoiceRefAttr;
                    } else {
                        noteInvoiceRef.textContent = customerName
                            ? `Invoice #${invoiceId} — ${customerName}`
                            : `Invoice #${invoiceId}`;
                    }
                }
                
                if (noteText) noteText.value = notes;
                if (noteMsg) { noteMsg.textContent = ''; noteMsg.className = ''; }

                if (mode === 'edit' || notes.length > 0) {
                    if (modalTitle) modalTitle.textContent = 'Edit Collection Note';
                    if (saveBtnText) saveBtnText.textContent = 'Update Note';
                    if (modalIconWrap) modalIconWrap.className = 'note-modal-icon edit-mode';
                    if (modalSymbol) modalSymbol.textContent = 'sticky_note_2';
                } else {
                    if (modalTitle) modalTitle.textContent = 'Create Collection Note';
                    if (saveBtnText) saveBtnText.textContent = 'Save Note';
                    if (modalIconWrap) modalIconWrap.className = 'note-modal-icon create-mode';
                    if (modalSymbol) modalSymbol.textContent = 'note_add';
                }

                currentNoteBtn = this;
                window.currentColNoteBtn = this;
                updateNoteUI();
                noteModal.classList.remove('hidden');
                if (noteText) noteText.focus();
            });
        });

        if (noteText) {
            noteText.addEventListener('input', updateNoteUI);
        }

        document.querySelectorAll('.q-chip, .quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const template = chip.dataset.template;
                if (!noteText || !template) return;
                const current = noteText.value.trim();
                noteText.value = current ? `${current} ${template}` : template;
                noteText.focus();
                updateNoteUI();
            });
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (noteText) {
                    noteText.value = '';
                    noteText.focus();
                }
                updateNoteUI();
            });
        }

        [closeNoteBtn, cancelNoteBtn].forEach(btn => {
            if (btn) btn.addEventListener('click', closeNoteModal);
        });

        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) closeNoteModal();
        });

        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', async () => {
                const invoiceId = noteInvoiceId ? noteInvoiceId.value : null;
                const notes = noteText ? noteText.value.trim() : '';
                if (!invoiceId) return;

                saveNoteBtn.disabled = true;
                if (saveBtnText) saveBtnText.textContent = 'Saving...';

                try {
                    const response = await fetch(`/admin/collection-monitoring/invoice/${invoiceId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes })
                    });
                    const result = await response.json();

                    if (result.success && response.ok) {
                        if (noteMsg) {
                            noteMsg.style.color = '#16a34a';
                            noteMsg.textContent = result.message || 'Note saved successfully!';
                        }
                        
                        setTimeout(() => {
                            closeNoteModal();
                            window.location.reload();
                        }, 400);

                    } else {
                        if (noteMsg) {
                            noteMsg.style.color = '#dc2626';
                            noteMsg.textContent = result.message || 'Failed to save note.';
                        }
                    }
                } catch (err) {
                    if (noteMsg) {
                        noteMsg.style.color = '#dc2626';
                        noteMsg.textContent = 'Error saving note. Please try again.';
                    }
                } finally {
                    saveNoteBtn.disabled = false;
                    if (saveBtnText) saveBtnText.textContent = 'Save Note';
                }
            });
        }
    }
});