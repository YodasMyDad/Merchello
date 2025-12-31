/**
 * Stripe Express Checkout Adapter
 *
 * Handles initialization and rendering of Stripe Express Checkout Element
 * for Apple Pay, Google Pay, and Link payment methods.
 *
 * See: https://docs.stripe.com/elements/express-checkout-element
 */
(function() {
    'use strict';

    // Store Stripe instances to avoid re-initialization
    let stripeInstance = null;
    let elementsInstance = null;
    let expressCheckoutElement = null;
    let currentConfig = null;

    /**
     * Stripe Express Checkout Adapter
     * Registered for all Stripe express checkout methods
     */
    const stripeExpressAdapter = {
        /**
         * Render a Stripe express checkout button
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} method - The payment method configuration
         * @param {Object} config - The full express checkout config (currency, amount, etc.)
         * @param {Object} checkout - The checkout Alpine.js component instance
         */
        async render(container, method, config, checkout) {
            try {
                const sdkConfig = method.sdkConfig || {};

                // Initialize Stripe if not already done
                if (!stripeInstance) {
                    if (!window.Stripe) {
                        console.error('Stripe.js not loaded');
                        return;
                    }
                    stripeInstance = Stripe(sdkConfig.publishableKey);
                }

                // Create Elements instance with payment configuration
                // Each express method shares the same Elements instance
                if (!elementsInstance) {
                    currentConfig = config;
                    elementsInstance = stripeInstance.elements({
                        mode: 'payment',
                        amount: sdkConfig.amount || Math.round(config.amount * 100),
                        currency: sdkConfig.currency || config.currency.toLowerCase(),
                        appearance: {
                            theme: 'stripe',
                            variables: {
                                borderRadius: '8px'
                            }
                        }
                    });
                }

                // Create a unique element container
                const elementContainer = document.createElement('div');
                elementContainer.id = 'stripe-express-' + method.methodAlias;
                elementContainer.style.width = '100%';
                elementContainer.style.minHeight = '48px';
                container.appendChild(elementContainer);

                // Determine which wallet types to show based on method
                const walletTypes = this.getWalletTypes(method.methodAlias);

                // Create Express Checkout Element
                const expressOptions = {
                    buttonHeight: sdkConfig.buttonHeight || 48,
                    buttonTheme: {
                        applePay: 'black',
                        googlePay: 'black',
                        paypal: 'gold'
                    },
                    layout: {
                        maxColumns: 1,
                        maxRows: 1
                    }
                };

                // Filter to specific wallet if requested
                if (walletTypes) {
                    expressOptions.wallets = walletTypes;
                }

                const element = elementsInstance.create('expressCheckout', expressOptions);

                // Handle ready event to check availability
                element.on('ready', function(event) {
                    const availablePaymentMethods = event.availablePaymentMethods;
                    if (!availablePaymentMethods || Object.keys(availablePaymentMethods).length === 0) {
                        // No payment methods available, hide the container
                        container.style.display = 'none';
                    } else {
                        container.style.display = '';
                    }
                });

                // Handle confirm event - this is when the user approves the payment
                element.on('confirm', async function(event) {
                    // Guard against multiple confirm events (race condition prevention)
                    if (checkout.isProcessing) {
                        return;
                    }
                    checkout.isProcessing = true;
                    checkout.error = null;

                    try {
                        // Submit the form data to Stripe
                        const submitResult = await elementsInstance.submit();

                        if (submitResult.error) {
                            checkout.error = submitResult.error.message;
                            checkout.isProcessing = false;
                            return;
                        }

                        // Create PaymentIntent on the server and get client secret
                        const createResponse = await MerchelloPayment.fetchWithTimeout('/api/merchello/checkout/express-payment-intent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                providerAlias: method.providerAlias || 'stripe',
                                methodAlias: method.methodAlias,
                                amount: config.amount,
                                currency: config.currency
                            })
                        });

                        const intentResult = await createResponse.json();
                        const clientSecret = intentResult.clientSecret;
                        const paymentIntentId = intentResult.paymentIntentId;

                        // Confirm the payment with Stripe
                        const confirmResult = await stripeInstance.confirmPayment({
                            elements: elementsInstance,
                            clientSecret: clientSecret,
                            confirmParams: {
                                return_url: window.location.origin + '/checkout/confirmation'
                            },
                            redirect: 'if_required'
                        });

                        if (confirmResult.error) {
                            checkout.error = confirmResult.error.message;
                            checkout.isProcessing = false;
                            return;
                        }

                        // Extract customer data from the event
                        const customerData = stripeExpressAdapter.extractCustomerData(event);

                        // Process express checkout on our server
                        await checkout.processExpressCheckout(
                            'stripe',
                            method.methodAlias,
                            paymentIntentId,
                            customerData,
                            { paymentIntentId: paymentIntentId }
                        );
                    } catch (err) {
                        console.error('Stripe express checkout error:', err);
                        checkout.error = err.message || 'Payment failed. Please try again.';
                        checkout.isProcessing = false;
                    }
                });

                // Handle cancel event
                element.on('cancel', function() {
                    checkout.isProcessing = false;
                });

                // Mount the element
                element.mount('#' + elementContainer.id);

                // Store reference for cleanup
                expressCheckoutElement = element;

            } catch (err) {
                console.error('Failed to initialize Stripe express checkout:', err);
                var errorSpan = document.createElement('span');
                errorSpan.className = 'text-red-500 text-sm';
                errorSpan.textContent = 'Express checkout unavailable';
                container.replaceChildren(errorSpan);
            }
        },

        /**
         * Get wallet types filter based on method alias
         * @param {string} methodAlias - The method alias (applepay, googlepay, link)
         * @returns {Object|null} Wallet filter object or null to show all
         */
        getWalletTypes: function(methodAlias) {
            switch (methodAlias.toLowerCase()) {
                case 'applepay':
                    return { applePay: 'always', googlePay: 'never', link: 'never' };
                case 'googlepay':
                    return { applePay: 'never', googlePay: 'always', link: 'never' };
                case 'link':
                    return { applePay: 'never', googlePay: 'never', link: 'always' };
                default:
                    return null; // Show all available
            }
        },

        /**
         * Extract customer data from Stripe express checkout event
         * @param {Object} event - The Stripe express checkout confirm event
         * @returns {Object} Customer data in our format
         */
        extractCustomerData: function(event) {
            const billingDetails = event.billingDetails || {};
            const shippingAddress = event.shippingAddress || {};

            return {
                email: billingDetails.email || '',
                phone: billingDetails.phone || '',
                fullName: billingDetails.name || shippingAddress.name || '',
                shippingAddress: {
                    line1: (shippingAddress.address && shippingAddress.address.line1) || (billingDetails.address && billingDetails.address.line1) || '',
                    line2: (shippingAddress.address && shippingAddress.address.line2) || (billingDetails.address && billingDetails.address.line2) || '',
                    city: (shippingAddress.address && shippingAddress.address.city) || (billingDetails.address && billingDetails.address.city) || '',
                    region: (shippingAddress.address && shippingAddress.address.state) || (billingDetails.address && billingDetails.address.state) || '',
                    postalCode: (shippingAddress.address && shippingAddress.address.postal_code) || (billingDetails.address && billingDetails.address.postal_code) || '',
                    countryCode: (shippingAddress.address && shippingAddress.address.country) || (billingDetails.address && billingDetails.address.country) || ''
                },
                billingAddress: billingDetails.address ? {
                    line1: billingDetails.address.line1 || '',
                    line2: billingDetails.address.line2 || '',
                    city: billingDetails.address.city || '',
                    region: billingDetails.address.state || '',
                    postalCode: billingDetails.address.postal_code || '',
                    countryCode: billingDetails.address.country || ''
                } : null
            };
        }
    };

    // Register the adapter for Stripe provider (handles all Stripe express methods)
    window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};
    window.MerchelloExpressAdapters['stripe'] = stripeExpressAdapter;

    // Also register for specific method aliases if needed
    window.MerchelloExpressAdapters['stripe:applepay'] = stripeExpressAdapter;
    window.MerchelloExpressAdapters['stripe:googlepay'] = stripeExpressAdapter;
    window.MerchelloExpressAdapters['stripe:link'] = stripeExpressAdapter;

})();
