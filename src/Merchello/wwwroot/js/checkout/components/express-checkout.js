// @ts-check
/**
 * Merchello Checkout - Express Checkout Component
 *
 * Handles express checkout buttons (Apple Pay, Google Pay, PayPal, etc.)
 * Dynamically loads providers based on API configuration.
 */

/**
 * @typedef {Object} ExpressMethod
 * @property {string} providerAlias
 * @property {string} methodAlias
 * @property {string} displayName
 * @property {string} methodType
 * @property {string} [sdkUrl]
 * @property {string} [adapterUrl]
 */

/**
 * @typedef {Object} ExpressConfig
 * @property {ExpressMethod[]} methods
 * @property {number} amount
 * @property {string} currency
 * @property {string} country
 */

// Global registry for express checkout adapters
window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};

/**
 * Initialize the express checkout Alpine.data component
 */
export function initExpressCheckout() {
    // @ts-ignore - Alpine is global
    Alpine.data('expressCheckout', () => ({
        /** @type {boolean} */
        isLoading: true,

        /** @type {boolean} */
        isProcessing: false,

        /** @type {boolean} */
        hasExpressMethods: false,

        /** @type {string|null} */
        error: null,

        /** @type {ExpressConfig|null} */
        config: null,

        /** @type {Set<string>} */
        loadedSdks: new Set(),

        /** @type {boolean} */
        _initialized: false,

        /**
         * Initialize the component
         */
        async init() {
            // Guard against double initialization
            if (this._initialized) {
                return;
            }
            this._initialized = true;

            try {
                // Fetch express checkout configuration
                const response = await fetch('/api/merchello/checkout/express-config');

                if (!response.ok) {
                    throw new Error('Failed to load express checkout configuration');
                }

                this.config = await response.json();
                this.hasExpressMethods = this.config?.methods?.length > 0;

                // Listen for basket updates
                document.addEventListener('merchello:basket-updated', (e) => {
                    if (this.hasExpressMethods && this.config && e.detail?.total) {
                        this.config.amount = e.detail.total;
                    }
                });

            } catch (err) {
                console.error('Express checkout initialization failed:', err);
                this.error = 'Failed to load express checkout options.';
                this.hasExpressMethods = false;
            } finally {
                this.isLoading = false;
            }

            // Initialize buttons after loading state changes
            if (this.hasExpressMethods) {
                await this.$nextTick();
                // Wait for browser paint
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                await this.initializeExpressCheckout();
            }
        },

        /**
         * Initialize all express checkout methods
         */
        async initializeExpressCheckout() {
            const container = document.getElementById('express-buttons-container');
            if (!container) return;

            // Teardown existing buttons
            await this.teardownExpressButtons();
            container.innerHTML = '';

            // Process each method
            for (const method of this.config.methods) {
                try {
                    await this.initializeMethod(method, container);
                } catch (err) {
                    console.error(`Failed to initialize ${method.methodAlias}:`, err);
                }
            }
        },

        /**
         * Teardown all express checkout buttons
         */
        async teardownExpressButtons() {
            if (!window.MerchelloExpressAdapters) return;

            const tornDown = new Set();

            for (const key of Object.keys(window.MerchelloExpressAdapters)) {
                const adapter = window.MerchelloExpressAdapters[key];
                if (adapter && !tornDown.has(adapter) && typeof adapter.teardownAll === 'function') {
                    try {
                        adapter.teardownAll();
                        tornDown.add(adapter);
                    } catch (e) {
                        console.warn(`Failed to teardown adapter ${key}:`, e);
                    }
                }
            }
        },

        /**
         * Initialize a single express checkout method
         * @param {ExpressMethod} method
         * @param {HTMLElement} container
         */
        async initializeMethod(method, container) {
            // Load adapter script if provided
            if (method.adapterUrl && !this.loadedSdks.has(method.adapterUrl)) {
                await this.loadScript(method.adapterUrl);
                this.loadedSdks.add(method.adapterUrl);
            }

            // Load SDK if provided
            if (method.sdkUrl && !this.loadedSdks.has(method.sdkUrl)) {
                await this.loadScript(method.sdkUrl);
                this.loadedSdks.add(method.sdkUrl);
            }

            // Create wrapper for this button
            const wrapper = document.createElement('div');
            wrapper.id = `express-${method.providerAlias}-${method.methodAlias}-container`;
            wrapper.className = 'express-button-wrapper';
            container.appendChild(wrapper);

            // Get adapter for this method
            const adapter = this.getAdapter(method);

            if (adapter) {
                await adapter.render(wrapper, method, this.config, this);
            } else {
                // Fallback: generic button
                this.renderGenericButton(wrapper, method);
            }
        },

        /**
         * Get the appropriate adapter for a method
         * @param {ExpressMethod} method
         * @returns {any|null}
         */
        getAdapter(method) {
            // Check for provider-specific adapter
            const providerKey = `${method.providerAlias}:${method.methodAlias}`;
            if (window.MerchelloExpressAdapters[providerKey]) {
                return window.MerchelloExpressAdapters[providerKey];
            }

            // Check for method type adapter
            if (method.methodType && window.MerchelloExpressAdapters[method.methodType]) {
                return window.MerchelloExpressAdapters[method.methodType];
            }

            // Check for provider adapter
            if (window.MerchelloExpressAdapters[method.providerAlias]) {
                return window.MerchelloExpressAdapters[method.providerAlias];
            }

            return null;
        },

        /**
         * Render a generic express checkout button
         * @param {HTMLElement} container
         * @param {ExpressMethod} method
         */
        renderGenericButton(container, method) {
            const buttonClass = this.getButtonClass(method);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `express-button ${buttonClass}`;
            button.innerHTML = `<span>${method.displayName}</span>`;
            button.disabled = this.isProcessing;

            button.addEventListener('click', () => {
                this.handleGenericExpressCheckout(method);
            });

            container.appendChild(button);
        },

        /**
         * Get CSS class for a method type
         * @param {ExpressMethod} method
         * @returns {string}
         */
        getButtonClass(method) {
            const typeMap = {
                'ApplePay': 'express-button-applepay',
                'GooglePay': 'express-button-googlepay',
                'PayPal': 'express-button-paypal',
                'StripeLink': 'express-button-link'
            };
            return typeMap[method.methodType] || 'express-button-default';
        },

        /**
         * Handle generic express checkout
         * @param {ExpressMethod} method
         */
        handleGenericExpressCheckout(method) {
            this.error = `${method.displayName} requires provider-specific integration.`;
        },

        /**
         * Process express checkout payment
         * @param {string} providerAlias
         * @param {string} methodAlias
         * @param {string} paymentToken
         * @param {Object} customerData
         * @param {Object} providerData
         */
        async processExpressCheckout(providerAlias, methodAlias, paymentToken, customerData, providerData) {
            this.isProcessing = true;
            this.error = null;

            try {
                const response = await fetch('/api/merchello/checkout/express', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        providerAlias,
                        methodAlias,
                        paymentToken,
                        customerData,
                        providerData
                    })
                });

                const result = await response.json();

                if (result.success) {
                    window.location.href = result.redirectUrl || `/checkout/confirmation/${result.invoiceId}`;
                } else {
                    this.error = result.errorMessage || 'Payment failed. Please try again.';
                }
            } catch (err) {
                console.error('Express checkout failed:', err);
                this.error = 'An error occurred processing your payment.';
            } finally {
                this.isProcessing = false;
            }
        },

        /**
         * Load an external script dynamically
         * @param {string} src
         * @returns {Promise<void>}
         */
        loadScript(src) {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(script);
            });
        }
    }));
}

export default { initExpressCheckout };
