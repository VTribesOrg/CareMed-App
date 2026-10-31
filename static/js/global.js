/* ======================================= START OF PROFILE DROPDOWN & SETTINGS ======================================= */
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const notifBtn = document.getElementById('notif-btn');
const notifDropdown = document.getElementById('notif-dropdown');
const settingsBtn = document.getElementById('settings-toggle-btn');
const settingsPopup = document.getElementById('settings-menu-popup');

function toggleDropdown(dropdown) {
    document.querySelectorAll('.header-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });
    dropdown.classList.toggle('active');
}

profileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(profileDropdown);
});

notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(notifDropdown);
});

settingsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    settingsPopup.classList.toggle('hidden');
});

window.addEventListener('click', (e) => {
    if (profileBtn && !profileBtn.contains(e.target)) profileDropdown.classList.remove('active');
    if (notifBtn && !notifBtn.contains(e.target)) notifDropdown.classList.remove('active');

    if (settingsPopup && !settingsPopup.contains(e.target) && e.target !== settingsBtn) {
        settingsPopup.classList.add('hidden');
    }
});
/* ======================================== END OF PROFILE DROPDOWN & SETTINGS ======================================== */


/* ======================================= START OF SIDEBAR STATE ======================================= */
document.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('sidebar-state');
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            localStorage.setItem('sidebar-collapsed', !this.checked);
        });
    }
});
/* ======================================== END OF SIDEBAR STATE ======================================== */



/*================== START OF MESSAGE NOTIFICATION ==================*/
/**
 * Core function to create and show a toast notification
 */
function showToast(message, category = 'info') {
    const container = document.getElementById('main-toast-container');
    const template = document.getElementById('toast-template');
    
    if (!container || !template) return;

    // 1. Clone the template
    const toastClone = template.content.cloneNode(true);
    const toastDiv = toastClone.querySelector('.medical-toast');

    // 2. Set Category Class (success, error, warning, info)
    toastDiv.classList.add(category);

    // 3. Set the Icon
    const icons = { 
        success: 'check_circle', 
        error: 'error', 
        warning: 'warning', 
        info: 'info' 
    };
    const iconElement = toastDiv.querySelector('.toast-icon');
    iconElement.textContent = icons[category] || 'info';

    // 4. Set Titles and Message
    const titleElement = toastDiv.querySelector('.toast-title');
    const messageElement = toastDiv.querySelector('.toast-message');
    
    titleElement.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    messageElement.textContent = message;

    // 5. Add to the DOM
    container.appendChild(toastDiv);

    // 6. Handle Auto-Removal
    setupToastAutoRemove(toastDiv);
}

/**
 * Shared logic to handle the fade-out and removal of a toast element
 */
function setupToastAutoRemove(toastElement) {
    setTimeout(() => {
        if (toastElement.parentNode) {
            // Apply the fade-out animation via JS
            toastElement.style.animation = 'toast-fade-out 0.5s ease forwards';
            
            toastElement.addEventListener('animationend', (e) => {
                if (e.animationName === 'toast-fade-out') {
                    toastElement.remove();
                }
            });
        }
    }, 4500); // 4.5s visible + 0.5s fade = 5s total
}

document.addEventListener('DOMContentLoaded', () => {
    const existingToasts = document.querySelectorAll('.medical-toast');
    existingToasts.forEach(toast => {
        setupToastAutoRemove(toast);
    });
});

document.addEventListener("DOMContentLoaded", function () {

    const container = document.getElementById("main-toast-container");

    if (!container) return;

    container.addEventListener("click", function (e) {

        const closeBtn = e.target.closest(".toast-close");

        if (closeBtn) {
            const toast = closeBtn.closest(".medical-toast");
            if (toast) toast.remove();
        }

    });

});
/*================== END OF MESSAGE NOTIFICATION ==================*/

/* ======================================= START OF CSP-COMPLIANT EVENT HANDLERS ======================================= */
/* All inline event handlers (onclick, onchange, onsubmit) have been moved here
   to satisfy strict Content Security Policy (no 'unsafe-inline'). */

document.addEventListener('DOMContentLoaded', function() {

  // ── 1. Jump-to-page buttons (replaces onclick="jumpToPage()") ──
  document.querySelectorAll('.js-jump-page').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const input = document.getElementById('jump-page-input');
      if (!input) return;
      const targetPage = parseInt(input.value, 10);
      const maxPage = parseInt(input.getAttribute('max'), 10);
      if (targetPage >= 1 && targetPage <= maxPage) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', targetPage);
        window.location.href = window.location.pathname + '?' + urlParams.toString();
      } else {
        alert('Please enter a valid page number between 1 and ' + maxPage + '.');
      }
    });
  });

  // ── 2. Copy reference number to clipboard ──
  document.querySelectorAll('.js-copy-ref').forEach(function(el) {
    el.addEventListener('click', async function(e) {
      e.preventDefault();
      const ref = el.getAttribute('data-ref');
      if (!ref) return;
      try {
        await navigator.clipboard.writeText(ref);
        // Brief visual feedback
        const original = el.innerHTML;
        el.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px; vertical-align: middle;">check</span>';
        setTimeout(function() { el.innerHTML = original; }, 1000);
      } catch (err) {
        console.error('Clipboard copy failed', err);
      }
    });
  });

  // ── 3. Confirm before submitting a form ──
  document.querySelectorAll('.js-confirm-form').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      const message = form.getAttribute('data-confirm');
      if (message && !confirm(message)) {
        e.preventDefault();
      }
    });
  });

  // ── 4. Confirm before clicking a submit button ──
  document.querySelectorAll('.js-confirm-submit').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      const message = btn.getAttribute('data-confirm');
      if (message && !confirm(message)) {
        e.preventDefault();
      }
    });
  });

  // ── 5. Confirm on select change + submit form ──
  document.querySelectorAll('.js-confirm-change').forEach(function(select) {
    select.addEventListener('change', function() {
      if (select.value === '') return;
      const message = select.getAttribute('data-confirm');
      if (message && confirm(message)) {
        select.form.submit();
      } else if (message) {
        select.selectedIndex = 0;
      }
    });
  });

});
/* ======================================== END OF CSP-COMPLIANT EVENT HANDLERS ======================================== */

/* ======================================= START OF FLASH AUTO-DISMISS (moved from nav_base.html inline script) ======================================= */
document.addEventListener('DOMContentLoaded', function() {
    const DISMISS_AFTER = 3000;

    function dismissBar(bar) {
        if (bar.classList.contains('dismissing')) return;
        bar.classList.add('dismissing');
        bar.addEventListener('animationend', function handler() {
            bar.removeEventListener('animationend', handler);
            bar.remove();
            const wrapper = document.getElementById('flash-wrapper');
            if (wrapper && !wrapper.querySelector('.flash-bar')) wrapper.remove();
        });
    }

    document.querySelectorAll('.flash-bar').forEach(function(bar) {
        const closeBtn = bar.querySelector('.flash-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() { dismissBar(bar); });
        }
        const timer = setTimeout(function() { dismissBar(bar); }, DISMISS_AFTER);
        bar.addEventListener('mouseenter', function() { clearTimeout(timer); });
        bar.addEventListener('mouseleave', function() {
            setTimeout(function() { dismissBar(bar); }, 800);
        });
    });
});
/* ======================================== END OF FLASH AUTO-DISMISS ======================================== */
/* ======================================= START OF NAV LOCKED HANDLER ======================================= */
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.nav-locked, .js-nav-locked').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
        });
    });
});
/* ======================================== END OF NAV LOCKED HANDLER ======================================== */




/* ======================================= START OF ICON BUTTON LINK HANDLER ======================================= */
/* Prevent default on icon-btn-sm links with href="#" (CSP-compliant replacement for javascript:void(0)) */
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a.icon-btn-sm[href="#"]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
        });
    });
});
/* ======================================== END OF ICON BUTTON LINK HANDLER ======================================== */

