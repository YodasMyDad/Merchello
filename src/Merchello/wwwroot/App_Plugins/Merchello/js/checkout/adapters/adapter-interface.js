// @ts-check
/**
 * Merchello Checkout - Unified Payment Adapter Interface
 *
 * All payment adapters (standard and express) use this single interface.
 * Adapters register once and declare their capabilities.
 *
 * This consolidates the previously separate window.MerchelloPaymentAdapters
 * and window.MerchelloExpressAdapters into a unified registry.
 */

/**
 * @typedef {Object} PaymentAdapterConfig
 * @property {string} name - Human-readable adapter name
 * @property {boolean} supportsStandard - Can handle standard checkout flow
 * @property {boolean} supportsExpress - Can handle express checkout flow
 */

/**
 * @typedef {Object} RenderContext
 * @property {boolean} isExpress - Whether this is express checkout
 * @property {Object} [session] - Payment session (for standard checkout)
 * @property {Object} [checkout] - Checkout component instance
 * @property {Object} [method] - Payment method configuration (for express checkout)
 */

/**
 * @typedef {Object} PaymentAdapter
 * @property {PaymentAdapterConfig} config - Adapter configuration
 * @property {function(HTMLElement, Object, RenderContext): Promise<void>} render - Render payment UI
 * @property {function(string, Object): Promise<Object>} [submit] - Submit payment (for form-based)
 * @property {function(): Promise<Object>} [tokenize] - Tokenize card data
 * @property {function(string?): void} teardown - Cleanup resources
 * @property {function(Object, Object): Object} [extractCustomerData] - Extract customer data (for express)
 */

// Initialize registries
window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};

/**
 * Register a payment adapter
 *
 * @param {string} name - Unique adapter name (e.g., 'paypal', 'stripe')
 * @param {PaymentAdapter} adapter - Adapter implementation
 */
export function registerAdapter(name, adapter) {
    if (!name || typeof name !== 'string') {
        console.error('Invalid adapter name:', name);
        return;
    }

    if (!adapter || typeof adapter !== 'object') {
        console.error('Invalid adapter:', adapter);
        return;
    }

    // Validate required properties
    if (!adapter.config) {
        console.warn(`Adapter '${name}' missing config, creating default`);
        adapter.config = {
            name: name,
            supportsStandard: true,
            supportsExpress: false
        };
    }

    if (typeof adapter.render !== 'function') {
        console.error(`Adapter '${name}' missing required render function`);
        return;
    }

    if (typeof adapter.teardown !== 'function') {
        console.warn(`Adapter '${name}' missing teardown function, using no-op`);
        adapter.teardown = () => {};
    }

    // Register in standard adapters
    if (adapter.config.supportsStandard !== false) {
        window.MerchelloPaymentAdapters[name] = adapter;
    }

    // Auto-register for express if supported
    if (adapter.config.supportsExpress) {
        window.MerchelloExpressAdapters[name] = adapter;
    }

    console.debug(`Payment adapter '${name}' registered (standard: ${adapter.config.supportsStandard}, express: ${adapter.config.supportsExpress})`);
}

/**
 * Get an adapter by name
 *
 * @param {string} name - Adapter name
 * @param {boolean} [forExpress=false] - Whether this is for express checkout
 * @returns {PaymentAdapter|null}
 */
export function getAdapter(name, forExpress = false) {
    const adapters = forExpress
        ? window.MerchelloExpressAdapters
        : window.MerchelloPaymentAdapters;

    // Try exact match first
    if (adapters[name]) {
        return adapters[name];
    }

    // Try provider:method format for express (e.g., 'paypal:paylater')
    if (forExpress && name.includes(':')) {
        const [provider] = name.split(':');
        if (adapters[provider]) {
            return adapters[provider];
        }
    }

    return null;
}

/**
 * Check if an adapter is registered
 *
 * @param {string} name - Adapter name
 * @param {boolean} [forExpress=false] - Whether to check express registry
 * @returns {boolean}
 */
export function hasAdapter(name, forExpress = false) {
    return getAdapter(name, forExpress) !== null;
}

/**
 * Get all registered adapter names
 *
 * @param {boolean} [forExpress=false] - Whether to get express adapters
 * @returns {string[]}
 */
export function getRegisteredAdapters(forExpress = false) {
    const adapters = forExpress
        ? window.MerchelloExpressAdapters
        : window.MerchelloPaymentAdapters;
    return Object.keys(adapters);
}

/**
 * Unregister an adapter
 *
 * @param {string} name - Adapter name to remove
 */
export function unregisterAdapter(name) {
    delete window.MerchelloPaymentAdapters[name];
    delete window.MerchelloExpressAdapters[name];
}

/**
 * Create a standard adapter configuration object
 * Helper for adapter authors
 *
 * @param {string} name - Human-readable name
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.supportsStandard=true] - Supports standard checkout
 * @param {boolean} [options.supportsExpress=false] - Supports express checkout
 * @returns {PaymentAdapterConfig}
 */
export function createAdapterConfig(name, options = {}) {
    return {
        name,
        supportsStandard: options.supportsStandard ?? true,
        supportsExpress: options.supportsExpress ?? false
    };
}

export default {
    registerAdapter,
    getAdapter,
    hasAdapter,
    getRegisteredAdapters,
    unregisterAdapter,
    createAdapterConfig
};
