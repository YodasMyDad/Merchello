// @ts-check
/**
 * Merchello Checkout Security Utilities
 *
 * Security-related helper functions for the checkout flow.
 */

/**
 * Validates that a redirect URL is safe to navigate to.
 * Only allows redirects to the same origin and within the checkout path.
 *
 * @param {string|null|undefined} url - The URL to validate
 * @returns {boolean} True if the URL is safe to redirect to
 */
export function isValidRedirectUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        // Parse the URL relative to the current origin
        const parsed = new URL(url, window.location.origin);

        // Only allow same-origin redirects
        if (parsed.origin !== window.location.origin) {
            console.warn('Blocked redirect to external origin:', parsed.origin);
            return false;
        }

        // Only allow redirects within checkout paths
        const allowedPaths = ['/checkout'];
        const isAllowedPath = allowedPaths.some(path => parsed.pathname.startsWith(path));

        if (!isAllowedPath) {
            console.warn('Blocked redirect to non-checkout path:', parsed.pathname);
            return false;
        }

        return true;
    } catch (e) {
        console.warn('Invalid redirect URL:', url, e);
        return false;
    }
}

/**
 * Safely redirects to a URL after validation.
 * Falls back to the checkout page if the URL is invalid.
 *
 * @param {string|null|undefined} url - The URL to redirect to
 * @param {string} [fallbackUrl='/checkout'] - URL to use if validation fails
 */
export function safeRedirect(url, fallbackUrl = '/checkout') {
    if (isValidRedirectUrl(url)) {
        window.location.href = url;
    } else {
        console.error('Unsafe redirect blocked. Using fallback:', fallbackUrl);
        window.location.href = fallbackUrl;
    }
}
