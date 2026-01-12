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

// Import components
import { initSinglePageCheckout } from './components/single-page-checkout.js';
import { initContactSection } from './components/contact-section.js';
import { initAddressForm } from './components/address-form.js';
import { initShippingSelector } from './components/shipping-selector.js';
import { initPaymentSelector } from './components/payment-selector.js';
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

// Initialize the store first (components depend on it)
initCheckoutStore(initialData);

// Register all components
// These must be registered BEFORE Alpine.start() processes the DOM
initSinglePageCheckout();
initContactSection();
initAddressForm();
initShippingSelector();
initPaymentSelector();
initOrderSummary();
initExpressCheckout();

// Start Alpine - this processes all x-data attributes in the DOM
// All components are now registered, so no race conditions
Alpine.start();

// Export for testing and external use
export {
    Alpine,
    initCheckoutStore,
    initSinglePageCheckout,
    initContactSection,
    initAddressForm,
    initShippingSelector,
    initPaymentSelector,
    initOrderSummary,
    initExpressCheckout
};
