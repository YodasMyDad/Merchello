// @ts-check
/**
 * Merchello Checkout - Module Entry Point
 *
 * This is the main entry point for the modular checkout system.
 * It imports Alpine as an ES module and controls when it starts,
 * ensuring all components are registered before Alpine processes the DOM.
 */

// Import Alpine and plugins as ES modules
import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';

// Import store
import { initCheckoutStore } from './stores/checkout.store.js';

// Import payment module (handles form rendering and payment flow)
import MerchelloPayment from './payment.js';

// Import components
import { initSinglePageCheckout } from './components/single-page-checkout.js';
import { initOrderSummary } from './components/order-summary.js';
import { initExpressCheckout } from './components/express-checkout.js';

// Make Alpine available globally (required for Alpine.data, Alpine.store)
window.Alpine = Alpine;

// Register Alpine plugins
Alpine.plugin(collapse);

/**
 * Read initial checkout data from the DOM
 * @returns {Object}
 */
function getInitialDataFromDOM() {
    const element = document.getElementById('checkout-initial-data');
    if (!element) return {};

    try {
        return JSON.parse(element.textContent || '{}');
    } catch (e) {
        console.warn('Failed to parse checkout initial data:', e);
        return {};
    }
}

// Get initial data from the page
const initialData = getInitialDataFromDOM();
console.log('[Checkout] Initial data loaded:', initialData);

// Initialize the store first (components depend on it)
console.log('[Checkout] Initializing store...');
initCheckoutStore(initialData);
console.log('[Checkout] Store initialized');

// Register all components
// These must be registered BEFORE Alpine.start() processes the DOM
console.log('[Checkout] Registering singlePageCheckout...');
initSinglePageCheckout();
console.log('[Checkout] Registering orderSummary...');
initOrderSummary();
console.log('[Checkout] Registering expressCheckout...');
initExpressCheckout();
console.log('[Checkout] All components registered');

// Start Alpine - this processes all x-data attributes in the DOM
// All components are now registered, so no race conditions
console.log('[Checkout] Starting Alpine...');
Alpine.start();
console.log('[Checkout] Alpine started successfully');

// Export for testing and external use
export {
    Alpine,
    MerchelloPayment,
    initCheckoutStore,
    initSinglePageCheckout,
    initOrderSummary,
    initExpressCheckout
};
