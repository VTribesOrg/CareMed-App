document.addEventListener("DOMContentLoaded", () => {

    const searchInput = document.getElementById("rental-search");
    const clearButton = document.getElementById("clear-search");
    const returnFilter = document.getElementById("return-filter");
    const clearFilterBtn = document.getElementById("clear-filter-btn");
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
        filterTable(); // Show clear button if page loads with search text
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
     * Return Status Filter Dropdown
     */
    if (returnFilter) {
        returnFilter.addEventListener("change", function() {
            const filter = this.value;
            const url = new URL(window.location);
            
            if (filter) {
                url.searchParams.set("filter", filter);
            } else {
                url.searchParams.delete("filter");
            }
            
            window.location = url.toString();
        });
    }

    /**
     * Clear Return Filter
     */
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener("click", function() {
            const url = new URL(window.location);
            url.searchParams.delete("filter");
            window.location = url.toString();
        });
    }

    /**
     * Copy Serial Number to Clipboard
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