    document.addEventListener('DOMContentLoaded', () => {
        const printBtn = document.getElementById('trigger-print');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    });