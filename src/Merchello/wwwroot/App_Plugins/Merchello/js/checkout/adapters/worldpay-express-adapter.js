/**
 * WorldPay Express Checkout Adapter
 *
 * Handles WorldPay Express Checkout for Apple Pay and Google Pay.
 * Uses native Apple Pay JS and Google Pay JS APIs with WorldPay as the gateway.
 *
 * See:
 * - Apple Pay: https://developer.worldpay.com/products/wallets/applepay
 * - Google Pay: https://developer.worldpay.com/products/access/wallets/googlepay/
 */
(function() {
    'use strict';

    // Store instances for cleanup
    let googlePayClient = null;
    let currentConfig = null;

    /**
     * Load a script dynamically
     * @param {string} url - The script URL to load
     * @returns {Promise<void>}
     */
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            if (!url) {
                resolve();
                return;
            }

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
     * WorldPay Express Checkout Adapter
     * Registered for WorldPay express checkout methods (Apple Pay, Google Pay)
     */
    const worldpayExpressAdapter = {
        /**
         * Adapter configuration
         */
        config: {
            name: 'WorldPay Express',
            supportsStandard: false,
            supportsExpress: true
        },

        /**
         * Render a WorldPay express checkout button
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} method - The payment method configuration
         * @param {Object} config - The full express checkout config (currency, amount, etc.)
         * @param {Object} checkout - The checkout Alpine.js component instance
         */
        async render(container, method, config, checkout) {
            try {
                const sdkConfig = method.sdkConfig || {};
                currentConfig = { method, config, checkout, sdkConfig };

                const methodAlias = method.methodAlias?.toLowerCase();

                // Route to appropriate method handler
                if (methodAlias === 'applepay' || methodAlias === 'worldpay-applepay') {
                    await this.renderApplePay(container, method, config, checkout, sdkConfig);
                } else if (methodAlias === 'googlepay' || methodAlias === 'worldpay-googlepay') {
                    await this.renderGooglePay(container, method, config, checkout, sdkConfig);
                } else {
                    console.warn('Unknown WorldPay express method:', methodAlias);
                    container.style.display = 'none';
                }
            } catch (error) {
                console.error('WorldPay express render error:', error);
                container.style.display = 'none';
            }
        },

        /**
         * Render Apple Pay button
         */
        async renderApplePay(container, method, config, checkout, sdkConfig) {
            // Check if Apple Pay is available
            if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
                console.debug('Apple Pay not available on this device/browser');
                container.style.display = 'none';
                return;
            }

            // Check if Apple Merchant ID is configured
            if (!sdkConfig.appleMerchantId) {
                console.warn('Apple Pay merchant ID not configured');
                container.style.display = 'none';
                return;
            }

            // Create Apple Pay button
            const expressConfig = window.MerchelloExpressConfig || { buttonHeight: 44, borderRadius: 6 };
            container.innerHTML = `
                <button type="button" class="worldpay-apple-pay-button" aria-label="Pay with Apple Pay">
                    <span class="worldpay-apple-pay-logo"></span>
                </button>
                <style>
                    .worldpay-apple-pay-button {
                        -webkit-appearance: -apple-pay-button;
                        -apple-pay-button-type: buy;
                        -apple-pay-button-style: black;
                        width: 100%;
                        height: ${expressConfig.buttonHeight}px;
                        border: none;
                        border-radius: ${expressConfig.borderRadius}px;
                        cursor: pointer;
                    }
                    .worldpay-apple-pay-button:hover {
                        opacity: 0.9;
                    }
                </style>
            `;

            const button = container.querySelector('.worldpay-apple-pay-button');
            button.addEventListener('click', () => this.handleApplePayClick(method, config, checkout, sdkConfig));
        },

        /**
         * Handle Apple Pay button click
         */
        async handleApplePayClick(method, config, checkout, sdkConfig) {
            const paymentRequest = {
                countryCode: sdkConfig.countryCode || 'GB',
                currencyCode: sdkConfig.currency || config.currency || 'GBP',
                merchantCapabilities: ['supports3DS'],
                supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
                total: {
                    label: sdkConfig.displayName || 'Total',
                    amount: String(sdkConfig.amount || config.amount || '0.00'),
                    type: 'final'
                },
                requiredBillingContactFields: ['postalAddress', 'name'],
                requiredShippingContactFields: ['email', 'phone', 'postalAddress']
            };

            const session = new ApplePaySession(3, paymentRequest);

            // Handle merchant validation
            session.onvalidatemerchant = async (event) => {
                try {
                    // In production, you'd call your server to get the merchant session
                    // For WorldPay, this typically involves calling their validation endpoint
                    console.debug('Apple Pay merchant validation requested:', event.validationURL);

                    // For now, we'll need the server to handle this
                    // This would require an additional API endpoint
                    const response = await fetch('/api/merchello/checkout/worldpay/apple-pay-validate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            validationURL: event.validationURL,
                            merchantId: sdkConfig.appleMerchantId
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Merchant validation failed');
                    }

                    const merchantSession = await response.json();
                    session.completeMerchantValidation(merchantSession);
                } catch (error) {
                    console.error('Apple Pay merchant validation error:', error);
                    session.abort();
                }
            };

            // Handle payment authorization
            session.onpaymentauthorized = async (event) => {
                try {
                    const payment = event.payment;

                    // Extract customer data
                    const customerData = this.extractApplePayCustomerData(payment);

                    // Send payment token to server
                    const result = await this.submitExpressPayment(
                        'applepay',
                        JSON.stringify(payment.token.paymentData),
                        customerData,
                        config,
                        checkout
                    );

                    if (result.success) {
                        session.completePayment(ApplePaySession.STATUS_SUCCESS);
                        const redirectUrl = result.redirectUrl || `/checkout/confirmation/${result.invoiceId}`;
                        window.location.href = redirectUrl;
                    } else {
                        session.completePayment(ApplePaySession.STATUS_FAILURE);
                        if (checkout) {
                            checkout.error = result.errorMessage || 'Apple Pay payment failed. Please try again.';
                            checkout.isProcessing = false;
                        }
                    }
                } catch (error) {
                    console.error('Apple Pay authorization error:', error);
                    session.completePayment(ApplePaySession.STATUS_FAILURE);
                    if (checkout) {
                        checkout.error = 'An error occurred processing your Apple Pay payment.';
                        checkout.isProcessing = false;
                    }
                }
            };

            session.oncancel = () => {
                console.debug('Apple Pay cancelled by user');
            };

            session.begin();
        },

        /**
         * Render Google Pay button
         */
        async renderGooglePay(container, method, config, checkout, sdkConfig) {
            // Load Google Pay SDK
            if (method.sdkUrl) {
                await loadScript(method.sdkUrl);
                await waitForGlobal('google.payments.api.PaymentsClient');
            }

            if (!window.google?.payments?.api?.PaymentsClient) {
                console.warn('Google Pay SDK not loaded');
                container.style.display = 'none';
                return;
            }

            // Check if Google Merchant ID is configured
            if (!sdkConfig.googleMerchantId) {
                console.warn('Google Pay merchant ID not configured');
                container.style.display = 'none';
                return;
            }

            const isTestMode = sdkConfig.isTestMode !== false;

            // Create Google Pay client
            googlePayClient = new google.payments.api.PaymentsClient({
                environment: isTestMode ? 'TEST' : 'PRODUCTION'
            });

            const baseRequest = {
                apiVersion: 2,
                apiVersionMinor: 0
            };

            const tokenizationSpecification = {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                    gateway: 'worldpay',
                    gatewayMerchantId: sdkConfig.googleMerchantId
                }
            };

            const allowedCardNetworks = ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'];
            const allowedCardAuthMethods = ['CRYPTOGRAM_3DS', 'PAN_ONLY'];

            const baseCardPaymentMethod = {
                type: 'CARD',
                parameters: {
                    allowedAuthMethods: allowedCardAuthMethods,
                    allowedCardNetworks: allowedCardNetworks,
                    billingAddressRequired: true,
                    billingAddressParameters: {
                        format: 'FULL',
                        phoneNumberRequired: true
                    }
                }
            };

            const cardPaymentMethod = {
                ...baseCardPaymentMethod,
                tokenizationSpecification
            };

            // Check if Google Pay is available
            const isReadyToPayRequest = {
                ...baseRequest,
                allowedPaymentMethods: [baseCardPaymentMethod]
            };

            try {
                const isReady = await googlePayClient.isReadyToPay(isReadyToPayRequest);

                if (!isReady.result) {
                    console.debug('Google Pay not available');
                    container.style.display = 'none';
                    return;
                }
            } catch (error) {
                console.error('Google Pay isReadyToPay error:', error);
                container.style.display = 'none';
                return;
            }

            // Create Google Pay button
            const googlePayButton = googlePayClient.createButton({
                onClick: () => this.handleGooglePayClick(method, config, checkout, sdkConfig, cardPaymentMethod),
                buttonType: 'buy',
                buttonColor: 'black',
                buttonSizeMode: 'fill'
            });

            container.innerHTML = '';
            container.appendChild(googlePayButton);

            // Add some styling
            const gpExpressConfig = window.MerchelloExpressConfig || { buttonHeight: 44, borderRadius: 6 };
            const style = document.createElement('style');
            style.textContent = `
                .worldpay-google-pay-container {
                    width: 100%;
                }
                .worldpay-google-pay-container button {
                    width: 100%;
                    min-height: ${gpExpressConfig.buttonHeight}px;
                }
            `;
            container.appendChild(style);
            container.classList.add('worldpay-google-pay-container');
        },

        /**
         * Handle Google Pay button click
         */
        async handleGooglePayClick(method, config, checkout, sdkConfig, cardPaymentMethod) {
            const paymentDataRequest = {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: [cardPaymentMethod],
                transactionInfo: {
                    totalPriceStatus: 'FINAL',
                    totalPrice: String(sdkConfig.amount || config.amount || '0.00'),
                    currencyCode: sdkConfig.currency || config.currency || 'GBP',
                    countryCode: sdkConfig.countryCode || 'GB'
                },
                merchantInfo: {
                    merchantId: sdkConfig.googleMerchantId,
                    merchantName: sdkConfig.displayName || 'Store'
                },
                emailRequired: true,
                shippingAddressRequired: true,
                shippingAddressParameters: {
                    phoneNumberRequired: true
                }
            };

            try {
                const paymentData = await googlePayClient.loadPaymentData(paymentDataRequest);

                // Extract customer data
                const customerData = this.extractGooglePayCustomerData(paymentData);

                // Extract payment token
                const paymentToken = paymentData.paymentMethodData.tokenizationData.token;

                // Submit to server
                const result = await this.submitExpressPayment(
                    'googlepay',
                    paymentToken,
                    customerData,
                    config,
                    checkout
                );

                if (result.success) {
                    const redirectUrl = result.redirectUrl || `/checkout/confirmation/${result.invoiceId}`;
                    window.location.href = redirectUrl;
                } else {
                    console.error('Google Pay payment failed:', result.errorMessage);
                    if (checkout) {
                        checkout.error = result.errorMessage || 'Google Pay payment failed. Please try again.';
                        checkout.isProcessing = false;
                    }
                }
            } catch (error) {
                if (error.statusCode === 'CANCELED') {
                    console.debug('Google Pay cancelled by user');
                } else {
                    console.error('Google Pay error:', error);
                    if (checkout) {
                        checkout.error = error.message || 'Google Pay failed. Please try again.';
                        checkout.isProcessing = false;
                    }
                }
            }
        },

        /**
         * Submit express checkout payment to server
         */
        async submitExpressPayment(methodAlias, paymentToken, customerData, config, checkout) {
            try {
                const response = await fetch('/api/merchello/checkout/express', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        basketId: checkout?.basketId || config.basketId,
                        providerAlias: 'worldpay',
                        methodAlias: methodAlias,
                        paymentToken: paymentToken,
                        customerData: customerData,
                        amount: config.amount,
                        currency: config.currency
                    })
                });

                return await response.json();
            } catch (error) {
                console.error('Express payment submission error:', error);
                return { success: false, errorMessage: error.message };
            }
        },

        /**
         * Extract customer data from Apple Pay payment
         */
        extractApplePayCustomerData(payment) {
            const shipping = payment.shippingContact || {};
            const billing = payment.billingContact || {};

            return {
                email: shipping.emailAddress || billing.emailAddress || '',
                fullName: [shipping.givenName, shipping.familyName].filter(Boolean).join(' '),
                phone: shipping.phoneNumber,
                shippingAddress: shipping.postalAddress ? {
                    line1: (shipping.postalAddress.addressLines || [])[0] || '',
                    line2: (shipping.postalAddress.addressLines || [])[1] || '',
                    city: shipping.postalAddress.locality || '',
                    region: shipping.postalAddress.administrativeArea || '',
                    postalCode: shipping.postalAddress.postalCode || '',
                    countryCode: shipping.postalAddress.countryCode || ''
                } : null,
                billingAddress: billing.postalAddress ? {
                    line1: (billing.postalAddress.addressLines || [])[0] || '',
                    line2: (billing.postalAddress.addressLines || [])[1] || '',
                    city: billing.postalAddress.locality || '',
                    region: billing.postalAddress.administrativeArea || '',
                    postalCode: billing.postalAddress.postalCode || '',
                    countryCode: billing.postalAddress.countryCode || ''
                } : null
            };
        },

        /**
         * Extract customer data from Google Pay payment
         */
        extractGooglePayCustomerData(paymentData) {
            const shippingAddress = paymentData.shippingAddress || {};
            const billingAddress = paymentData.paymentMethodData?.info?.billingAddress || {};

            return {
                email: paymentData.email || '',
                fullName: shippingAddress.name || billingAddress.name || '',
                phone: shippingAddress.phoneNumber || billingAddress.phoneNumber || '',
                shippingAddress: shippingAddress.address1 ? {
                    line1: shippingAddress.address1 || '',
                    line2: shippingAddress.address2 || '',
                    city: shippingAddress.locality || '',
                    region: shippingAddress.administrativeArea || '',
                    postalCode: shippingAddress.postalCode || '',
                    countryCode: shippingAddress.countryCode || ''
                } : null,
                billingAddress: billingAddress.address1 ? {
                    line1: billingAddress.address1 || '',
                    line2: billingAddress.address2 || '',
                    city: billingAddress.locality || '',
                    region: billingAddress.administrativeArea || '',
                    postalCode: billingAddress.postalCode || '',
                    countryCode: billingAddress.countryCode || ''
                } : null
            };
        },

        /**
         * Submit payment (for standard flow - not used in express)
         */
        async submit(sessionId, data = {}) {
            return { success: false, error: 'Use express checkout buttons for wallet payments' };
        },

        /**
         * Tokenize (for testing - not applicable for express)
         */
        async tokenize() {
            return { success: false, error: 'Express checkout does not support tokenization', isButtonFlow: true };
        },

        /**
         * Clean up for a specific method
         */
        teardown(methodAlias) {
            if (methodAlias === 'googlepay' || methodAlias === 'worldpay-googlepay') {
                googlePayClient = null;
            }
            currentConfig = null;
        },

        /**
         * Clean up all instances
         */
        teardownAll() {
            googlePayClient = null;
            currentConfig = null;
        }
    };

    // Register the adapter for both standard and express
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
    window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};

    // Register for express checkout
    window.MerchelloExpressAdapters['worldpay'] = worldpayExpressAdapter;
    window.MerchelloExpressAdapters['worldpay:applepay'] = worldpayExpressAdapter;
    window.MerchelloExpressAdapters['worldpay:googlepay'] = worldpayExpressAdapter;

    console.debug('WorldPay express adapter registered');
})();
