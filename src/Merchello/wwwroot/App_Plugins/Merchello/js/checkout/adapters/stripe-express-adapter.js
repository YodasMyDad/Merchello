/**
 * Stripe Express Checkout Adapter
 *
 * Handles initialization and rendering of Stripe Express Checkout Element
 * for Apple Pay, Google Pay, Link, Amazon Pay, PayPal, and Klarna payment methods.
 *
 * IMPORTANT: Stripe only supports ONE Express Checkout Element per page.
 * This adapter creates a single element with all enabled Stripe wallets on
 * the first render() call. Subsequent render() calls for other Stripe methods
 * are no-ops since their wallets are already included in the single element.
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
    let mountedContainer = null;

    // Maps our method alias → Stripe wallet config key
    const ALIAS_TO_WALLET_KEY = {
        'applepay': 'applePay',
        'googlepay': 'googlePay',
        'link': 'link',
        'amazonpay': 'amazon_pay',
        'paypal': 'paypal',
        'klarna': 'klarna'
    };

    // Maps Stripe expressPaymentType (from confirm event) → our method alias
    const EXPRESS_TYPE_TO_ALIAS = {
        'apple_pay': 'applepay',
        'google_pay': 'googlepay',
        'link': 'link',
        'amazon_pay': 'amazonpay',
        'paypal': 'paypal',
        'klarna': 'klarna'
    };

    /**
     * Stripe Express Checkout Adapter
     * Registered for all Stripe express checkout methods
     */
    const stripeExpressAdapter = {
        /**
         * Render a Stripe express checkout button.
         *
         * On the first call, creates a single Express Checkout Element containing
         * ALL enabled Stripe wallets (read from config.methods). Subsequent calls
         * for other Stripe methods hide their containers since those wallets are
         * already rendered by the single element.
         *
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} method - The payment method configuration
         * @param {Object} config - The full express checkout config (currency, amount, etc.)
         * @param {Object} checkout - The checkout Alpine.js component instance
         */
        async render(container, method, config, checkout) {
            console.log('[StripeExpress] render called for', method.methodAlias);
            try {
                const sdkConfig = method.sdkConfig || {};

                // Initialize Stripe if not already done
                if (!stripeInstance) {
                    if (!window.Stripe) {
                        console.error('[StripeExpress] Stripe.js not loaded');
                        return;
                    }
                    stripeInstance = Stripe(sdkConfig.publishableKey);
                }

                // If the single element is already created, hide this container
                // (this method's wallet is already included in the element)
                if (expressCheckoutElement) {
                    container.style.display = 'none';
                    return;
                }

                // Create Elements instance with payment configuration
                if (!elementsInstance) {
                    currentConfig = config;
                    if (!sdkConfig.amount) {
                        console.error('[StripeExpress] sdkConfig.amount not provided by backend - cannot initialize');
                        return;
                    }

                    elementsInstance = stripeInstance.elements({
                        mode: 'payment',
                        amount: sdkConfig.amount,
                        currency: sdkConfig.currency || config.currency.toLowerCase(),
                        appearance: {
                            theme: 'stripe',
                            variables: {
                                borderRadius: '8px'
                            }
                        }
                    });
                }

                // Build wallet config from ALL Stripe methods in the full config
                const walletConfig = this.buildWalletConfig(config.methods);
                const enabledWallets = Object.entries(walletConfig)
                    .filter(([, v]) => v === 'always')
                    .map(([k]) => k);

                console.log('[StripeExpress] Creating single element with wallets:', enabledWallets.join(', '));

                // Create a single element container
                const expressGlobalConfig = window.MerchelloExpressConfig || { buttonHeight: 40 };
                const elementContainer = document.createElement('div');
                elementContainer.id = 'stripe-express-element';
                elementContainer.style.width = '100%';
                elementContainer.style.minHeight = `${expressGlobalConfig.buttonHeight}px`;

                // Allow the container to stretch for multiple wallet buttons
                container.style.width = '100%';
                container.style.maxWidth = 'none';
                container.appendChild(elementContainer);

                // Create ONE Express Checkout Element with all enabled wallets
                const expressOptions = {
                    buttonHeight: sdkConfig.buttonHeight || expressGlobalConfig.buttonHeight,
                    buttonTheme: {
                        applePay: 'black',
                        googlePay: 'black',
                        paypal: 'gold',
                        klarna: 'default'
                    },
                    wallets: walletConfig,
                    layout: {
                        maxColumns: 1,
                        maxRows: Math.max(enabledWallets.length, 1)
                    }
                };

                const element = elementsInstance.create('expressCheckout', expressOptions);

                // Handle ready event to check availability
                element.on('ready', function(event) {
                    const availablePaymentMethods = event.availablePaymentMethods;
                    console.log('[StripeExpress] ready event - available methods:', availablePaymentMethods);

                    if (!availablePaymentMethods || Object.keys(availablePaymentMethods).length === 0) {
                        console.log('[StripeExpress] hiding - no methods available');
                        container.style.display = 'none';
                    } else {
                        const activeWallets = Object.entries(availablePaymentMethods)
                            .filter(([, v]) => v)
                            .map(([k]) => k);
                        console.log('[StripeExpress] available wallets:', activeWallets.join(', '));
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
                        // Determine which wallet was used from the Stripe event
                        const expressType = event.expressPaymentType;
                        const resolvedAlias = EXPRESS_TYPE_TO_ALIAS[expressType] || method.methodAlias;

                        console.log('[StripeExpress] confirm - expressPaymentType:', expressType, '-> methodAlias:', resolvedAlias);

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
                                providerAlias: 'stripe',
                                methodAlias: resolvedAlias,
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
                            resolvedAlias,
                            paymentIntentId,
                            customerData,
                            { paymentIntentId: paymentIntentId }
                        );
                    } catch (err) {
                        console.error('[StripeExpress] checkout error:', err);
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

                // Store references for cleanup
                expressCheckoutElement = element;
                mountedContainer = container;

            } catch (err) {
                console.error('[StripeExpress] initialization error:', err);
                container.style.display = 'none';
            }
        },

        /**
         * Build wallet config from all Stripe methods in the express config.
         * Enables only the wallets that correspond to enabled Stripe methods,
         * hides all others with 'never'.
         *
         * @param {Array} methods - All express methods from the config
         * @returns {Object} Stripe wallets configuration object
         */
        buildWalletConfig(methods) {
            const wallets = {
                applePay: 'never',
                googlePay: 'never',
                link: 'never',
                amazon_pay: 'never',
                paypal: 'never',
                klarna: 'never'
            };

            for (const m of (methods || [])) {
                if (m.providerAlias === 'stripe') {
                    const walletKey = ALIAS_TO_WALLET_KEY[m.methodAlias.toLowerCase()];
                    if (walletKey && walletKey in wallets) {
                        wallets[walletKey] = 'always';
                    }
                }
            }

            return wallets;
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
        },

        /**
         * Clean up all express buttons (called by express-checkout.js)
         */
        async teardownAll() {
            await this.teardown();
        },

        /**
         * Clean up Stripe express checkout element.
         * Destroys the element and resets state so a fresh instance can be created.
         */
        async teardown() {
            try {
                if (expressCheckoutElement) {
                    expressCheckoutElement.destroy();
                    expressCheckoutElement = null;
                }

                if (elementsInstance) {
                    elementsInstance = null;
                }

                currentConfig = null;
                mountedContainer = null;
            } catch (e) {
                console.warn('[StripeExpress] Error during teardown:', e);
            }
        }
    };

    // Register the adapter for Stripe provider (handles all Stripe express methods)
    window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};
    window.MerchelloExpressAdapters['stripe'] = stripeExpressAdapter;

    // Also register for specific method aliases
    window.MerchelloExpressAdapters['stripe:applepay'] = stripeExpressAdapter;
    window.MerchelloExpressAdapters['stripe:googlepay'] = stripeExpressAdapter;
    window.MerchelloExpressAdapters['stripe:link'] = stripeExpressAdapter;
    window.MerchelloExpressAdapters['stripe:amazonpay'] = stripeExpressAdapter;
    window.MerchelloExpressAdapters['stripe:paypal'] = stripeExpressAdapter;
    window.MerchelloExpressAdapters['stripe:klarna'] = stripeExpressAdapter;

})();
