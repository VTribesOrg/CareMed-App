document.addEventListener("DOMContentLoaded", () => {

    const searchInput = document.getElementById("rental-search");
    const clearButton = document.getElementById("clear-search");
    const returnFilter = document.getElementById("return-filter");
    const clearFilterBtn = document.getElementById("clear-filter-btn");
    const rowLimitSelect = document.getElementById("row-limit-select");

    let searchTimeout;

    /**
     * Server-Side Live Search with Debounce & Page Reset
     */
    if (searchInput) {
        // Show/hide clear button on load depending on existing input value
        if (clearButton) {
            clearButton.style.display = searchInput.value.trim() ? "flex" : "none";
        }

        searchInput.addEventListener("input", function () {
            clearTimeout(searchTimeout);
            const term = this.value.trim();

            if (clearButton) {
                clearButton.style.display = term ? "flex" : "none";
            }

            // Debounce the server request so it doesn't reload on every keystroke instantly
            searchTimeout = setTimeout(() => {
                const url = new URL(window.location.href);
                if (term) {
                    url.searchParams.set("q", term);
                } else {
                    url.searchParams.delete("q");
                }
                url.searchParams.set("page", "1"); // Always reset to page 1 on search change
                window.location.href = url.toString();
            }, 500);
        });
    }

    /**
     * Clear Search
     */
    if (clearButton && searchInput) {
        clearButton.addEventListener("click", () => {
            searchInput.value = "";
            const url = new URL(window.location.href);
            url.searchParams.delete("q");
            url.searchParams.set("page", "1");
            window.location.href = url.toString();
        });
    }

    /**
     * Return Status Filter Dropdown
     */
    if (returnFilter) {
        returnFilter.addEventListener("change", function() {
            const filter = this.value;
            const url = new URL(window.location.href);
            
            if (filter) {
                url.searchParams.set("filter", filter);
            } else {
                url.searchParams.delete("filter");
            }
            url.searchParams.set("page", "1"); // Reset to page 1 on filter change
            window.location.href = url.toString();
        });
    }

    /**
     * Clear Return Filter & Search
     */
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener("click", function() {
            const url = new URL(window.location.href);
            url.searchParams.delete("filter");
            url.searchParams.delete("q");
            url.searchParams.set("page", "1");
            window.location.href = url.toString();
        });
    }

    /**
     * Show Entries Row Limit Dropdown
     */
    if (rowLimitSelect) {
        rowLimitSelect.addEventListener("change", function() {
            const limit = this.value;
            const url = new URL(window.location.href);
            url.searchParams.set("limit", limit);
            url.searchParams.set("page", "1"); // Reset to page 1 on limit change
            window.location.href = url.toString();
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