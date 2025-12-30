/**
 * Braintree Payment Adapter
 *
 * Handles Braintree Drop-in UI for card payments.
 * Uses the Drop-in UI for a unified payment experience.
 *
 * See: https://developer.paypal.com/braintree/docs/guides/drop-in/overview
 */
(function() {
    'use strict';

    // Store Braintree instances
    let dropinInstance = null;
    let currentSession = null;
    let currentContainer = null;

    /**
     * Braintree Payment Adapter
     * Registered with window.MerchelloPaymentAdapters['braintree']
     */
    const braintreePaymentAdapter = {
        /**
         * Render the Braintree Drop-in UI
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} session - The payment session from the server
         * @param {Object} checkout - The MerchelloPayment instance
         */
        async render(container, session, checkout) {
            try {
                currentSession = session;
                currentContainer = container;
                const config = session.sdkConfiguration || {};

                // Validate required config
                if (!session.clientToken) {
                    throw new Error('Braintree client token not provided');
                }

                // Wait for Braintree SDK to be available
                if (typeof braintree === 'undefined' || typeof braintree.dropin === 'undefined') {
                    throw new Error('Braintree Drop-in SDK not loaded. Ensure the SDK URL is correct.');
                }

                // Create container structure
                container.innerHTML = `
                    <div class="braintree-dropin-wrapper">
                        <div id="dropin-container"></div>
                        <div id="dropin-errors" class="text-red-600 text-sm mt-2 hidden"></div>
                    </div>
                `;

                // Build Drop-in options
                // Note: We pass the actual DOM element instead of a selector string
                // because the container may be inside Shadow DOM where document.querySelector won't find it
                const dropinContainer = container.querySelector('#dropin-container');
                if (!dropinContainer) {
                    throw new Error('Drop-in container element not found');
                }

                const dropinOptions = {
                    authorization: session.clientToken,
                    container: dropinContainer,
                    card: config.dropIn?.card || {
                        vault: {
                            vaultCard: false
                        }
                    }
                };

                // Add 3D Secure if configured
                if (config.dropIn?.threeDSecure) {
                    dropinOptions.threeDSecure = true;
                }

                // Add PayPal if configured
                if (config.dropIn?.paypal) {
                    dropinOptions.paypal = config.dropIn.paypal;
                }

                // Add Apple Pay if configured
                if (config.dropIn?.applePay) {
                    dropinOptions.applePay = config.dropIn.applePay;
                }

                // Add Google Pay if configured
                if (config.dropIn?.googlePay) {
                    dropinOptions.googlePay = config.dropIn.googlePay;
                }

                // Create the Drop-in instance
                dropinInstance = await braintree.dropin.create(dropinOptions);

                console.log('Braintree Drop-in initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Braintree Drop-in:', error);
                this.showError(container, error.message);
                throw error;
            }
        },

        /**
         * Get payment method token/nonce without submitting
         * Used for test mode to get the nonce separately
         * @returns {Promise<Object>} Payment method payload with nonce
         */
        async tokenize() {
            if (!dropinInstance) {
                throw new Error('Braintree not initialized. Call render() first.');
            }

            // Use stored container reference for Shadow DOM compatibility
            const errorContainer = currentContainer?.querySelector('#dropin-errors');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.classList.add('hidden');
            }

            try {
                const config = currentSession?.sdkConfiguration || {};

                // Build request options for 3D Secure if enabled
                const requestOptions = {};
                if (config.dropIn?.threeDSecure && config.amount) {
                    requestOptions.threeDSecure = {
                        amount: String(config.amount),
                        email: 'test@example.com', // For testing
                        billingAddress: {
                            givenName: 'Test',
                            surname: 'User',
                            phoneNumber: '0000000000',
                            streetAddress: '123 Test St',
                            locality: 'Test City',
                            region: 'TS',
                            postalCode: '12345',
                            countryCodeAlpha2: 'US'
                        }
                    };
                }

                const payload = await dropinInstance.requestPaymentMethod(requestOptions);
                return {
                    success: true,
                    nonce: payload.nonce,
                    type: payload.type,
                    details: payload.details,
                    deviceData: payload.deviceData || '',
                    liabilityShifted: payload.liabilityShifted,
                    liabilityShiftPossible: payload.liabilityShiftPossible
                };
            } catch (error) {
                let errorMessage = error.message;
                if (error.message === 'No payment method is available.') {
                    errorMessage = 'Please enter your payment details.';
                }

                if (errorContainer) {
                    errorContainer.textContent = errorMessage;
                    errorContainer.classList.remove('hidden');
                }

                return {
                    success: false,
                    error: errorMessage
                };
            }
        },

        /**
         * Submit the payment
         * @param {string} invoiceId - The invoice ID being paid
         * @param {Object} options - Additional options
         * @returns {Promise<Object>} Payment result
         */
        async submit(invoiceId, options = {}) {
            if (!dropinInstance) {
                throw new Error('Braintree not initialized. Call render() first.');
            }

            // Use stored container reference for Shadow DOM compatibility
            const errorContainer = currentContainer?.querySelector('#dropin-errors');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.classList.add('hidden');
            }

            try {
                // Request payment method nonce from Drop-in
                const payload = await dropinInstance.requestPaymentMethod();

                // Submit to server for processing
                const response = await MerchelloPayment.fetchWithTimeout('/api/merchello/checkout/process-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        invoiceId: invoiceId,
                        providerAlias: currentSession?.providerAlias || 'braintree',
                        methodAlias: currentSession?.methodAlias || 'cards',
                        paymentMethodToken: payload.nonce,
                        formData: {
                            deviceData: payload.deviceData || '',
                            type: payload.type,
                            details: payload.details
                        }
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.errorMessage || 'Payment processing failed');
                }

                return result;
            } catch (error) {
                console.error('Braintree payment submission error:', error);

                // Handle specific Braintree errors
                let errorMessage = error.message;
                if (error.message === 'No payment method is available.') {
                    errorMessage = 'Please enter your payment details.';
                }

                if (errorContainer) {
                    errorContainer.textContent = errorMessage;
                    errorContainer.classList.remove('hidden');
                }

                return {
                    success: false,
                    error: errorMessage
                };
            }
        },

        /**
         * Clean up Braintree Drop-in
         */
        async teardown() {
            if (dropinInstance) {
                try {
                    await dropinInstance.teardown();
                } catch (error) {
                    console.warn('Error tearing down Braintree Drop-in:', error);
                }
                dropinInstance = null;
            }
            currentSession = null;
            currentContainer = null;
        },

        /**
         * Show an error message in the container
         * @param {HTMLElement} container - The container element
         * @param {string} message - The error message
         */
        showError(container, message) {
            // Create elements manually to avoid XSS from error messages
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
        }
    };

    // Register the adapter
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
    window.MerchelloPaymentAdapters['braintree'] = braintreePaymentAdapter;

})();
