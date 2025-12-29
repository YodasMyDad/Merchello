/**
 * PayPal Express Checkout Adapter
 *
 * Handles PayPal Express Checkout for quick checkout flows.
 * Uses the PayPal JavaScript SDK for button integration.
 *
 * See: https://developer.paypal.com/docs/checkout/standard/
 */
(function() {
    'use strict';

    // Track rendered buttons
    let renderedButtons = {};

    /**
     * PayPal Express Checkout Adapter
     * Registered for PayPal express checkout methods (PayPal, Pay Later)
     */
    const paypalExpressAdapter = {
        /**
         * Render a PayPal express checkout button
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} method - The payment method configuration
         * @param {Object} config - The full express checkout config (currency, amount, etc.)
         * @param {Object} checkout - The checkout Alpine.js component instance
         */
        async render(container, method, config, checkout) {
            try {
                const sdkConfig = method.sdkConfig || {};

                // Wait for PayPal SDK to be available
                if (typeof paypal === 'undefined') {
                    console.error('PayPal SDK not loaded');
                    container.style.display = 'none';
                    return;
                }

                // Create a unique container for this method
                const elementContainer = document.createElement('div');
                elementContainer.id = 'paypal-express-' + method.methodAlias;
                elementContainer.style.minWidth = '150px';
                container.appendChild(elementContainer);

                // Determine button style based on method
                const methodAlias = method.methodAlias.toLowerCase();
                const isPaylater = methodAlias === 'paylater' || methodAlias === 'pay-later';

                // Determine funding source
                let fundingSource;
                if (isPaylater && paypal.FUNDING && paypal.FUNDING.PAYLATER) {
                    fundingSource = paypal.FUNDING.PAYLATER;
                } else if (paypal.FUNDING && paypal.FUNDING.PAYPAL) {
                    fundingSource = paypal.FUNDING.PAYPAL;
                }

                // Button configuration
                const buttonConfig = {
                    style: {
                        layout: 'horizontal',
                        color: isPaylater ? 'blue' : 'gold',
                        shape: 'rect',
                        label: isPaylater ? 'paylater' : 'paypal',
                        height: 48
                    },

                    // Create order on server
                    createOrder: async function() {
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
                            checkout.error = error.message || 'Failed to create order';
                            throw error;
                        }
                    },

                    // Handle approval
                    onApprove: async function(data, actions) {
                        // Guard against multiple submissions
                        if (checkout.isProcessing) {
                            return;
                        }
                        checkout.isProcessing = true;
                        checkout.error = null;

                        try {
                            // Get order details from PayPal to extract customer data
                            const orderDetails = await actions.order.get();
                            const payer = orderDetails.payer || {};
                            const shipping = orderDetails.purchase_units?.[0]?.shipping || {};

                            // Extract customer data from PayPal response
                            const customerData = paypalExpressAdapter.extractCustomerData(payer, shipping);

                            // Process express checkout on our server
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
                        } catch (error) {
                            console.error('PayPal express checkout error:', error);
                            checkout.error = error.message || 'Payment failed. Please try again.';
                            checkout.isProcessing = false;
                        }
                    },

                    // Handle cancel
                    onCancel: function() {
                        checkout.isProcessing = false;
                    },

                    // Handle errors
                    onError: function(err) {
                        console.error('PayPal express button error:', err);
                        checkout.error = 'PayPal encountered an error. Please try again.';
                        checkout.isProcessing = false;
                    }
                };

                // Add funding source if available
                if (fundingSource) {
                    buttonConfig.fundingSource = fundingSource;
                }

                // Render the button
                const buttons = paypal.Buttons(buttonConfig);

                // Check if this funding source is eligible
                if (!buttons.isEligible()) {
                    container.style.display = 'none';
                    return;
                }

                await buttons.render('#' + elementContainer.id);
                renderedButtons[method.methodAlias] = true;

            } catch (error) {
                console.error('Failed to initialize PayPal express checkout:', error);
                var errorSpan = document.createElement('span');
                errorSpan.className = 'text-red-500 text-sm';
                errorSpan.textContent = 'Express checkout unavailable';
                container.replaceChildren(errorSpan);
            }
        },

        /**
         * Extract customer data from PayPal payer and shipping info
         * @param {Object} payer - The PayPal payer object
         * @param {Object} shipping - The PayPal shipping object
         * @returns {Object} Customer data in our format
         */
        extractCustomerData: function(payer, shipping) {
            const name = payer.name || {};
            const address = shipping.address || {};

            return {
                email: payer.email_address || '',
                fullName: shipping.name?.full_name || ((name.given_name || '') + ' ' + (name.surname || '')).trim(),
                phone: payer.phone?.phone_number?.national_number || '',
                shippingAddress: address.address_line_1 ? {
                    line1: address.address_line_1 || '',
                    line2: address.address_line_2 || '',
                    city: address.admin_area_2 || '',
                    region: address.admin_area_1 || '',
                    postalCode: address.postal_code || '',
                    countryCode: address.country_code || ''
                } : null,
                billingAddress: null // PayPal doesn't expose billing address in standard checkout
            };
        },

        /**
         * Clean up rendered buttons
         * @param {string} methodAlias - The method alias to clean up
         */
        teardown(methodAlias) {
            const container = document.getElementById('paypal-express-' + methodAlias);
            if (container) {
                container.replaceChildren();
            }
            delete renderedButtons[methodAlias];
        },

        /**
         * Clean up all rendered buttons
         */
        teardownAll() {
            for (const alias of Object.keys(renderedButtons)) {
                this.teardown(alias);
            }
        }
    };

    // Register the adapter for PayPal provider
    window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};
    window.MerchelloExpressAdapters['paypal'] = paypalExpressAdapter;

    // Also register for specific method aliases
    window.MerchelloExpressAdapters['paypal:paypal'] = paypalExpressAdapter;
    window.MerchelloExpressAdapters['paypal:paylater'] = paypalExpressAdapter;

})();
