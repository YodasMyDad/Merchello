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
 * @property {number} subTotal
 * @property {number} shipping
 * @property {number} tax
 * @property {string} currency
 * @property {string} country
 * @property {number} decimalPlaces - Decimal places for the active currency (e.g., 2 for GBP, 0 for JPY)
 */

import { safeRedirect } from '../utils/security.js';

// Global registry for express checkout adapters
window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};

/**
 * Initialize the express checkout Alpine.data component
 */
export function initExpressCheckout() {
    // @ts-ignore - Alpine is global
    Alpine.data('expressCheckout', () => {
        console.log('[expressCheckout] Creating component...');
        try {
            const componentData = {
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

        /** @type {Object.<string, boolean>} */
        loadedSdks: {},

        /** @type {boolean} */
        _initialized: false,

        /** @type {number} */
        _expressRequestId: 0,

        /** @type {number|null} */
        _reRenderTimeout: null,

        /** @type {number} */
        _lastKnownAmount: 0,

        /** @type {boolean} - Skip re-renders during payment form initialization */
        _skipReRender: false,

        /** @type {boolean} - Track if a re-render was skipped and needs to be done later */
        _pendingReRender: false,

        /** @type {number} - Request ID for re-renders to handle cancellation */
        _reRenderRequestId: 0,

        /**
         * Set the skip re-render flag with pending re-render support
         * @param {boolean} skip
         */
        setSkipReRender(skip) {
            const wasSkipping = this._skipReRender;
            this._skipReRender = skip;

            // When skip becomes true, cancel any pending debounced re-render
            // to prevent it from firing while we're supposed to be skipping
            if (skip && this._reRenderTimeout) {
                clearTimeout(this._reRenderTimeout);
                this._reRenderTimeout = null;
            }

            // When transitioning from skip=true to skip=false,
            // check if we need to do a pending re-render
            if (wasSkipping && !skip && this._pendingReRender) {
                this._pendingReRender = false;
                this.initializeExpressCheckout();
            }
        },

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
                // Fetch express checkout configuration (methods, SDK urls, etc.)
                const response = await fetch('/api/merchello/checkout/express-config');

                if (!response.ok) {
                    throw new Error('Failed to load express checkout configuration');
                }

                this.config = await response.json();
                this.hasExpressMethods = this.config?.methods?.length > 0;

                // API now returns amounts already converted to display currency with proper rounding
                // No client-side override needed - backend handles currency conversion via DisplayCurrencyExtensions

                // Listen for basket updates to keep express checkout in sync
                document.addEventListener('merchello:basket-updated', (e) => {
                    if (!this.hasExpressMethods || !this.config || !e.detail) return;

                    const oldAmount = this.config.amount;
                    const newAmount = e.detail.total ?? oldAmount;

                    // ALWAYS update config values - even when skipping re-render
                    // This ensures the config stays in sync with the basket
                    if (e.detail.total !== undefined) {
                        this.config.amount = e.detail.total;
                    }
                    if (e.detail.shipping !== undefined) {
                        this.config.shipping = e.detail.shipping;
                    }
                    if (e.detail.tax !== undefined) {
                        this.config.tax = e.detail.tax;
                    }
                    if (e.detail.subTotal !== undefined) {
                        this.config.subTotal = e.detail.subTotal;
                    }

                    // Check if amount changed by at least one minor unit for this currency
                    const threshold = Math.pow(10, -(this.config.decimalPlaces ?? 2));
                    const amountChanged = Math.abs(newAmount - oldAmount) > threshold;
                    if (amountChanged) {
                        // Skip actual re-render during payment form initialization
                        // but mark that we need to re-render later
                        if (this._skipReRender) {
                            this._pendingReRender = true;
                            // Also cancel any pending debounced re-render from before skip was set
                            if (this._reRenderTimeout) {
                                clearTimeout(this._reRenderTimeout);
                                this._reRenderTimeout = null;
                            }
                            return;
                        }

                        // Debounce re-render to avoid rapid flickering during shipping calculations
                        if (this._reRenderTimeout) {
                            clearTimeout(this._reRenderTimeout);
                        }

                        this._reRenderTimeout = setTimeout(async () => {
                            this._reRenderTimeout = null;
                            this._lastKnownAmount = this.config.amount;
                            await this.initializeExpressCheckout();
                        }, 300);
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
         * Renders directly to DOM container (required by PayPal SDK)
         */
        async initializeExpressCheckout() {
            const container = document.getElementById('express-buttons-container');
            if (!container) return;

            const methods = this.config?.methods;
            if (!methods || methods.length === 0) return;

            // Increment request ID to invalidate any in-progress renders
            const requestId = ++this._reRenderRequestId;

            // Set minimum height to prevent layout shift during re-render
            const currentHeight = container.offsetHeight;
            if (currentHeight > 0) {
                container.style.minHeight = `${currentHeight}px`;
            }

            // Teardown existing buttons before re-render
            await this.teardownExpressButtons();

            // Check if this render was superseded by a newer one
            if (requestId !== this._reRenderRequestId) {
                return;
            }

            container.innerHTML = '';

            // Render buttons directly to DOM container
            // PayPal SDK requires container to be in the actual DOM
            for (const method of methods) {
                // Check if superseded before each method init (they can be slow)
                if (requestId !== this._reRenderRequestId) {
                    return;
                }

                try {
                    await this.initializeMethod(method, container);
                } catch (err) {
                    console.error(`Failed to initialize ${method.methodAlias}:`, err);
                }
            }

            // Only remove minimum height if this render completed successfully
            if (requestId === this._reRenderRequestId) {
                container.style.minHeight = '';
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
                        // Await teardown to ensure PayPal buttons are fully closed before re-rendering
                        await adapter.teardownAll();
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
            if (method.adapterUrl && !this.loadedSdks[method.adapterUrl]) {
                await this.loadScript(method.adapterUrl);
                this.loadedSdks[method.adapterUrl] = true;
            }

            // Load SDK if provided
            if (method.sdkUrl && !this.loadedSdks[method.sdkUrl]) {
                await this.loadScript(method.sdkUrl);
                this.loadedSdks[method.sdkUrl] = true;
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
            const label = document.createElement('span');
            label.textContent = method.displayName || 'Express checkout';
            button.appendChild(label);
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
            // Note: Adapters are responsible for setting isProcessing = true before calling this function
            // and for checking isProcessing before initiating payment flow. This function trusts
            // that the adapter has already done those checks.

            // Track request ID to prevent stale responses from overwriting newer ones
            const requestId = ++this._expressRequestId;

            // Ensure processing state is set (adapters should have done this, but be safe)
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

                // Check if a newer request was made while we were waiting
                if (requestId !== this._expressRequestId) {
                    console.warn('Stale express checkout response, ignoring');
                    return;
                }

                const result = await response.json();

                if (result.success) {
                    // Validate server-provided redirect URL before navigating
                    const redirectUrl = result.redirectUrl || `/checkout/confirmation/${result.invoiceId}`;
                    safeRedirect(redirectUrl);
                } else {
                    this.error = result.errorMessage || 'Payment failed. Please try again.';
                }
            } catch (err) {
                // Ignore errors from stale requests
                if (requestId !== this._expressRequestId) {
                    return;
                }
                console.error('Express checkout failed:', err);
                this.error = 'An error occurred processing your payment.';
            } finally {
                // Only update processing state if this is the current request
                if (requestId === this._expressRequestId) {
                    this.isProcessing = false;
                }
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
            };

            console.log('[expressCheckout] Component created successfully');
            return componentData;
        } catch (e) {
            console.error('[expressCheckout] FATAL - Component initialization failed:', e);
            throw e;
        }
    });
}

export default { initExpressCheckout };
