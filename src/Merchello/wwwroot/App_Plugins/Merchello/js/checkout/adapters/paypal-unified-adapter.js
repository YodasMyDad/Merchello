// @ts-check
/**
 * PayPal Unified Payment Adapter
 *
 * Consolidates standard payment and express checkout into a single adapter.
 * Supports both MerchelloPaymentAdapters and MerchelloExpressAdapters registries.
 *
 * See: https://developer.paypal.com/docs/checkout/standard/
 */
(function() {
    'use strict';

    // Track rendered buttons for cleanup
    const renderedButtons = {};

    // Current session state for standard payment flow
    let currentSession = null;
    let currentContainer = null;

    /**
     * PayPal Unified Adapter
     * Handles both standard and express checkout flows
     */
    const paypalUnifiedAdapter = {
        /**
         * Adapter configuration
         */
        config: {
            name: 'PayPal',
            supportsStandard: true,
            supportsExpress: true
        },

        /**
         * Render PayPal button
         *
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} configOrSession - Session (standard) or config (express)
         * @param {Object} context - { isExpress, session, checkout, method }
         */
        async render(container, configOrSession, context = {}) {
            const isExpress = context.isExpress === true;

            if (isExpress) {
                return this._renderExpressButton(container, context.method, configOrSession, context.checkout);
            } else {
                return this._renderStandardButton(container, configOrSession, context.checkout);
            }
        },

        /**
         * Render standard payment button
         * @private
         */
        async _renderStandardButton(container, session, checkout) {
            try {
                currentSession = session;
                currentContainer = container;
                const config = session.sdkConfiguration || {};

                if (typeof paypal === 'undefined') {
                    throw new Error('PayPal SDK not loaded. Ensure the SDK URL is correct.');
                }

                // Create container structure
                container.innerHTML = `
                    <div class="paypal-button-wrapper">
                        <div id="paypal-button-container"></div>
                        <div id="paypal-errors" class="text-red-600 text-sm mt-2 hidden" role="alert"></div>
                    </div>
                `;

                await paypal.Buttons({
                    style: {
                        layout: config.buttonLayout || 'vertical',
                        color: config.buttonColor || 'gold',
                        shape: config.buttonShape || 'rect',
                        label: config.buttonLabel || 'paypal'
                    },

                    createOrder: async () => {
                        return this._createStandardOrder(session, config);
                    },

                    onApprove: async (data) => {
                        return this._handleStandardApproval(data, session);
                    },

                    onCancel: () => {
                        console.log('PayPal payment cancelled');
                    },

                    onError: (err) => {
                        this._handleError(err, { isExpress: false });
                    }
                }).render(container.querySelector('#paypal-button-container'));

                console.log('PayPal standard button rendered');
            } catch (error) {
                console.error('Failed to initialize PayPal button:', error);
                this._showError(container, error.message);
                throw error;
            }
        },

        /**
         * Render express checkout button
         * @private
         */
        async _renderExpressButton(container, method, config, checkout) {
            try {
                const sdkConfig = method.sdkConfig || {};

                if (typeof paypal === 'undefined') {
                    console.error('PayPal SDK not loaded');
                    container.style.display = 'none';
                    return;
                }

                // Create unique container with timestamp to avoid PayPal SDK ID conflicts
                const uniqueId = `paypal-express-${method.methodAlias}-${Date.now()}`;
                const elementContainer = document.createElement('div');
                elementContainer.id = uniqueId;
                elementContainer.style.width = '100%';
                container.appendChild(elementContainer);

                // Determine button style based on method
                const methodAlias = (method.methodAlias || '').toLowerCase();
                const isPaylater = methodAlias === 'paylater' || methodAlias === 'pay-later';

                // Determine funding source
                let fundingSource;
                if (isPaylater && paypal.FUNDING?.PAYLATER) {
                    fundingSource = paypal.FUNDING.PAYLATER;
                } else if (paypal.FUNDING?.PAYPAL) {
                    fundingSource = paypal.FUNDING.PAYPAL;
                }

                const expressConfig = window.MerchelloExpressConfig || { buttonHeight: 44, borderRadius: 6 };
                const buttonConfig = {
                    style: {
                        layout: 'horizontal',
                        color: isPaylater ? 'blue' : 'gold',
                        shape: 'rect',
                        label: isPaylater ? 'paylater' : 'paypal',
                        height: expressConfig.buttonHeight
                    },

                    createOrder: async () => {
                        return this._createExpressOrder(method, config);
                    },

                    onApprove: async (data, actions) => {
                        return this._handleExpressApproval(data, actions, checkout, method);
                    },

                    onCancel: () => {
                        if (checkout) checkout.isProcessing = false;
                    },

                    onError: (err) => {
                        this._handleError(err, { isExpress: true, checkout });
                    }
                };

                if (fundingSource) {
                    buttonConfig.fundingSource = fundingSource;
                }

                const buttons = paypal.Buttons(buttonConfig);

                if (!buttons.isEligible()) {
                    console.warn(`PayPal button '${method.methodAlias}' not eligible`);
                    container.style.display = 'none';
                    return;
                }

                // Wait for container to be visible
                if (elementContainer.offsetParent === null) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                await buttons.render('#' + elementContainer.id);

                // Store for cleanup
                renderedButtons[method.methodAlias] = {
                    button: buttons,
                    containerId: elementContainer.id
                };

            } catch (error) {
                console.error(`PayPal express button '${method.methodAlias}' failed:`, error);
                if (error.message?.includes('eligible') || error.message?.includes('Script')) {
                    container.style.display = 'none';
                }
            }
        },

        /**
         * Create order for standard payment flow
         * @private
         */
        async _createStandardOrder(session, config) {
            if (config.orderId) {
                return config.orderId;
            }

            const providerAlias = session.providerAlias || 'paypal';
            const vaultSettings = window.MerchelloPayment?.getVaultSettings?.() || {
                savePaymentMethod: false,
                setAsDefaultMethod: false
            };

            try {
                const response = await this._fetchWithTimeout(
                    `/api/merchello/checkout/${providerAlias}/create-order`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: session.sessionId,
                            methodAlias: session.methodAlias,
                            savePaymentMethod: vaultSettings.savePaymentMethod
                        })
                    }
                );

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.errorMessage || 'Failed to create order');
                }
                return result.orderId;
            } catch (error) {
                console.error('Error creating PayPal order:', error);
                throw error;
            }
        },

        /**
         * Create order for express checkout flow
         * @private
         */
        async _createExpressOrder(method, config) {
            try {
                const response = await fetch('/api/merchello/checkout/express-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        providerAlias: method.providerAlias || 'paypal',
                        methodAlias: method.methodAlias,
                        amount: config.amount,
                        currency: config.currency
                    })
                });

                const data = await response.json();
                if (!data.orderId) {
                    throw new Error(data.errorMessage || 'Failed to create PayPal order');
                }
                return data.orderId;
            } catch (error) {
                console.error('Error creating PayPal express order:', error);
                throw error;
            }
        },

        /**
         * Handle standard payment approval
         * @private
         */
        async _handleStandardApproval(data, session) {
            const providerAlias = session.providerAlias || 'paypal';
            const vaultSettings = window.MerchelloPayment?.getVaultSettings?.() || {
                savePaymentMethod: false,
                setAsDefaultMethod: false
            };

            try {
                const response = await this._fetchWithTimeout(
                    `/api/merchello/checkout/${providerAlias}/capture-order`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: data.orderID,
                            sessionId: session.sessionId,
                            invoiceId: session.invoiceId,
                            savePaymentMethod: vaultSettings.savePaymentMethod,
                            setAsDefaultMethod: vaultSettings.setAsDefaultMethod
                        })
                    }
                );

                const result = await response.json();

                if (result.success && result.redirectUrl) {
                    window.MerchelloPayment?.safeRedirect?.(result.redirectUrl) ||
                        (window.location.href = result.redirectUrl);
                } else if (!result.success) {
                    this._showErrorInContainer(result.errorMessage || 'Payment capture failed');
                }

                return result;
            } catch (error) {
                console.error('Error capturing PayPal order:', error);
                this._showErrorInContainer(error.message || 'Payment failed');
                throw error;
            }
        },

        /**
         * Handle express checkout approval
         * @private
         */
        async _handleExpressApproval(data, actions, checkout, method) {
            if (checkout?.isProcessing) return;
            if (checkout) {
                checkout.isProcessing = true;
                checkout.error = null;
            }

            try {
                // Get order details from PayPal
                const orderDetails = await actions.order.get();
                const payer = orderDetails.payer || {};
                const shipping = orderDetails.purchase_units?.[0]?.shipping || {};

                // Extract customer data
                const customerData = this.extractCustomerData(payer, shipping);

                // Process via checkout component
                if (checkout?.processExpressCheckout) {
                    await checkout.processExpressCheckout(
                        'paypal',
                        method.methodAlias,
                        data.orderID,
                        customerData,
                        {
                            payerId: data.payerID,
                            facilitatorAccessToken: data.facilitatorAccessToken
                        }
                    );
                }
            } catch (error) {
                console.error('PayPal express checkout error:', error);
                if (checkout) {
                    checkout.error = error.message || 'Payment failed. Please try again.';
                    checkout.isProcessing = false;
                }
            }
        },

        /**
         * Extract customer data from PayPal response
         * Used by express checkout to populate address fields
         */
        extractCustomerData(payer, shipping) {
            const name = payer.name || {};
            const address = shipping?.address || {};

            return {
                email: payer.email_address || '',
                fullName: shipping?.name?.full_name ||
                    ((name.given_name || '') + ' ' + (name.surname || '')).trim(),
                phone: payer.phone?.phone_number?.national_number || '',
                shippingAddress: address.address_line_1 ? {
                    line1: address.address_line_1 || '',
                    line2: address.address_line_2 || '',
                    city: address.admin_area_2 || '',
                    region: address.admin_area_1 || '',
                    postalCode: address.postal_code || '',
                    countryCode: address.country_code || ''
                } : null,
                billingAddress: null
            };
        },

        /**
         * Tokenize (not applicable for PayPal button flow)
         */
        async tokenize() {
            return {
                success: false,
                error: 'PayPal uses a button-based flow. Click the PayPal button to complete payment.',
                isButtonFlow: true
            };
        },

        /**
         * Submit payment (handled via button click)
         */
        async submit(invoiceId, options = {}) {
            return {
                success: false,
                error: 'Please use the PayPal button to complete payment'
            };
        },

        /**
         * Clean up all express buttons (called by express-checkout.js)
         */
        async teardownAll() {
            await this.teardown();
        },

        /**
         * Clean up resources
         */
        async teardown(methodAlias) {
            if (methodAlias) {
                // Teardown specific button
                const entry = renderedButtons[methodAlias];
                if (entry) {
                    try {
                        // PayPal's close() may be async - await it to ensure cleanup completes
                        await entry.button?.close?.();
                    } catch (e) { /* ignore */ }
                    document.getElementById(entry.containerId)?.remove();
                    delete renderedButtons[methodAlias];
                }
            } else {
                // Teardown all - await each to ensure proper cleanup
                const aliases = Object.keys(renderedButtons);
                for (const alias of aliases) {
                    await this.teardown(alias);
                }

                // Clear standard payment state
                const buttonContainer = currentContainer?.querySelector('#paypal-button-container');
                if (buttonContainer) buttonContainer.innerHTML = '';
                currentSession = null;
                currentContainer = null;
            }
        },

        /**
         * Handle errors consistently
         * @private
         */
        _handleError(err, context = {}) {
            console.error('PayPal error:', err);

            const message = 'PayPal encountered an error. Please try again.';

            if (context.checkout) {
                context.checkout.error = message;
                context.checkout.isProcessing = false;
            }

            if (!context.isExpress) {
                this._showErrorInContainer(message);
            }

            // Emit event for analytics
            window.dispatchEvent(new CustomEvent('merchello:payment-error', {
                detail: {
                    error: err,
                    provider: 'paypal',
                    isExpress: context.isExpress
                }
            }));
        },

        /**
         * Show error in standard container
         * @private
         */
        _showErrorInContainer(message) {
            const errorContainer = currentContainer?.querySelector('#paypal-errors');
            if (errorContainer) {
                errorContainer.textContent = message;
                errorContainer.classList.remove('hidden');
            }
        },

        /**
         * Show error with DOM-safe rendering
         * @private
         */
        _showError(container, message) {
            container.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'text-red-600 text-sm p-4 bg-red-50 rounded-lg';
            wrapper.setAttribute('role', 'alert');

            const title = document.createElement('p');
            title.className = 'font-medium';
            title.textContent = 'Payment Setup Error';

            const text = document.createElement('p');
            text.textContent = message;

            wrapper.appendChild(title);
            wrapper.appendChild(text);
            container.appendChild(wrapper);
        },

        /**
         * Fetch with timeout
         * @private
         */
        async _fetchWithTimeout(url, options = {}, timeout = 30000) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        }
    };

    // Register in both registries for backward compatibility
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
    window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};

    // Standard payment registration
    window.MerchelloPaymentAdapters['paypal'] = paypalUnifiedAdapter;

    // Express checkout registration (multiple aliases for compatibility)
    window.MerchelloExpressAdapters['paypal'] = paypalUnifiedAdapter;
    window.MerchelloExpressAdapters['paypal:paypal'] = paypalUnifiedAdapter;
    window.MerchelloExpressAdapters['paypal:paylater'] = paypalUnifiedAdapter;

    // Export for module usage if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = paypalUnifiedAdapter;
    }
})();
