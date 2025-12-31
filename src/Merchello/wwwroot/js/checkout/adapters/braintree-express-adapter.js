/**
 * Braintree Express Checkout Adapter
 *
 * Handles Braintree Express Checkout for PayPal, Apple Pay, and Google Pay
 * using native SDKs for each payment method.
 *
 * See:
 * - PayPal: https://developer.paypal.com/braintree/docs/guides/paypal/client-side/javascript/v3/
 * - Apple Pay: https://developer.paypal.com/braintree/docs/guides/apple-pay/client-side/javascript/v3/
 * - Google Pay: https://developer.paypal.com/braintree/docs/guides/google-pay/client-side/javascript/v3/
 */
(function() {
    'use strict';

    // Store instances for cleanup
    let clientInstances = {};
    let paypalCheckoutInstances = {};
    let applePayInstances = {};
    let googlePayInstances = {};
    let dataCollectorInstances = {};

    /**
     * Load a script dynamically
     * @param {string} url - The script URL to load
     * @returns {Promise<void>}
     */
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src="${url}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Wait for a global object to be available
     * @param {string} name - The global object name
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<any>}
     */
    function waitForGlobal(name, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const parts = name.split('.');
            const check = () => {
                let obj = window;
                for (const part of parts) {
                    obj = obj?.[part];
                    if (obj === undefined) return false;
                }
                return obj;
            };

            const result = check();
            if (result) {
                resolve(result);
                return;
            }

            const startTime = Date.now();
            const interval = setInterval(() => {
                const result = check();
                if (result) {
                    clearInterval(interval);
                    resolve(result);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(new Error(`Timeout waiting for ${name}`));
                }
            }, 50);
        });
    }

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

                // Load the Braintree Client SDK
                if (sdkConfig.clientSdkUrl) {
                    await loadScript(sdkConfig.clientSdkUrl);
                    await waitForGlobal('braintree.client');
                }

                // Create Braintree client
                const methodAlias = method.methodAlias.toLowerCase();
                if (!clientInstances[methodAlias]) {
                    clientInstances[methodAlias] = await braintree.client.create({
                        authorization: sdkConfig.clientToken
                    });
                }

                // Load Data Collector for fraud protection
                if (sdkConfig.dataCollectorSdkUrl && !dataCollectorInstances[methodAlias]) {
                    try {
                        await loadScript(sdkConfig.dataCollectorSdkUrl);
                        await waitForGlobal('braintree.dataCollector');
                        dataCollectorInstances[methodAlias] = await braintree.dataCollector.create({
                            client: clientInstances[methodAlias],
                            paypal: methodAlias === 'paypal'
                        });
                    } catch (e) {
                        console.warn('Data collector initialization failed:', e);
                    }
                }

                // Route to appropriate method handler
                if (methodAlias === 'paypal' || methodAlias === 'braintree-paypal') {
                    await this.renderPayPal(container, method, config, checkout, sdkConfig);
                } else if (methodAlias === 'applepay' || methodAlias === 'braintree-applepay') {
                    await this.renderApplePay(container, method, config, checkout, sdkConfig);
                } else if (methodAlias === 'googlepay' || methodAlias === 'braintree-googlepay') {
                    await this.renderGooglePay(container, method, config, checkout, sdkConfig);
                } else {
                    console.warn('Unknown Braintree express method:', methodAlias);
                    container.style.display = 'none';
                }
            } catch (error) {
                console.error('Failed to initialize Braintree express checkout:', error);
                container.innerHTML = '<span class="text-red-500 text-sm">Express checkout unavailable</span>';
            }
        },

        /**
         * Render PayPal button using native PayPal Checkout SDK
         */
        async renderPayPal(container, method, config, checkout, sdkConfig) {
            const methodAlias = method.methodAlias.toLowerCase();

            // Load PayPal Checkout SDK
            await loadScript(method.sdkUrl);
            await waitForGlobal('braintree.paypalCheckout');

            // Create PayPal Checkout instance
            const paypalCheckoutInstance = await braintree.paypalCheckout.create({
                client: clientInstances[methodAlias]
            });
            paypalCheckoutInstances[methodAlias] = paypalCheckoutInstance;

            // Load the PayPal JS SDK
            await paypalCheckoutInstance.loadPayPalSDK({
                currency: config.currency,
                intent: 'capture'
            });

            // Create a unique container for the PayPal button
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'braintree-paypal-button-' + Date.now();
            buttonContainer.style.width = '100%';
            container.appendChild(buttonContainer);

            // Render native PayPal button
            paypal.Buttons({
                fundingSource: paypal.FUNDING.PAYPAL,
                style: {
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                    height: 48
                },
                createOrder: () => {
                    return paypalCheckoutInstance.createPayment({
                        flow: 'checkout',
                        amount: config.amount,
                        currency: config.currency,
                        intent: 'capture',
                        enableShippingAddress: true,
                        shippingAddressEditable: false
                    });
                },
                onApprove: async (data) => {
                    // Guard against multiple submissions
                    if (checkout.isProcessing) return;
                    checkout.isProcessing = true;
                    checkout.error = null;

                    try {
                        const payload = await paypalCheckoutInstance.tokenizePayment(data);
                        const customerData = this.extractPayPalCustomerData(payload);

                        await checkout.processExpressCheckout(
                            'braintree',
                            method.methodAlias,
                            payload.nonce,
                            customerData,
                            {
                                deviceData: dataCollectorInstances[methodAlias]?.deviceData || '',
                                type: payload.type,
                                details: payload.details
                            }
                        );
                    } catch (error) {
                        console.error('Braintree PayPal express checkout error:', error);
                        checkout.error = error.message || 'Payment failed. Please try again.';
                        checkout.isProcessing = false;
                    }
                },
                onCancel: () => {
                    checkout.isProcessing = false;
                },
                onError: (err) => {
                    console.error('PayPal button error:', err);
                    checkout.error = 'PayPal error. Please try again.';
                    checkout.isProcessing = false;
                }
            }).render(buttonContainer);
        },

        /**
         * Render Apple Pay button using native Apple Pay SDK
         */
        async renderApplePay(container, method, config, checkout, sdkConfig) {
            const methodAlias = method.methodAlias.toLowerCase();

            // Check Apple Pay support
            if (!window.ApplePaySession) {
                container.innerHTML = '<div style="padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; color: #92400e; font-size: 14px; text-align: center;">Apple Pay is only available in Safari on Apple devices</div>';
                return;
            }

            if (!ApplePaySession.canMakePayments()) {
                container.innerHTML = '<div style="padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; color: #92400e; font-size: 14px; text-align: center;">Apple Pay is not set up on this device. Please add a card to Apple Wallet.</div>';
                return;
            }

            // Load Apple Pay SDK
            await loadScript(method.sdkUrl);
            await waitForGlobal('braintree.applePay');

            // Create Apple Pay instance
            const applePayInstance = await braintree.applePay.create({
                client: clientInstances[methodAlias]
            });
            applePayInstances[methodAlias] = applePayInstance;

            // Create Apple Pay button
            const button = document.createElement('apple-pay-button');
            button.setAttribute('buttonstyle', 'black');
            button.setAttribute('type', 'plain');
            button.setAttribute('locale', 'en');
            button.style.cssText = '--apple-pay-button-width: 100%; --apple-pay-button-height: 48px; display: block;';
            container.appendChild(button);

            button.addEventListener('click', async (event) => {
                event.preventDefault();

                // Guard against multiple submissions
                if (checkout.isProcessing) return;

                try {
                    // Create payment request
                    const paymentRequest = applePayInstance.createPaymentRequest({
                        total: {
                            label: sdkConfig.displayName || 'Total',
                            amount: config.amount.toFixed(2)
                        },
                        requiredBillingContactFields: ['postalAddress', 'name'],
                        requiredShippingContactFields: ['postalAddress', 'name', 'email', 'phone']
                    });

                    // Create Apple Pay session
                    const session = new ApplePaySession(3, paymentRequest);

                    session.onvalidatemerchant = async (event) => {
                        try {
                            const merchantSession = await applePayInstance.performValidation({
                                validationURL: event.validationURL,
                                displayName: sdkConfig.displayName || 'Store'
                            });
                            session.completeMerchantValidation(merchantSession);
                        } catch (error) {
                            console.error('Apple Pay merchant validation failed:', error);
                            session.abort();
                        }
                    };

                    session.onpaymentauthorized = async (event) => {
                        checkout.isProcessing = true;
                        checkout.error = null;

                        try {
                            const payload = await applePayInstance.tokenize({
                                token: event.payment.token
                            });

                            const customerData = this.extractApplePayCustomerData(event.payment);

                            await checkout.processExpressCheckout(
                                'braintree',
                                method.methodAlias,
                                payload.nonce,
                                customerData,
                                {
                                    deviceData: dataCollectorInstances[methodAlias]?.deviceData || '',
                                    type: 'ApplePayCard'
                                }
                            );

                            session.completePayment(ApplePaySession.STATUS_SUCCESS);
                        } catch (error) {
                            console.error('Apple Pay authorization failed:', error);
                            session.completePayment(ApplePaySession.STATUS_FAILURE);
                            checkout.error = error.message || 'Payment failed. Please try again.';
                            checkout.isProcessing = false;
                        }
                    };

                    session.oncancel = () => {
                        checkout.isProcessing = false;
                    };

                    session.begin();
                } catch (error) {
                    console.error('Apple Pay session error:', error);
                    checkout.error = 'Apple Pay error. Please try again.';
                }
            });
        },

        /**
         * Render Google Pay button using native Google Pay SDK
         */
        async renderGooglePay(container, method, config, checkout, sdkConfig) {
            const methodAlias = method.methodAlias.toLowerCase();

            // Load Google Pay script
            if (sdkConfig.googlePayScriptUrl) {
                await loadScript(sdkConfig.googlePayScriptUrl);
                await waitForGlobal('google.payments.api.PaymentsClient');
            }

            // Load Braintree Google Payment SDK
            await loadScript(method.sdkUrl);
            await waitForGlobal('braintree.googlePayment');

            // Create Google Pay client
            const environment = sdkConfig.isTestMode ? 'TEST' : 'PRODUCTION';
            const paymentsClient = new google.payments.api.PaymentsClient({
                environment: environment
            });

            // Create Braintree Google Payment instance
            const googlePayInstance = await braintree.googlePayment.create({
                client: clientInstances[methodAlias],
                googlePayVersion: 2,
                googleMerchantId: sdkConfig.googleMerchantId || undefined
            });
            googlePayInstances[methodAlias] = googlePayInstance;

            // Check if ready to pay
            const baseRequest = googlePayInstance.createPaymentDataRequest();
            const isReadyToPayRequest = {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: baseRequest.allowedPaymentMethods
            };

            const readyToPay = await paymentsClient.isReadyToPay(isReadyToPayRequest);
            if (!readyToPay.result) {
                container.innerHTML = '<div style="padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; color: #92400e; font-size: 14px; text-align: center;">Google Pay is not available. Please ensure you have a supported browser and a payment method set up in Google Pay.</div>';
                return;
            }

            // Create Google Pay button
            const button = paymentsClient.createButton({
                onClick: async () => {
                    // Guard against multiple submissions
                    if (checkout.isProcessing) return;

                    try {
                        // Create payment data request
                        const paymentDataRequest = googlePayInstance.createPaymentDataRequest({
                            transactionInfo: {
                                totalPriceStatus: 'FINAL',
                                totalPrice: config.amount.toFixed(2),
                                currencyCode: config.currency
                            }
                        });

                        // Add billing address requirements
                        paymentDataRequest.allowedPaymentMethods.forEach(method => {
                            method.parameters.billingAddressRequired = true;
                            method.parameters.billingAddressParameters = {
                                format: 'FULL',
                                phoneNumberRequired: true
                            };
                        });

                        // Request email address
                        paymentDataRequest.emailRequired = true;

                        // Load payment data
                        const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

                        checkout.isProcessing = true;
                        checkout.error = null;

                        // Parse response to get nonce
                        const payload = await googlePayInstance.parseResponse(paymentData);

                        const customerData = this.extractGooglePayCustomerData(paymentData);

                        await checkout.processExpressCheckout(
                            'braintree',
                            method.methodAlias,
                            payload.nonce,
                            customerData,
                            {
                                deviceData: dataCollectorInstances[methodAlias]?.deviceData || '',
                                type: 'AndroidPayCard'
                            }
                        );
                    } catch (error) {
                        if (error.statusCode === 'CANCELED') {
                            checkout.isProcessing = false;
                            return;
                        }
                        console.error('Google Pay error:', error);
                        checkout.error = error.message || 'Payment failed. Please try again.';
                        checkout.isProcessing = false;
                    }
                },
                buttonColor: 'default',
                buttonType: 'plain',
                buttonSizeMode: 'fill'
            });

            button.style.width = '100%';
            button.style.minHeight = '48px';
            container.appendChild(button);
        },

        /**
         * Extract customer data from PayPal payment payload
         */
        extractPayPalCustomerData(payload) {
            const details = payload.details || {};
            return {
                email: details.email || '',
                fullName: ((details.firstName || '') + ' ' + (details.lastName || '')).trim(),
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
        },

        /**
         * Extract customer data from Apple Pay payment
         */
        extractApplePayCustomerData(payment) {
            const billingContact = payment.billingContact || {};
            const shippingContact = payment.shippingContact || {};

            return {
                email: shippingContact.emailAddress || '',
                fullName: shippingContact.givenName && shippingContact.familyName
                    ? shippingContact.givenName + ' ' + shippingContact.familyName
                    : '',
                phone: shippingContact.phoneNumber || '',
                shippingAddress: shippingContact.postalAddress ? {
                    line1: (shippingContact.postalAddress.street || '').split('\n')[0] || '',
                    line2: (shippingContact.postalAddress.street || '').split('\n')[1] || '',
                    city: shippingContact.postalAddress.city || '',
                    region: shippingContact.postalAddress.state || '',
                    postalCode: shippingContact.postalAddress.postalCode || '',
                    countryCode: shippingContact.postalAddress.countryCode || ''
                } : null,
                billingAddress: billingContact.postalAddress ? {
                    line1: (billingContact.postalAddress.street || '').split('\n')[0] || '',
                    line2: (billingContact.postalAddress.street || '').split('\n')[1] || '',
                    city: billingContact.postalAddress.city || '',
                    region: billingContact.postalAddress.state || '',
                    postalCode: billingContact.postalAddress.postalCode || '',
                    countryCode: billingContact.postalAddress.countryCode || ''
                } : null
            };
        },

        /**
         * Extract customer data from Google Pay payment data
         */
        extractGooglePayCustomerData(paymentData) {
            const paymentMethodData = paymentData.paymentMethodData || {};
            const info = paymentMethodData.info || {};
            const billingAddress = info.billingAddress || {};

            return {
                email: paymentData.email || '',
                fullName: billingAddress.name || '',
                phone: billingAddress.phoneNumber || '',
                shippingAddress: null, // Google Pay doesn't provide shipping in basic flow
                billingAddress: {
                    line1: billingAddress.address1 || '',
                    line2: [billingAddress.address2, billingAddress.address3].filter(Boolean).join(' '),
                    city: billingAddress.locality || '',
                    region: billingAddress.administrativeArea || '',
                    postalCode: billingAddress.postalCode || '',
                    countryCode: billingAddress.countryCode || ''
                }
            };
        },

        /**
         * Clean up a specific instance
         * @param {string} methodAlias - The method alias to clean up
         */
        async teardown(methodAlias) {
            const alias = methodAlias.toLowerCase();

            if (paypalCheckoutInstances[alias]) {
                try {
                    await paypalCheckoutInstances[alias].teardown();
                } catch (e) {
                    console.warn('Error tearing down PayPal Checkout:', e);
                }
                delete paypalCheckoutInstances[alias];
            }

            if (applePayInstances[alias]) {
                try {
                    await applePayInstances[alias].teardown();
                } catch (e) {
                    console.warn('Error tearing down Apple Pay:', e);
                }
                delete applePayInstances[alias];
            }

            if (googlePayInstances[alias]) {
                try {
                    await googlePayInstances[alias].teardown();
                } catch (e) {
                    console.warn('Error tearing down Google Pay:', e);
                }
                delete googlePayInstances[alias];
            }

            if (dataCollectorInstances[alias]) {
                try {
                    await dataCollectorInstances[alias].teardown();
                } catch (e) {
                    console.warn('Error tearing down Data Collector:', e);
                }
                delete dataCollectorInstances[alias];
            }

            if (clientInstances[alias]) {
                try {
                    await clientInstances[alias].teardown();
                } catch (e) {
                    console.warn('Error tearing down Braintree client:', e);
                }
                delete clientInstances[alias];
            }
        },

        /**
         * Clean up all instances
         */
        async teardownAll() {
            const aliases = new Set([
                ...Object.keys(clientInstances),
                ...Object.keys(paypalCheckoutInstances),
                ...Object.keys(applePayInstances),
                ...Object.keys(googlePayInstances),
                ...Object.keys(dataCollectorInstances)
            ]);

            for (const alias of aliases) {
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
