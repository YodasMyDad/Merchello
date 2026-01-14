/**
 * Braintree Payment Adapter
 *
 * Handles Braintree Hosted Fields for card payments with full CSS customization.
 * Uses individual field containers for card number, CVV, expiration date, and cardholder name.
 *
 * See: https://developer.paypal.com/braintree/docs/guides/hosted-fields/setup-and-integration
 */
(function() {
    'use strict';

    // Store Braintree instances
    let clientInstance = null;
    let hostedFieldsInstance = null;
    let dataCollectorInstance = null;
    let threeDSecureInstance = null;
    let currentSession = null;
    let currentContainer = null;

    // Default styles for Hosted Fields
    const defaultStyles = {
        'input': {
            'font-size': '16px',
            'font-family': 'system-ui, -apple-system, sans-serif',
            'color': '#1f2937',
            'line-height': '1.5'
        },
        'input:focus': {
            'color': '#111827'
        },
        '.valid': {
            'color': '#059669'
        },
        '.invalid': {
            'color': '#dc2626'
        },
        '::-webkit-input-placeholder': {
            'color': '#9ca3af'
        },
        '::placeholder': {
            'color': '#9ca3af'
        }
    };

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
     * Braintree Payment Adapter
     * Registered with window.MerchelloPaymentAdapters['braintree']
     */
    const braintreePaymentAdapter = {
        /**
         * Render the Braintree Hosted Fields
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

                // Load the Braintree Client SDK (main SDK URL from session.javaScriptSdkUrl)
                await loadScript(session.javaScriptSdkUrl);
                await waitForGlobal('braintree.client');

                // Load Hosted Fields SDK
                if (config.hostedFieldsSdkUrl) {
                    await loadScript(config.hostedFieldsSdkUrl);
                    await waitForGlobal('braintree.hostedFields');
                }

                // Load Data Collector SDK for fraud protection
                if (config.dataCollectorSdkUrl) {
                    await loadScript(config.dataCollectorSdkUrl);
                    await waitForGlobal('braintree.dataCollector');
                }

                // Load 3D Secure SDK if enabled
                if (config.threeDSecureEnabled && config.threeDSecureSdkUrl) {
                    await loadScript(config.threeDSecureSdkUrl);
                    await waitForGlobal('braintree.threeDSecure');
                }

                // Create container structure with Hosted Fields containers
                container.innerHTML = `
                    <div class="braintree-hosted-fields-wrapper">
                        <div class="braintree-form-field">
                            <label for="braintree-card-number" class="braintree-label">Card Number</label>
                            <div id="braintree-card-number" class="braintree-hosted-field"></div>
                            <div id="braintree-card-icon" class="braintree-card-icon"></div>
                        </div>
                        <div class="braintree-form-row">
                            <div class="braintree-form-field braintree-form-field--half">
                                <label for="braintree-expiration-date" class="braintree-label">Expiry Date</label>
                                <div id="braintree-expiration-date" class="braintree-hosted-field"></div>
                            </div>
                            <div class="braintree-form-field braintree-form-field--half">
                                <label for="braintree-cvv" class="braintree-label">CVV</label>
                                <div id="braintree-cvv" class="braintree-hosted-field"></div>
                            </div>
                        </div>
                        <div class="braintree-form-field">
                            <label for="braintree-cardholder-name" class="braintree-label">Name on Card</label>
                            <div id="braintree-cardholder-name" class="braintree-hosted-field"></div>
                        </div>
                        <div id="braintree-errors" class="braintree-error-message"></div>
                    </div>
                    <style>
                        .braintree-hosted-fields-wrapper {
                            display: flex;
                            flex-direction: column;
                            gap: 1rem;
                        }
                        .braintree-form-field {
                            display: flex;
                            flex-direction: column;
                            gap: 0.25rem;
                            position: relative;
                        }
                        .braintree-form-row {
                            display: flex;
                            gap: 1rem;
                        }
                        .braintree-form-field--half {
                            flex: 1;
                        }
                        .braintree-label {
                            font-size: 0.875rem;
                            font-weight: 500;
                            color: #374151;
                        }
                        .braintree-hosted-field {
                            height: 44px;
                            padding: 0 0.75rem;
                            border: 1px solid #d1d5db;
                            border-radius: 0.375rem;
                            background: white;
                            transition: border-color 0.15s ease, box-shadow 0.15s ease;
                        }
                        .braintree-hosted-field:hover {
                            border-color: #9ca3af;
                        }
                        .braintree-hosted-field.braintree-hosted-fields-focused {
                            border-color: #3b82f6;
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                            outline: none;
                        }
                        .braintree-hosted-field.braintree-hosted-fields-valid {
                            border-color: #10b981;
                        }
                        .braintree-hosted-field.braintree-hosted-fields-invalid {
                            border-color: #ef4444;
                        }
                        .braintree-card-icon {
                            position: absolute;
                            right: 0.75rem;
                            top: 50%;
                            transform: translateY(25%);
                            width: 32px;
                            height: 20px;
                            pointer-events: none;
                        }
                        .braintree-error-message {
                            color: #dc2626;
                            font-size: 0.875rem;
                            min-height: 1.25rem;
                        }
                        .braintree-error-message:empty {
                            display: none;
                        }
                    </style>
                `;

                // Get field containers
                const numberContainer = container.querySelector('#braintree-card-number');
                const expirationContainer = container.querySelector('#braintree-expiration-date');
                const cvvContainer = container.querySelector('#braintree-cvv');
                const cardholderContainer = container.querySelector('#braintree-cardholder-name');

                if (!numberContainer || !expirationContainer || !cvvContainer || !cardholderContainer) {
                    throw new Error('Hosted field containers not found');
                }

                // 1. Create Braintree client
                clientInstance = await braintree.client.create({
                    authorization: session.clientToken
                });

                // 2. Create Hosted Fields
                const fieldConfig = config.fields || {};
                hostedFieldsInstance = await braintree.hostedFields.create({
                    client: clientInstance,
                    styles: config.styles || defaultStyles,
                    fields: {
                        number: {
                            container: numberContainer,
                            placeholder: fieldConfig.number?.placeholder || '4111 1111 1111 1111'
                        },
                        expirationDate: {
                            container: expirationContainer,
                            placeholder: fieldConfig.expirationDate?.placeholder || 'MM/YY'
                        },
                        cvv: {
                            container: cvvContainer,
                            placeholder: fieldConfig.cvv?.placeholder || '123'
                        },
                        cardholderName: {
                            container: cardholderContainer,
                            placeholder: fieldConfig.cardholderName?.placeholder || 'Name on Card'
                        }
                    }
                });

                // 3. Create Data Collector for fraud protection
                if (braintree.dataCollector) {
                    try {
                        dataCollectorInstance = await braintree.dataCollector.create({
                            client: clientInstance,
                            paypal: false
                        });
                    } catch (e) {
                        console.warn('Data collector initialization failed:', e);
                    }
                }

                // 4. Create 3D Secure instance if enabled
                if (config.threeDSecureEnabled && braintree.threeDSecure) {
                    try {
                        threeDSecureInstance = await braintree.threeDSecure.create({
                            version: '2',
                            client: clientInstance
                        });
                    } catch (e) {
                        console.warn('3D Secure initialization failed:', e);
                    }
                }

                // 5. Set up event listeners
                const cardIconContainer = container.querySelector('#braintree-card-icon');
                const errorContainer = container.querySelector('#braintree-errors');

                hostedFieldsInstance.on('cardTypeChange', (event) => {
                    if (cardIconContainer && event.cards.length === 1) {
                        const card = event.cards[0];
                        cardIconContainer.innerHTML = this.getCardIcon(card.type);
                    } else if (cardIconContainer) {
                        cardIconContainer.innerHTML = '';
                    }
                });

                hostedFieldsInstance.on('validityChange', (event) => {
                    const field = event.fields[event.emittedBy];
                    if (field.isValid) {
                        if (errorContainer) errorContainer.textContent = '';
                    }
                });

                hostedFieldsInstance.on('focus', (event) => {
                    if (errorContainer) errorContainer.textContent = '';
                });

                console.log('Braintree Hosted Fields initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Braintree Hosted Fields:', error);
                this.showError(container, error.message);
                throw error;
            }
        },

        /**
         * Get SVG icon for card type
         * @param {string} cardType - The card type (visa, mastercard, etc.)
         * @returns {string} SVG HTML
         */
        getCardIcon(cardType) {
            const icons = {
                'visa': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#1434CB"/><path d="M12.5 13.5L13.8 6.5H15.7L14.4 13.5H12.5ZM19.6 6.7C19.2 6.5 18.6 6.4 17.8 6.4C15.9 6.4 14.6 7.4 14.6 8.7C14.6 9.7 15.5 10.3 16.2 10.6C16.9 10.9 17.2 11.2 17.2 11.5C17.2 12 16.6 12.2 16 12.2C15.2 12.2 14.8 12.1 14.1 11.8L13.8 11.7L13.5 13.3C14 13.5 14.8 13.7 15.7 13.7C17.7 13.7 19 12.7 19 11.3C19 10.5 18.5 9.9 17.4 9.4C16.8 9.1 16.4 8.9 16.4 8.5C16.4 8.2 16.7 7.9 17.4 7.9C18 7.9 18.5 8 18.8 8.2L19 8.3L19.6 6.7ZM23.4 6.5H22C21.5 6.5 21.1 6.6 20.9 7.2L18.1 13.5H20.1L20.5 12.3H22.9L23.2 13.5H25L23.4 6.5ZM21 10.8L21.9 8.3L22.5 10.8H21ZM11.4 6.5L9.5 11.3L9.3 10.3C8.9 9.1 7.8 7.8 6.6 7.1L8.3 13.5H10.4L13.5 6.5H11.4Z" fill="white"/><path d="M8.2 6.5H5L5 6.6C7.5 7.2 9.2 8.7 9.8 10.3L9.1 7.2C9 6.7 8.6 6.5 8.2 6.5Z" fill="#F9A533"/></svg>',
                'master-card': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#000"/><circle cx="12" cy="10" r="6" fill="#EB001B"/><circle cx="20" cy="10" r="6" fill="#F79E1B"/><path d="M16 5.3A6 6 0 0 0 14 10a6 6 0 0 0 2 4.7 6 6 0 0 0 2-4.7 6 6 0 0 0-2-4.7z" fill="#FF5F00"/></svg>',
                'american-express': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#006FCF"/><path d="M5 13.5V6.5H8.5L9.5 8.5L10.5 6.5H14V13.5H11.5V9L10 12H9L7.5 9V13.5H5ZM15 13.5V6.5H21V8H17V9.5H20.5V11H17V12H21V13.5H15ZM22 13.5L25 10L22 6.5H25L26.5 8.5L28 6.5H31L28 10L31 13.5H28L26.5 11.5L25 13.5H22Z" fill="white"/></svg>',
                'discover': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#fff"/><path d="M0 0h32v10H0z" fill="#4D4D4D"/><ellipse cx="20" cy="10" rx="8" ry="6" fill="#F47216"/></svg>',
                'jcb': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#fff"/><rect x="4" y="3" width="8" height="14" rx="2" fill="#0E4C96"/><rect x="12" y="3" width="8" height="14" rx="2" fill="#E41D2D"/><rect x="20" y="3" width="8" height="14" rx="2" fill="#007940"/></svg>'
            };
            return icons[cardType] || '';
        },

        /**
         * Get payment method token/nonce without submitting
         * Used for test mode to get the nonce separately
         * @returns {Promise<Object>} Payment method payload with nonce
         */
        async tokenize() {
            if (!hostedFieldsInstance) {
                return { success: false, error: 'Braintree not initialized. Call render() first.' };
            }

            // Clear any previous errors
            const errorContainer = currentContainer?.querySelector('#braintree-errors');
            if (errorContainer) {
                errorContainer.textContent = '';
            }

            try {
                // Validate all fields are complete
                const state = hostedFieldsInstance.getState();
                const invalidFields = Object.keys(state.fields).filter(
                    key => !state.fields[key].isValid
                );

                if (invalidFields.length > 0) {
                    const fieldNames = invalidFields.map(f => {
                        const names = {
                            number: 'Card Number',
                            expirationDate: 'Expiry Date',
                            cvv: 'CVV',
                            cardholderName: 'Name on Card'
                        };
                        return names[f] || f;
                    });
                    throw new Error(`Please complete: ${fieldNames.join(', ')}`);
                }

                // Tokenize the card
                const payload = await hostedFieldsInstance.tokenize();

                return {
                    success: true,
                    nonce: payload.nonce,
                    type: payload.type || 'CreditCard',
                    details: payload.details,
                    bin: payload.details?.bin,
                    deviceData: dataCollectorInstance?.deviceData || ''
                };
            } catch (error) {
                let errorMessage = error.message;
                if (error.code === 'HOSTED_FIELDS_FIELDS_EMPTY') {
                    errorMessage = 'Please enter your card details.';
                } else if (error.code === 'HOSTED_FIELDS_FIELDS_INVALID') {
                    errorMessage = 'Please check your card details and try again.';
                }

                if (errorContainer) {
                    errorContainer.textContent = errorMessage;
                }

                return {
                    success: false,
                    error: errorMessage
                };
            }
        },

        /**
         * Tokenize the card with optional 3DS verification
         * Used by test modal to get a 3DS-verified nonce without submitting
         * @param {Object} options - Verification options (email, billingAddress, etc.)
         * @returns {Promise<Object>} Payment method payload with verified nonce
         */
        async tokenizeWithVerification(options = {}) {
            // 1. Tokenize the card
            const tokenizeResult = await this.tokenize();
            if (!tokenizeResult.success) {
                return tokenizeResult;
            }

            let nonce = tokenizeResult.nonce;

            // 2. Run 3D Secure verification if enabled
            if (threeDSecureInstance && currentSession?.sdkConfiguration?.threeDSecureEnabled) {
                const config = currentSession.sdkConfiguration;
                try {
                    // Build 3DS verification request
                    const threeDSecureRequest = {
                        nonce: tokenizeResult.nonce,
                        bin: tokenizeResult.bin,
                        amount: String(config.amount || '0'),
                        email: options.email || '',
                        billingAddress: options.billingAddress ? {
                            givenName: options.billingAddress.firstName || '',
                            surname: options.billingAddress.lastName || '',
                            phoneNumber: options.billingAddress.phone || '',
                            streetAddress: options.billingAddress.line1 || '',
                            extendedAddress: options.billingAddress.line2 || '',
                            locality: options.billingAddress.city || '',
                            region: options.billingAddress.region || '',
                            postalCode: options.billingAddress.postalCode || '',
                            countryCodeAlpha2: options.billingAddress.countryCode || ''
                        } : undefined,
                        additionalInformation: {
                            shippingMethod: options.shippingMethod || '03',
                            productCode: options.productCode || 'PHY'
                        },
                        onLookupComplete: (data, next) => {
                            // Continue with 3D Secure verification
                            next();
                        }
                    };

                    // Add shipping address if available
                    if (options.shippingAddress) {
                        threeDSecureRequest.shippingAddress = {
                            givenName: options.shippingAddress.firstName || '',
                            surname: options.shippingAddress.lastName || '',
                            phoneNumber: options.shippingAddress.phone || '',
                            streetAddress: options.shippingAddress.line1 || '',
                            extendedAddress: options.shippingAddress.line2 || '',
                            locality: options.shippingAddress.city || '',
                            region: options.shippingAddress.region || '',
                            postalCode: options.shippingAddress.postalCode || '',
                            countryCodeAlpha2: options.shippingAddress.countryCode || ''
                        };
                    }

                    const threeDSecureResult = await threeDSecureInstance.verifyCard(threeDSecureRequest);

                    // Validate 3DS result before using
                    if (!threeDSecureResult || !threeDSecureResult.nonce) {
                        throw new Error('3D Secure verification failed: No payment nonce returned');
                    }

                    // Use the 3D Secure nonce
                    nonce = threeDSecureResult.nonce;

                    // Check liability shift
                    if (!threeDSecureResult.liabilityShifted && threeDSecureResult.liabilityShiftPossible) {
                        console.warn('3D Secure: liability did not shift');
                    }
                } catch (threeDSecureError) {
                    console.error('3D Secure verification failed:', threeDSecureError);

                    // Check if this is a user cancellation
                    if (threeDSecureError.code === 'THREEDS_CARDINAL_SDK_CANCELED') {
                        return { success: false, error: 'Payment cancelled. Please try again.' };
                    }

                    // For other 3DS errors, return failure
                    return { success: false, error: threeDSecureError.message || '3D Secure verification failed. Please try again.' };
                }
            }

            return {
                ...tokenizeResult,
                nonce
            };
        },

        /**
         * Submit the payment
         * @param {string} invoiceId - The invoice ID being paid
         * @param {Object} options - Additional options
         * @returns {Promise<Object>} Payment result
         */
        async submit(invoiceId, options = {}) {
            if (!hostedFieldsInstance) {
                return { success: false, error: 'Braintree not initialized. Call render() first.' };
            }

            // Clear any previous errors
            const errorContainer = currentContainer?.querySelector('#braintree-errors');
            if (errorContainer) {
                errorContainer.textContent = '';
            }

            try {
                // 1. Tokenize the card
                const tokenizeResult = await this.tokenize();
                if (!tokenizeResult.success) {
                    throw new Error(tokenizeResult.error);
                }

                let nonce = tokenizeResult.nonce;

                // 2. Run 3D Secure verification if enabled
                if (threeDSecureInstance && currentSession?.sdkConfiguration?.threeDSecureEnabled) {
                    const config = currentSession.sdkConfiguration;
                    try {
                        // Build 3DS verification request with enhanced data for better auth rates
                        const threeDSecureRequest = {
                            nonce: tokenizeResult.nonce,
                            bin: tokenizeResult.bin,
                            amount: String(config.amount || '0'),
                            email: options.email || '',
                            billingAddress: options.billingAddress ? {
                                givenName: options.billingAddress.firstName || '',
                                surname: options.billingAddress.lastName || '',
                                phoneNumber: options.billingAddress.phone || '',
                                streetAddress: options.billingAddress.line1 || '',
                                extendedAddress: options.billingAddress.line2 || '',
                                locality: options.billingAddress.city || '',
                                region: options.billingAddress.region || '',
                                postalCode: options.billingAddress.postalCode || '',
                                countryCodeAlpha2: options.billingAddress.countryCode || ''
                            } : undefined,
                            // Additional 3DS 2.0 data for improved authorization rates
                            additionalInformation: {
                                // Shipping method indicator (best practice)
                                // 01 = Ship to cardholder's billing address
                                // 02 = Ship to another verified address
                                // 03 = Ship to address different than billing
                                // 04 = Ship to store/pickup
                                // 05 = Digital goods
                                // 06 = Travel and event tickets
                                // 07 = Other
                                shippingMethod: options.shippingMethod || '03',
                                // Product code (best practice)
                                // PHY = Physical goods
                                // DIG = Digital goods
                                // SVC = Service
                                productCode: options.productCode || 'PHY'
                            },
                            onLookupComplete: (data, next) => {
                                // Continue with 3D Secure verification
                                next();
                            }
                        };

                        // Add shipping address if available (improves auth rates)
                        if (options.shippingAddress) {
                            threeDSecureRequest.shippingAddress = {
                                givenName: options.shippingAddress.firstName || '',
                                surname: options.shippingAddress.lastName || '',
                                phoneNumber: options.shippingAddress.phone || '',
                                streetAddress: options.shippingAddress.line1 || '',
                                extendedAddress: options.shippingAddress.line2 || '',
                                locality: options.shippingAddress.city || '',
                                region: options.shippingAddress.region || '',
                                postalCode: options.shippingAddress.postalCode || '',
                                countryCodeAlpha2: options.shippingAddress.countryCode || ''
                            };
                        }

                        const threeDSecureResult = await threeDSecureInstance.verifyCard(threeDSecureRequest);

                        // Validate 3DS result before using
                        if (!threeDSecureResult || !threeDSecureResult.nonce) {
                            throw new Error('3D Secure verification failed: No payment nonce returned');
                        }

                        // Use the 3D Secure nonce
                        nonce = threeDSecureResult.nonce;

                        // Check liability shift
                        if (!threeDSecureResult.liabilityShifted && threeDSecureResult.liabilityShiftPossible) {
                            console.warn('3D Secure: liability did not shift');
                        }
                    } catch (threeDSecureError) {
                        console.error('3D Secure verification failed:', threeDSecureError);

                        // Check if this is a user cancellation
                        if (threeDSecureError.code === 'THREEDS_CARDINAL_SDK_CANCELED') {
                            throw new Error('Payment cancelled. Please try again.');
                        }

                        // For other 3DS errors, don't silently continue - the nonce may be rejected
                        throw new Error(threeDSecureError.message || '3D Secure verification failed. Please try again.');
                    }
                }

                // Validate nonce before submission
                if (!nonce) {
                    throw new Error('Payment token missing. Please try again.');
                }

                // 3. Submit to server for processing
                const response = await fetch('/api/merchello/checkout/process-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        invoiceId: invoiceId,
                        providerAlias: currentSession?.providerAlias || 'braintree',
                        methodAlias: currentSession?.methodAlias || 'cards',
                        paymentMethodToken: nonce,
                        formData: {
                            deviceData: dataCollectorInstance?.deviceData || '',
                            type: tokenizeResult.type || '',
                            details: tokenizeResult.details ? JSON.stringify(tokenizeResult.details) : ''
                        }
                    })
                });

                // Handle error responses with user-friendly messages
                if (!response.ok) {
                    let errorMessage = 'Payment processing failed. Please try again.';
                    try {
                        const errorData = await response.json();
                        // Check for validation errors from ASP.NET
                        if (errorData.errors) {
                            const errorMessages = Object.values(errorData.errors).flat();
                            if (errorMessages.length > 0) {
                                console.error('Server validation errors:', errorMessages);
                            }
                        }
                        // Use server error message if available
                        if (errorData.errorMessage) {
                            errorMessage = errorData.errorMessage;
                        } else if (errorData.title) {
                            errorMessage = 'Payment could not be processed. Please try again or contact support.';
                        }
                    } catch {
                        // Could not parse error response, use default message
                    }
                    throw new Error(errorMessage);
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.errorMessage || 'Payment processing failed');
                }

                return result;
            } catch (error) {
                console.error('Braintree payment submission error:', error);

                if (errorContainer) {
                    errorContainer.textContent = error.message;
                }

                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * Clean up Braintree Hosted Fields
         */
        async teardown() {
            if (hostedFieldsInstance) {
                try {
                    await hostedFieldsInstance.teardown();
                } catch (error) {
                    console.warn('Error tearing down Braintree Hosted Fields:', error);
                }
                hostedFieldsInstance = null;
            }

            if (dataCollectorInstance) {
                try {
                    await dataCollectorInstance.teardown();
                } catch (error) {
                    console.warn('Error tearing down Braintree Data Collector:', error);
                }
                dataCollectorInstance = null;
            }

            if (threeDSecureInstance) {
                try {
                    await threeDSecureInstance.teardown();
                } catch (error) {
                    console.warn('Error tearing down Braintree 3D Secure:', error);
                }
                threeDSecureInstance = null;
            }

            clientInstance = null;
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
