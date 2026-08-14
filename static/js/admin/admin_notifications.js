(function () {
    const badge   = document.getElementById('notif-badge');
    const list    = document.getElementById('notif-list');
    const label   = document.getElementById('notif-count-label');

    const TYPE_ICON_COLOR = {
        warning: '#f97316',
        error:   '#dc2626',
        info:    '#00a8cc',
        success: '#16a34a'
    };

    function renderNotifications(data) {
        const { count, notifications } = data;

        // Update badge
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        // Update label
        label.textContent = count > 0 ? `${count} new` : '';

        // Render list
        if (!notifications || notifications.length === 0) {
            list.innerHTML = `
                <div class="dropdown-item" style="justify-content:center; flex-direction:column; gap:4px; padding:24px; text-align:center;">
                    <span class="material-symbols-rounded" style="font-size:28px; color:#cbd5e1;">notifications_off</span>
                    <span style="font-size:0.8rem; color:#94a3b8;">All caught up!</span>
                </div>`;
            return;
        }

        list.innerHTML = notifications.map(n => `
            <a href="${n.link}" class="dropdown-item">
                <span class="material-symbols-rounded" style="color:${TYPE_ICON_COLOR[n.type] || '#64748b'}">${n.icon}</span>
                <div>
                    <p style="margin:0; font-weight:600; font-size:0.82rem;">${n.title}</p>
                    <small style="color:#64748b;">${n.message}</small>
                </div>
            </a>`
        ).join('');
    }

    function showError() {
        list.innerHTML = `
            <div class="dropdown-item" style="justify-content:center; color:#dc2626; font-size:0.8rem; padding:16px;">
                <span class="material-symbols-rounded" style="font-size:16px; margin-right:6px;">error</span>
                Failed to load
            </div>`;
    }

    // ── Initial load via fetch (instant, no wait for SSE) ──────
    fetch('/admin/notifications/data', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(renderNotifications)
        .catch(showError);

    // ── SSE stream for live updates ────────────────────────────
    if (typeof EventSource !== 'undefined') {
        let es = null;
        let reconnectAttempts = 0;
        let reconnectTimer = null;

        function connect() {
            es = new EventSource('/admin/notifications/stream');

            es.onmessage = function (event) {
                try {
                    renderNotifications(JSON.parse(event.data));
                    reconnectAttempts = 0; // reset backoff once healthy again
                } catch (e) {
                    console.error('SSE parse error:', e);
                }
            };

            es.onerror = function () {
                console.warn('SSE connection lost — reconnecting with backoff.');
                es.close();

                // Exponential backoff on top of the server's retry hint,
                // capped at 5 minutes, so a persistently broken connection
                // backs off instead of retrying forever at a fixed pace.
                reconnectAttempts++;
                const delay = Math.min(15000 * Math.pow(2, reconnectAttempts - 1), 300000);
                reconnectTimer = setTimeout(connect, delay);
            };
        }

        connect();

        // Clean up on page unload to avoid zombie connections
        window.addEventListener('beforeunload', () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (es) es.close();
        });
    }
})();