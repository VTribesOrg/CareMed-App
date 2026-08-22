document.addEventListener("DOMContentLoaded", function() {
    // Grab the CSRF token from the meta tag in the HTML head
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    fetch('/admin/backup/data')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('backupTableBody');
            const countLabel = document.getElementById('backupCountLabel');
            const emptyState = document.getElementById('backupEmptyState');
            const tableElement = document.querySelector('.backup-table');
            
            tbody.innerHTML = ''; // Clear loading spinner

            if (!data || data.length === 0) {
                tableElement.style.display = 'none';
                emptyState.style.display = 'block';
                countLabel.innerText = '0 backups — max 7 kept';
                return;
            }

            tableElement.style.display = 'table';
            emptyState.style.display = 'none';
            countLabel.innerText = `Last ${data.length} backups — max 7 kept`;

            data.forEach(backup => {
                const isManual = backup.triggered_by === 'admin';
                const pillClass = isManual ? 'pill pill-blue' : 'pill pill-green';
                const pillText = isManual ? 'Manual' : 'Auto';

                const row = `
                    <tr>
                        <td style="font-family:monospace; font-size:0.72rem; color:#475569;">${backup.filename}</td>
                        <td style="font-size:0.78rem; color:#64748b; white-space:nowrap;">${backup.created_at}</td>
                        <td style="font-size:0.78rem;">${backup.size_kb} KB</td>
                        <td>
                            <span class="${pillClass}">${pillText}</span>
                        </td>
                        <td>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <a href="/admin/backup/download/${backup.filename}" class="btn-dl">
                                    <span class="material-symbols-rounded" style="font-size:14px;">download</span>Download
                                </a>
                                <form method="POST" action="/admin/backup/delete/${backup.filename}" class="delete-backup-form">
                                    <input type="hidden" name="csrf_token" value="${csrfToken}">
                                    <button type="submit" class="btn-del">Delete</button>
                                </form>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        })
        .catch(error => {
            console.error('Error loading backups:', error);
            document.getElementById('backupTableBody').innerHTML = `<tr><td colspan="5" class="text-center" style="color:red; text-align:center; padding:20px;">Failed to load backup history.</td></tr>`;
        });

    document.addEventListener('submit', function(event) {
        if (event.target && event.target.classList.contains('delete-backup-form')) {
            if (!confirm('Delete this backup? This cannot be undone.')) {
                event.preventDefault();
            }
        }
    });
});