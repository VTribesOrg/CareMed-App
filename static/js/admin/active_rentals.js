document.addEventListener("DOMContentLoaded", () => {

    const searchInput = document.getElementById("rental-search");
    const clearButton = document.getElementById("clear-search");
    const rows = document.querySelectorAll("#rentals-table tbody tr[data-search]");

    /**
     * Live Search
     */
    function filterTable() {
        const term = searchInput.value.trim().toLowerCase();

        rows.forEach(row => {
            row.style.display = row.dataset.search.includes(term) ? "" : "none";
        });

        clearButton.style.display = term ? "flex" : "none";
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterTable);

        // Show clear button if page loads with search text
        filterTable();
    }

    /**
     * Clear Search
     */
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            searchInput.value = "";
            filterTable();
            searchInput.focus();
        });
    }

    /**
     * Copy Serial Number
     */
    document.querySelectorAll(".copy-serial").forEach(button => {

        button.addEventListener("click", async () => {

            const serial = button.dataset.serial;

            if (!serial) return;

            try {

                await navigator.clipboard.writeText(serial);

                const icon = button.querySelector(".material-symbols-rounded");
                const original = icon.textContent;

                icon.textContent = "check";
                button.classList.add("copied");

                setTimeout(() => {
                    icon.textContent = original;
                    button.classList.remove("copied");
                }, 1200);

            } catch (err) {
                console.error("Unable to copy serial:", err);
            }

        });

    });

});