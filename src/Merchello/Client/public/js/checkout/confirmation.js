// @ts-check
/**
 * Merchello Checkout - Confirmation Page Protection
 *
 * Prevents users from navigating back to the checkout form after completing an order.
 * This helps prevent duplicate order submission and provides a better user experience.
 */

(function() {
    'use strict';

    /**
     * Initialize browser back button protection
     * Replaces current history entry and intercepts popstate events
     */
    function initBackButtonProtection() {
        // Replace current history entry to remove checkout form from history
        if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
            history.replaceState(null, '', location.href);
        }

        // Intercept back button navigation
        window.addEventListener('popstate', function() {
            // Push current state back to prevent navigation away
            history.pushState(null, '', location.href);
        });
    }

    /**
     * Initialize confirmation page functionality
     */
    function init() {
        // Initialize back button protection
        initBackButtonProtection();

        // Clean up checkout-related storage
        cleanupCheckoutStorage();
    }

    /**
     * Clean up checkout-related session/local storage items
     * Prevents stale data from affecting future checkouts
     */
    function cleanupCheckoutStorage() {
        try {
            // Remove checkout session data (not purchase tracking keys)
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('merchello_checkout_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
        } catch (e) {
            // Storage may not be available in some contexts
            console.debug('Unable to clean up checkout storage:', e);
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { initBackButtonProtection, cleanupCheckoutStorage };
    }
})();
