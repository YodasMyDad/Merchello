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
                const dropinOptions = {
                    authorization: session.clientToken,
                    container: '#dropin-container',
                    card: config.dropIn?.card || {
                        vault: {
                            vaultCard: false
                        }
                    }
                };

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
         * Submit the payment
         * @param {string} invoiceId - The invoice ID being paid
         * @param {Object} options - Additional options
         * @returns {Promise<Object>} Payment result
         */
        async submit(invoiceId, options = {}) {
            if (!dropinInstance) {
                throw new Error('Braintree not initialized. Call render() first.');
            }

            const errorContainer = document.getElementById('dropin-errors');
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
