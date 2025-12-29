/**
 * Braintree Express Checkout Adapter
 *
 * Handles Braintree Express Checkout for PayPal, Apple Pay, and Google Pay
 * via Braintree's Drop-in UI or individual component SDKs.
 *
 * See: https://developer.paypal.com/braintree/docs/guides/drop-in/overview
 */
(function() {
    'use strict';

    // Store Braintree instances for cleanup
    let dropinInstances = {};

    /**
     * Braintree Express Checkout Adapter
     * Registered for Braintree express checkout methods (PayPal, Apple Pay, Google Pay)
     */
    const braintreeExpressAdapter = {
        /**
         * Render a Braintree express checkout button
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} method - The payment method configuration
         * @param {Object} config - The full express checkout config (currency, amount, etc.)
         * @param {Object} checkout - The checkout Alpine.js component instance
         */
        async render(container, method, config, checkout) {
            try {
                const sdkConfig = method.sdkConfig || {};

                // Validate required config
                if (!sdkConfig.clientToken) {
                    console.error('Braintree client token not provided for express checkout');
                    container.style.display = 'none';
                    return;
                }

                // Wait for Braintree SDK
                if (typeof braintree === 'undefined' || typeof braintree.dropin === 'undefined') {
                    console.error('Braintree Drop-in SDK not loaded');
                    container.style.display = 'none';
                    return;
                }

                // Create a unique container for this method
                const elementContainer = document.createElement('div');
                elementContainer.id = 'braintree-express-' + method.methodAlias;
                elementContainer.style.minWidth = '150px';
                container.appendChild(elementContainer);

                // Build Drop-in options based on method type
                const dropinOptions = {
                    authorization: sdkConfig.clientToken,
                    container: '#' + elementContainer.id
                };

                // Configure based on method type
                const methodAlias = method.methodAlias.toLowerCase();

                if (methodAlias === 'paypal' || methodAlias === 'braintree-paypal') {
                    dropinOptions.paypal = {
                        flow: 'checkout',
                        amount: config.amount.toFixed(2),
                        currency: config.currency,
                        buttonStyle: {
                            color: 'gold',
                            shape: 'rect',
                            size: 'responsive',
                            label: 'paypal',
                            height: 48
                        }
                    };
                } else if (methodAlias === 'applepay' || methodAlias === 'braintree-applepay') {
                    dropinOptions.applePay = {
                        displayName: sdkConfig.displayName || 'Merchello Store',
                        paymentRequest: {
                            total: {
                                label: sdkConfig.displayName || 'Total',
                                amount: config.amount.toFixed(2)
                            },
                            requiredBillingContactFields: ['postalAddress', 'name'],
                            requiredShippingContactFields: ['postalAddress', 'name', 'email', 'phone']
                        }
                    };
                } else if (methodAlias === 'googlepay' || methodAlias === 'braintree-googlepay') {
                    dropinOptions.googlePay = {
                        merchantId: sdkConfig.googleMerchantId || '',
                        transactionInfo: {
                            totalPriceStatus: 'FINAL',
                            totalPrice: config.amount.toFixed(2),
                            currencyCode: config.currency
                        },
                        allowedPaymentMethods: [{
                            type: 'CARD',
                            parameters: {
                                billingAddressRequired: true,
                                billingAddressParameters: {
                                    format: 'FULL',
                                    phoneNumberRequired: true
                                }
                            }
                        }]
                    };
                } else {
                    console.warn('Unknown Braintree express method:', methodAlias);
                    container.style.display = 'none';
                    return;
                }

                // Create the Drop-in instance
                const dropinInstance = await braintree.dropin.create(dropinOptions);
                dropinInstances[method.methodAlias] = dropinInstance;

                // Listen for payment method selection
                dropinInstance.on('paymentMethodRequestable', async function(event) {
                    // Guard against multiple submissions
                    if (checkout.isProcessing) {
                        return;
                    }
                    checkout.isProcessing = true;
                    checkout.error = null;

                    try {
                        // Request payment method nonce
                        const payload = await dropinInstance.requestPaymentMethod();

                        // Extract customer data from the payload
                        const customerData = braintreeExpressAdapter.extractCustomerData(payload);

                        // Process express checkout on our server
                        await checkout.processExpressCheckout(
                            'braintree',
                            method.methodAlias,
                            payload.nonce,
                            customerData,
                            {
                                deviceData: payload.deviceData || '',
                                type: payload.type,
                                details: payload.details
                            }
                        );
                    } catch (error) {
                        console.error('Braintree express checkout error:', error);
                        checkout.error = error.message || 'Payment failed. Please try again.';
                        checkout.isProcessing = false;
                    }
                });

                // Handle payment method not requestable (e.g., user cancelled)
                dropinInstance.on('noPaymentMethodRequestable', function() {
                    checkout.isProcessing = false;
                });

            } catch (error) {
                console.error('Failed to initialize Braintree express checkout:', error);
                var errorSpan = document.createElement('span');
                errorSpan.className = 'text-red-500 text-sm';
                errorSpan.textContent = 'Express checkout unavailable';
                container.replaceChildren(errorSpan);
            }
        },

        /**
         * Extract customer data from Braintree payment payload
         * @param {Object} payload - The Braintree payment method payload
         * @returns {Object} Customer data in our format
         */
        extractCustomerData: function(payload) {
            const details = payload.details || {};

            // PayPal provides different data structure
            if (payload.type === 'PayPalAccount') {
                return {
                    email: details.email || '',
                    fullName: (details.firstName || '') + ' ' + (details.lastName || ''),
                    phone: details.phone || '',
                    shippingAddress: details.shippingAddress ? {
                        line1: details.shippingAddress.line1 || '',
                        line2: details.shippingAddress.line2 || '',
                        city: details.shippingAddress.city || '',
                        region: details.shippingAddress.state || '',
                        postalCode: details.shippingAddress.postalCode || '',
                        countryCode: details.shippingAddress.countryCode || ''
                    } : null,
                    billingAddress: details.billingAddress ? {
                        line1: details.billingAddress.line1 || '',
                        line2: details.billingAddress.line2 || '',
                        city: details.billingAddress.city || '',
                        region: details.billingAddress.state || '',
                        postalCode: details.billingAddress.postalCode || '',
                        countryCode: details.billingAddress.countryCode || ''
                    } : null
                };
            }

            // Apple Pay provides different data structure
            if (payload.type === 'ApplePayCard') {
                const billingContact = details.billingContact || {};
                const shippingContact = details.shippingContact || {};

                return {
                    email: shippingContact.emailAddress || '',
                    fullName: shippingContact.givenName && shippingContact.familyName
                        ? shippingContact.givenName + ' ' + shippingContact.familyName
                        : '',
                    phone: shippingContact.phoneNumber || '',
                    shippingAddress: shippingContact.postalAddress ? {
                        line1: shippingContact.postalAddress.street || '',
                        line2: '',
                        city: shippingContact.postalAddress.city || '',
                        region: shippingContact.postalAddress.state || '',
                        postalCode: shippingContact.postalAddress.postalCode || '',
                        countryCode: shippingContact.postalAddress.countryCode || ''
                    } : null,
                    billingAddress: billingContact.postalAddress ? {
                        line1: billingContact.postalAddress.street || '',
                        line2: '',
                        city: billingContact.postalAddress.city || '',
                        region: billingContact.postalAddress.state || '',
                        postalCode: billingContact.postalAddress.postalCode || '',
                        countryCode: billingContact.postalAddress.countryCode || ''
                    } : null
                };
            }

            // Google Pay provides different data structure
            if (payload.type === 'AndroidPayCard') {
                const billingAddress = details.billingAddress || {};

                return {
                    email: details.email || '',
                    fullName: billingAddress.name || '',
                    phone: billingAddress.phoneNumber || '',
                    shippingAddress: null, // Google Pay doesn't provide shipping in Drop-in
                    billingAddress: {
                        line1: billingAddress.address1 || '',
                        line2: billingAddress.address2 || '',
                        city: billingAddress.locality || '',
                        region: billingAddress.administrativeArea || '',
                        postalCode: billingAddress.postalCode || '',
                        countryCode: billingAddress.countryCodeAlpha2 || ''
                    }
                };
            }

            // Default/fallback
            return {
                email: '',
                fullName: '',
                phone: '',
                shippingAddress: null,
                billingAddress: null
            };
        },

        /**
         * Clean up a specific Drop-in instance
         * @param {string} methodAlias - The method alias to clean up
         */
        async teardown(methodAlias) {
            if (dropinInstances[methodAlias]) {
                try {
                    await dropinInstances[methodAlias].teardown();
                } catch (error) {
                    console.warn('Error tearing down Braintree express Drop-in:', error);
                }
                delete dropinInstances[methodAlias];
            }
        },

        /**
         * Clean up all Drop-in instances
         */
        async teardownAll() {
            for (const alias of Object.keys(dropinInstances)) {
                await this.teardown(alias);
            }
        }
    };

    // Register the adapter for Braintree provider
    window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};
    window.MerchelloExpressAdapters['braintree'] = braintreeExpressAdapter;

    // Also register for specific method aliases
    window.MerchelloExpressAdapters['braintree:paypal'] = braintreeExpressAdapter;
    window.MerchelloExpressAdapters['braintree:applepay'] = braintreeExpressAdapter;
    window.MerchelloExpressAdapters['braintree:googlepay'] = braintreeExpressAdapter;

})();
