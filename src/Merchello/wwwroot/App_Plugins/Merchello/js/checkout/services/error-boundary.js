// @ts-check
/**
 * Merchello Checkout - Global Error Boundary
 *
 * Installs window-level error and unhandledrejection handlers to catch
 * unexpected JS failures. Logs all caught errors via the checkout logger
 * and shows a recovery UI for checkout-breaking errors (Alpine init,
 * module loading failures).
 *
 * Must be called once, early in page lifecycle (before Alpine.start()).
 */

const MAX_ERRORS = 20;
let errorCount = 0;
let recoveryUIShown = false;

/**
 * Check if a script URL is first-party (same-origin).
 * Third-party errors (Stripe SDK, PayPal SDK, analytics) are still
 * logged but don't trigger recovery UI.
 * @param {string|undefined} filename
 * @returns {boolean}
 */
function isFirstPartyScript(filename) {
    if (!filename) return true; // Inline scripts are ours
    try {
        const url = new URL(filename, window.location.origin);
        return url.origin === window.location.origin;
    } catch {
        return true;
    }
}

/**
 * Determine if an error is likely to break the checkout flow.
 * @param {string} message
 * @returns {boolean}
 */
function isCheckoutBreakingError(message) {
    const msg = (message || '').toLowerCase();
    if (msg.includes('alpine') || msg.includes('x-data') || msg.includes('x-bind')) return true;
    if (msg.includes('failed to fetch dynamically imported module')) return true;
    if (msg.includes('loading module') || msg.includes('loading chunk')) return true;
    if (msg.includes('cannot read properties of null') && msg.includes('queryselector')) return true;
    return false;
}

/**
 * Show a non-intrusive recovery banner at the top of the checkout.
 * Only shown once per page load.
 */
function showRecoveryUI() {
    if (recoveryUIShown) return;
    recoveryUIShown = true;

    try {
        const banner = document.createElement('div');
        banner.setAttribute('role', 'alert');
        banner.setAttribute('aria-live', 'assertive');
        banner.style.cssText = 'background:#fffbeb;border:1px solid #fcd34d;color:#92400e;padding:12px 16px;border-radius:8px;margin:0 0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:inherit;font-size:14px;line-height:1.5;';

        const messageDiv = document.createElement('div');
        messageDiv.textContent = 'Something went wrong loading the checkout. Please try refreshing the page. Your cart is saved and you can return at any time.';
        banner.appendChild(messageDiv);

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh';
        refreshBtn.style.cssText = 'padding:6px 16px;background:#d97706;color:#fff;border:none;border-radius:6px;cursor:pointer;white-space:nowrap;font-size:13px;font-weight:500;font-family:inherit;';
        refreshBtn.onmouseenter = () => { refreshBtn.style.background = '#b45309'; };
        refreshBtn.onmouseleave = () => { refreshBtn.style.background = '#d97706'; };
        refreshBtn.onclick = () => window.location.reload();
        banner.appendChild(refreshBtn);

        const target = document.querySelector('[x-data="singlePageCheckout"]')
            || document.querySelector('main')
            || document.body;
        target.prepend(banner);

        // Flush logs immediately so we capture the error before user refreshes
        window.MerchelloLogger?.flush(true);
    } catch {
        // Recovery UI creation failed - nothing more we can do
    }
}

/**
 * Install global error handlers for the checkout.
 * Call once before Alpine starts.
 */
export function installErrorBoundary() {
    // Catch synchronous errors
    window.addEventListener('error', (event) => {
        if (errorCount >= MAX_ERRORS) return;
        errorCount++;

        try {
            const isFirstParty = isFirstPartyScript(event.filename);
            const message = event.message || 'Unknown error';

            window.MerchelloLogger?.error(
                `Unhandled error: ${message}`,
                'general',
                {
                    source: event.filename ? event.filename.replace(window.location.origin, '') : 'inline',
                    line: event.lineno,
                    col: event.colno,
                    firstParty: isFirstParty
                }
            );

            if (isFirstParty && isCheckoutBreakingError(message)) {
                showRecoveryUI();
            }
        } catch {
            // Error boundary must never throw
        }
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        if (errorCount >= MAX_ERRORS) return;
        errorCount++;

        try {
            const reason = event.reason;
            const message = reason?.message || reason?.toString?.() || 'Unknown promise rejection';

            window.MerchelloLogger?.error(
                `Unhandled rejection: ${message}`,
                'general',
                {
                    stack: reason?.stack ? reason.stack.substring(0, 300) : undefined
                }
            );

            if (isCheckoutBreakingError(message)) {
                showRecoveryUI();
            }
        } catch {
            // Error boundary must never throw
        }
    });
}

export default { installErrorBoundary };
