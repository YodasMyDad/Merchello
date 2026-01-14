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
    let venmoInstances = {};
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
                } else if (methodAlias === 'venmo' || methodAlias === 'braintree-venmo') {
                    await this.renderVenmo(container, method, config, checkout, sdkConfig);
                } else {
                    container.style.display = 'none';
                }
            } catch (error) {
                // Silently hide the container on initialization error
                container.style.display = 'none';
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

            // Render native PayPal button - must await to complete before container is moved
            const expressConfig = window.MerchelloExpressConfig || { buttonHeight: 40 };
            await paypal.Buttons({
                fundingSource: paypal.FUNDING.PAYPAL,
                style: {
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                    height: expressConfig.buttonHeight
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
                                type: payload.type || ''
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

            // Check Apple Pay support - silently hide if not available
            if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
                container.style.display = 'none';
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
            const expressConfig = window.MerchelloExpressConfig || { buttonHeight: 40 };
            const button = document.createElement('apple-pay-button');
            button.setAttribute('buttonstyle', 'black');
            button.setAttribute('type', 'plain');
            button.setAttribute('locale', 'en');
            button.style.cssText = `--apple-pay-button-width: 100%; --apple-pay-button-height: ${expressConfig.buttonHeight}px; display: block;`;
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
                // Silently hide if Google Pay is not available
                container.style.display = 'none';
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

            const expressConfig = window.MerchelloExpressConfig || { buttonHeight: 40 };
            button.style.width = '100%';
            button.style.minHeight = `${expressConfig.buttonHeight}px`;
            container.appendChild(button);
        },

        /**
         * Render Venmo button using Braintree Venmo SDK
         */
        async renderVenmo(container, method, config, checkout, sdkConfig) {
            const methodAlias = method.methodAlias.toLowerCase();

            // Load Venmo SDK
            await loadScript(method.sdkUrl);
            await waitForGlobal('braintree.venmo');

            // Create Venmo instance with desktop support
            const venmoInstance = await braintree.venmo.create({
                client: clientInstances[methodAlias],
                allowDesktop: sdkConfig.allowDesktop !== false,
                allowDesktopWebLogin: sdkConfig.allowDesktopWebLogin !== false,
                mobileWebFallBack: sdkConfig.mobileWebFallBack !== false,
                paymentMethodUsage: sdkConfig.paymentMethodUsage || 'multi_use'
            });
            venmoInstances[methodAlias] = venmoInstance;

            // Check if Venmo is available on this device/browser - silently hide if not
            if (!venmoInstance.isBrowserSupported()) {
                container.style.display = 'none';
                return;
            }

            // Create Venmo button
            const expressConfig = window.MerchelloExpressConfig || { buttonHeight: 40, borderRadius: 6 };
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'venmo-button';
            button.style.cssText = `width: 100%; height: ${expressConfig.buttonHeight}px; background: #3D95CE; border: none; border-radius: ${expressConfig.borderRadius}px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;`;
            button.innerHTML = '<svg width="80" height="20" viewBox="0 0 64 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 0.5C11.2 1.7 11.5 2.9 11.5 4.5C11.5 8.9 7.7 14.6 4.6 18.5H0L2.3 1L7.3 0.5L6.2 11.5C7.5 9.4 9.1 6 9.1 3.8C9.1 2.5 8.9 1.6 8.5 0.9L10.5 0.5ZM17.5 7.5C18.5 7.5 20.5 7 20.5 5.5C20.5 4.7 20 4.3 19.3 4.3C18.3 4.3 17.6 5.3 17.5 7.5ZM17.3 10C17.3 12.3 18.3 13.2 19.8 13.2C21.2 13.2 22.5 12.8 24.3 11.8L23.8 15.5C22.5 16.3 20.5 17 18.3 17C14.3 17 12.5 14.5 12.5 11C12.5 6 15.5 1.5 20.3 1.5C23.3 1.5 25 3.3 25 5.8C25 9.5 21 10 17.3 10ZM32.5 4.8C33.5 4.8 34.3 5 35.3 5.5L34.5 9.5C33.7 9.1 32.8 8.8 31.8 8.8C30 8.8 29 10.5 29 12.5C29 14 29.7 14.8 30.8 14.8C31.7 14.8 32.5 14.5 33.5 13.8L33 17.5C32 18 30.5 18.5 29 18.5C26 18.5 24 16.3 24 13C24 8 27 1.5 32.5 1.5C34.3 1.5 36 2 37 2.8L35.5 6.5C34.8 6 33.8 5.5 32.8 5.5L32.5 4.8ZM44.5 4.8C43.3 4.8 42.5 6.3 42.5 8C42.5 9.5 43.2 10.3 44.2 10.3C45.4 10.3 46.2 8.8 46.2 7C46.2 5.7 45.5 4.8 44.5 4.8ZM43.5 13.8C42.2 13.8 41.2 13.3 40.5 12.5C40 14.3 39.3 16.3 38.5 18.5H33.5L38 1L42.5 0.5L42.3 2C43.3 1 44.5 0.5 46 0.5C48.8 0.5 51 2.8 51 6.3C51 11 47.8 14.5 43.5 13.8ZM58.5 1C60.5 1 62.5 1.5 64 2.3L63.3 6C61.8 5.3 60.3 4.8 58.8 4.8C57.8 4.8 57.3 5.1 57.3 5.7C57.3 7.3 64 7 64 11.5C64 15 61 17 57 17C55 17 52.8 16.5 51.3 15.5L52 12C53.5 13 55.5 13.5 57.3 13.5C58.5 13.5 59.3 13.1 59.3 12.3C59.3 10.7 52.3 11.1 52.3 6.5C52.3 3.3 55 1 58.5 1Z" fill="white"/></svg>';

            button.addEventListener('mouseenter', () => {
                button.style.background = '#2d7ab0';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = '#3D95CE';
            });

            button.addEventListener('click', async () => {
                // Guard against multiple submissions
                if (checkout.isProcessing) return;

                try {
                    checkout.isProcessing = true;
                    checkout.error = null;

                    // Tokenize Venmo payment
                    const payload = await venmoInstance.tokenize();

                    const customerData = this.extractVenmoCustomerData(payload);

                    await checkout.processExpressCheckout(
                        'braintree',
                        method.methodAlias,
                        payload.nonce,
                        customerData,
                        {
                            deviceData: dataCollectorInstances[methodAlias]?.deviceData || '',
                            type: 'VenmoAccount',
                            details: payload.details ? JSON.stringify(payload.details) : ''
                        }
                    );
                } catch (error) {
                    if (error.code === 'VENMO_CANCELED') {
                        // User cancelled - not an error
                        checkout.isProcessing = false;
                        return;
                    }
                    console.error('Venmo payment error:', error);
                    checkout.error = error.message || 'Venmo payment failed. Please try again.';
                    checkout.isProcessing = false;
                }
            });

            container.appendChild(button);
        },

        /**
         * Extract customer data from Venmo payment payload
         */
        extractVenmoCustomerData(payload) {
            const details = payload.details || {};
            return {
                email: details.email || '',
                fullName: details.username || '',
                phone: '',
                shippingAddress: null,
                billingAddress: null
            };
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

            if (venmoInstances[alias]) {
                try {
                    await venmoInstances[alias].teardown();
                } catch (e) {
                    console.warn('Error tearing down Venmo:', e);
                }
                delete venmoInstances[alias];
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
                ...Object.keys(venmoInstances),
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
    window.MerchelloExpressAdapters['braintree:venmo'] = braintreeExpressAdapter;

})();
