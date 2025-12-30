/**
 * PayPal Payment Adapter
 *
 * Handles PayPal button rendering and payment flow.
 * Uses the PayPal JavaScript SDK for button integration.
 *
 * See: https://developer.paypal.com/docs/checkout/standard/
 */
(function() {
    'use strict';

    // Store PayPal instance
    let currentSession = null;
    let currentContainer = null;
    let paypalButtonRendered = false;

    /**
     * PayPal Payment Adapter
     * Registered with window.MerchelloPaymentAdapters['paypal']
     */
    const paypalPaymentAdapter = {
        /**
         * Render the PayPal button
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} session - The payment session from the server
         * @param {Object} checkout - The MerchelloPayment instance
         */
        async render(container, session, checkout) {
            try {
                currentSession = session;
                currentContainer = container;
                const config = session.sdkConfiguration || {};

                // Wait for PayPal SDK to be available
                if (typeof paypal === 'undefined') {
                    throw new Error('PayPal SDK not loaded. Ensure the SDK URL is correct.');
                }

                // Create container structure
                container.innerHTML = `
                    <div class="paypal-button-wrapper">
                        <div id="paypal-button-container"></div>
                        <div id="paypal-errors" class="text-red-600 text-sm mt-2 hidden"></div>
                    </div>
                `;

                // Render PayPal button
                await paypal.Buttons({
                    style: {
                        layout: config.buttonLayout || 'vertical',
                        color: config.buttonColor || 'gold',
                        shape: config.buttonShape || 'rect',
                        label: config.buttonLabel || 'paypal'
                    },

                    // Create order on PayPal
                    createOrder: async function(data, actions) {
                        // If we have an orderId from server, use it
                        if (config.orderId) {
                            return config.orderId;
                        }

                        // Otherwise create order on server
                        try {
                            const response = await MerchelloPayment.fetchWithTimeout('/api/merchello/checkout/paypal/create-order', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    sessionId: session.sessionId
                                })
                            });

                            const result = await response.json();
                            if (!result.success) {
                                throw new Error(result.errorMessage || 'Failed to create PayPal order');
                            }
                            return result.orderId;
                        } catch (error) {
                            console.error('Error creating PayPal order:', error);
                            throw error;
                        }
                    },

                    // Capture order after approval
                    onApprove: async function(data, actions) {
                        try {
                            const response = await MerchelloPayment.fetchWithTimeout('/api/merchello/checkout/paypal/capture-order', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    orderId: data.orderID,
                                    sessionId: session.sessionId,
                                    invoiceId: session.invoiceId
                                })
                            });

                            const result = await response.json();

                            if (result.success) {
                                // Redirect to confirmation
                                if (result.redirectUrl) {
                                    window.location.href = result.redirectUrl;
                                }
                            } else {
                                // Use currentContainer for Shadow DOM compatibility
                                const errorContainer = currentContainer?.querySelector('#paypal-errors');
                                if (errorContainer) {
                                    errorContainer.textContent = result.errorMessage || 'Payment capture failed';
                                    errorContainer.classList.remove('hidden');
                                }
                            }

                            return result;
                        } catch (error) {
                            console.error('Error capturing PayPal order:', error);
                            // Use currentContainer for Shadow DOM compatibility
                            const errorContainer = currentContainer?.querySelector('#paypal-errors');
                            if (errorContainer) {
                                errorContainer.textContent = error.message || 'Payment failed';
                                errorContainer.classList.remove('hidden');
                            }
                            throw error;
                        }
                    },

                    // Handle cancel
                    onCancel: function(data) {
                        console.log('PayPal payment cancelled:', data);
                    },

                    // Handle errors
                    onError: function(err) {
                        console.error('PayPal button error:', err);
                        // Use currentContainer for Shadow DOM compatibility
                        const errorContainer = currentContainer?.querySelector('#paypal-errors');
                        if (errorContainer) {
                            errorContainer.textContent = 'PayPal encountered an error. Please try again.';
                            errorContainer.classList.remove('hidden');
                        }
                    }
                }).render(container.querySelector('#paypal-button-container'));

                paypalButtonRendered = true;
                console.log('PayPal button rendered successfully');
            } catch (error) {
                console.error('Failed to initialize PayPal button:', error);
                this.showError(container, error.message);
                throw error;
            }
        },

        /**
         * Tokenize for PayPal - not applicable
         * PayPal uses a button-based flow where tokenization and submission are combined.
         * @returns {Promise<Object>} Result indicating to use the button
         */
        async tokenize() {
            // PayPal doesn't have a separate tokenization step
            // The button flow handles everything
            return {
                success: false,
                error: 'PayPal uses a button-based flow. Click the PayPal button to complete payment.',
                isButtonFlow: true
            };
        },

        /**
         * Submit the payment
         * Note: For PayPal, submission happens via the button click flow,
         * not through this method. This is here for interface compliance.
         * @param {string} invoiceId - The invoice ID being paid
         * @param {Object} options - Additional options
         * @returns {Promise<Object>} Payment result
         */
        async submit(invoiceId, options = {}) {
            // PayPal handles submission through button click
            // This method is called if the page has a separate submit button
            console.log('PayPal submit called - payment should be handled via PayPal button');

            return {
                success: false,
                error: 'Please use the PayPal button to complete payment'
            };
        },

        /**
         * Clean up PayPal button
         */
        teardown() {
            // PayPal buttons are rendered once and managed by PayPal SDK
            // Clearing the container is sufficient
            // Use currentContainer for Shadow DOM compatibility
            const buttonContainer = currentContainer?.querySelector('#paypal-button-container');
            if (buttonContainer) {
                buttonContainer.innerHTML = '';
            }
            paypalButtonRendered = false;
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
    window.MerchelloPaymentAdapters['paypal'] = paypalPaymentAdapter;

})();
