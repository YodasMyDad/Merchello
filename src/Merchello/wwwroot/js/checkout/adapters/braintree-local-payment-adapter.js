/**
 * Braintree Local Payment Adapter
 *
 * Handles Braintree Local Payment Methods including:
 * - iDEAL (Netherlands)
 * - Bancontact (Belgium)
 * - EPS (Austria)
 * - P24/Przelewy24 (Poland)
 * - SEPA Direct Debit (EU)
 *
 * See: https://developer.paypal.com/braintree/docs/guides/local-payment-methods/client-side/javascript/v3/
 */
(function() {
    'use strict';

    // Store instances for cleanup
    let clientInstance = null;
    let localPaymentInstance = null;
    let dataCollectorInstance = null;
    let currentSession = null;
    let currentContainer = null;
    let currentCheckout = null;

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
     * Map method alias to Braintree payment type
     */
    function getPaymentType(methodAlias) {
        const typeMap = {
            'ideal': 'ideal',
            'bancontact': 'bancontact',
            'eps': 'eps',
            'p24': 'p24',
            'sepa': 'sepa'
        };
        return typeMap[methodAlias.toLowerCase()] || methodAlias;
    }

    /**
     * Get country code for payment type
     */
    function getCountryCode(methodAlias) {
        const countryMap = {
            'ideal': 'NL',
            'bancontact': 'BE',
            'eps': 'AT',
            'p24': 'PL',
            'sepa': 'DE' // Default for SEPA
        };
        return countryMap[methodAlias.toLowerCase()] || 'DE';
    }

    /**
     * Get currency for payment type
     */
    function getCurrency(methodAlias) {
        const currencyMap = {
            'ideal': 'EUR',
            'bancontact': 'EUR',
            'eps': 'EUR',
            'p24': 'PLN',
            'sepa': 'EUR'
        };
        return currencyMap[methodAlias.toLowerCase()] || 'EUR';
    }

    /**
     * Braintree Local Payment Adapter
     */
    const braintreeLocalPaymentAdapter = {
        /**
         * Render the local payment method
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} session - The payment session from the server
         * @param {Object} checkout - The MerchelloPayment instance
         */
        async render(container, session, checkout) {
            try {
                currentSession = session;
                currentContainer = container;
                currentCheckout = checkout;
                const config = session.sdkConfiguration || {};
                const methodAlias = session.methodAlias?.toLowerCase() || '';

                // Validate required config
                if (!session.clientToken) {
                    throw new Error('Braintree client token not provided');
                }

                // Load the Braintree Client SDK
                await loadScript(session.javaScriptSdkUrl);
                await waitForGlobal('braintree.client');

                // Load Local Payment SDK
                if (config.localPaymentSdkUrl) {
                    await loadScript(config.localPaymentSdkUrl);
                    await waitForGlobal('braintree.localPayment');
                }

                // Load Data Collector SDK for fraud protection
                if (config.dataCollectorSdkUrl) {
                    await loadScript(config.dataCollectorSdkUrl);
                    await waitForGlobal('braintree.dataCollector');
                }

                // Create Braintree client
                clientInstance = await braintree.client.create({
                    authorization: session.clientToken
                });

                // Create Local Payment instance
                localPaymentInstance = await braintree.localPayment.create({
                    client: clientInstance,
                    merchantAccountId: config.merchantAccountId
                });

                // Create Data Collector for fraud protection
                if (braintree.dataCollector) {
                    try {
                        dataCollectorInstance = await braintree.dataCollector.create({
                            client: clientInstance
                        });
                    } catch (e) {
                        console.warn('Data collector initialization failed:', e);
                    }
                }

                // Route to appropriate renderer based on method type
                if (methodAlias === 'sepa') {
                    await this.renderSepaForm(container, session, config);
                } else {
                    await this.renderLocalPaymentButton(container, session, config);
                }

                console.log(`Braintree Local Payment (${methodAlias}) initialized successfully`);
            } catch (error) {
                console.error('Failed to initialize Braintree Local Payment:', error);
                this.showError(container, error.message);
                throw error;
            }
        },

        /**
         * Render button for redirect-based local payments (iDEAL, Bancontact, EPS, P24)
         */
        async renderLocalPaymentButton(container, session, config) {
            const methodAlias = session.methodAlias?.toLowerCase() || '';
            const displayNames = {
                'ideal': 'iDEAL',
                'bancontact': 'Bancontact',
                'eps': 'eps',
                'p24': 'Przelewy24'
            };
            const displayName = displayNames[methodAlias] || methodAlias;

            // Create button UI
            container.innerHTML = `
                <div class="braintree-local-payment-wrapper">
                    <button type="button" class="braintree-local-payment-button" id="braintree-local-payment-btn">
                        <span class="braintree-local-payment-icon">${this.getMethodIcon(methodAlias)}</span>
                        <span>Pay with ${displayName}</span>
                    </button>
                    <p class="braintree-local-payment-info">
                        You will be redirected to complete your payment securely.
                    </p>
                    <div id="braintree-local-payment-error" class="braintree-error-message"></div>
                </div>
                <style>
                    .braintree-local-payment-wrapper {
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                        align-items: center;
                    }
                    .braintree-local-payment-button {
                        width: 100%;
                        max-width: 300px;
                        height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        background: #f3f4f6;
                        border: 1px solid #d1d5db;
                        border-radius: 0.375rem;
                        font-size: 1rem;
                        font-weight: 500;
                        color: #374151;
                        cursor: pointer;
                        transition: all 0.15s ease;
                    }
                    .braintree-local-payment-button:hover {
                        background: #e5e7eb;
                        border-color: #9ca3af;
                    }
                    .braintree-local-payment-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .braintree-local-payment-icon {
                        display: flex;
                        align-items: center;
                    }
                    .braintree-local-payment-info {
                        font-size: 0.75rem;
                        color: #6b7280;
                        text-align: center;
                        margin: 0;
                    }
                    .braintree-error-message {
                        color: #dc2626;
                        font-size: 0.875rem;
                        text-align: center;
                    }
                    .braintree-error-message:empty {
                        display: none;
                    }
                </style>
            `;

            const button = container.querySelector('#braintree-local-payment-btn');
            const errorContainer = container.querySelector('#braintree-local-payment-error');

            button.addEventListener('click', async () => {
                if (button.disabled) return;
                button.disabled = true;
                errorContainer.textContent = '';

                try {
                    await this.startLocalPayment(methodAlias, config);
                } catch (error) {
                    errorContainer.textContent = error.message || 'Payment failed. Please try again.';
                    button.disabled = false;
                }
            });
        },

        /**
         * Start the local payment flow
         */
        async startLocalPayment(methodAlias, config) {
            if (!localPaymentInstance) {
                throw new Error('Local payment not initialized');
            }

            const paymentType = getPaymentType(methodAlias);
            const countryCode = getCountryCode(methodAlias);
            const currency = getCurrency(methodAlias);

            // Get the return URLs
            const fallbackUrl = window.location.href;
            const returnUrl = config.returnUrl || fallbackUrl;
            const cancelUrl = config.cancelUrl || fallbackUrl;

            // Get customer info from checkout if available
            const email = currentCheckout?.customerEmail || config.email || '';
            const givenName = currentCheckout?.billingAddress?.firstName || config.givenName || '';
            const surname = currentCheckout?.billingAddress?.lastName || config.surname || '';
            const phone = currentCheckout?.billingAddress?.phone || config.phone || '';

            // Start the payment
            const paymentOptions = {
                paymentType: paymentType,
                amount: String(config.amount || '0'),
                currencyCode: currency,
                fallback: {
                    url: returnUrl,
                    buttonText: 'Complete Payment'
                },
                onPaymentStart: (data, start) => {
                    // Payment window is about to open
                    start();
                }
            };

            // Add optional fields if available
            if (email) paymentOptions.email = email;
            if (givenName) paymentOptions.givenName = givenName;
            if (surname) paymentOptions.surname = surname;
            if (phone) paymentOptions.phone = phone;
            if (countryCode) paymentOptions.countryCode = countryCode;

            // Add billing address if available
            if (currentCheckout?.billingAddress) {
                paymentOptions.address = {
                    streetAddress: currentCheckout.billingAddress.line1 || '',
                    extendedAddress: currentCheckout.billingAddress.line2 || '',
                    locality: currentCheckout.billingAddress.city || '',
                    region: currentCheckout.billingAddress.region || '',
                    postalCode: currentCheckout.billingAddress.postalCode || '',
                    countryCode: currentCheckout.billingAddress.countryCode || countryCode
                };
            }

            try {
                // This will open a popup or redirect
                const payload = await localPaymentInstance.startPayment(paymentOptions);

                // Payment was approved - submit to server
                await this.processPayment(payload);
            } catch (error) {
                if (error.code === 'LOCAL_PAYMENT_POPUP_CLOSED') {
                    // User closed the popup - not an error
                    return;
                }
                throw error;
            }
        },

        /**
         * Render SEPA Direct Debit form
         */
        async renderSepaForm(container, session, config) {
            container.innerHTML = `
                <div class="braintree-sepa-wrapper">
                    <div class="braintree-form-field">
                        <label for="braintree-iban" class="braintree-label">IBAN</label>
                        <input type="text" id="braintree-iban" class="braintree-input"
                               placeholder="DE89 3704 0044 0532 0130 00"
                               autocomplete="off" />
                    </div>
                    <div class="braintree-form-field">
                        <label for="braintree-account-holder" class="braintree-label">Account Holder Name</label>
                        <input type="text" id="braintree-account-holder" class="braintree-input"
                               placeholder="John Doe"
                               autocomplete="name" />
                    </div>
                    <div class="braintree-form-field braintree-mandate-field">
                        <label class="braintree-checkbox-label">
                            <input type="checkbox" id="braintree-mandate" class="braintree-checkbox" />
                            <span class="braintree-mandate-text">
                                I authorize the debit of the specified bank account for the payment of this purchase.
                            </span>
                        </label>
                    </div>
                    <div id="braintree-sepa-error" class="braintree-error-message"></div>
                </div>
                <style>
                    .braintree-sepa-wrapper {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }
                    .braintree-form-field {
                        display: flex;
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                    .braintree-label {
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                    }
                    .braintree-input {
                        height: 44px;
                        padding: 0 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 0.375rem;
                        font-size: 1rem;
                        background: white;
                        transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    }
                    .braintree-input:hover {
                        border-color: #9ca3af;
                    }
                    .braintree-input:focus {
                        outline: none;
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }
                    .braintree-mandate-field {
                        margin-top: 0.5rem;
                    }
                    .braintree-checkbox-label {
                        display: flex;
                        gap: 0.5rem;
                        cursor: pointer;
                    }
                    .braintree-checkbox {
                        width: 1rem;
                        height: 1rem;
                        margin-top: 0.125rem;
                        flex-shrink: 0;
                    }
                    .braintree-mandate-text {
                        font-size: 0.75rem;
                        color: #6b7280;
                        line-height: 1.4;
                    }
                    .braintree-error-message {
                        color: #dc2626;
                        font-size: 0.875rem;
                    }
                    .braintree-error-message:empty {
                        display: none;
                    }
                </style>
            `;

            // Format IBAN input
            const ibanInput = container.querySelector('#braintree-iban');
            ibanInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                // Add spaces every 4 characters
                value = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = value;
            });
        },

        /**
         * Submit SEPA payment (called from checkout)
         */
        async submit(invoiceId, options = {}) {
            const methodAlias = currentSession?.methodAlias?.toLowerCase();

            if (methodAlias === 'sepa') {
                return this.submitSepa(invoiceId, options);
            }

            // For redirect methods, the submit is handled by startLocalPayment
            return { success: false, error: 'Use the payment button to complete payment.' };
        },

        /**
         * Submit SEPA Direct Debit
         */
        async submitSepa(invoiceId, options = {}) {
            const errorContainer = currentContainer?.querySelector('#braintree-sepa-error');
            if (errorContainer) errorContainer.textContent = '';

            try {
                const ibanInput = currentContainer?.querySelector('#braintree-iban');
                const accountHolderInput = currentContainer?.querySelector('#braintree-account-holder');
                const mandateCheckbox = currentContainer?.querySelector('#braintree-mandate');

                const iban = ibanInput?.value?.replace(/\s/g, '') || '';
                const accountHolder = accountHolderInput?.value?.trim() || '';
                const mandateAccepted = mandateCheckbox?.checked || false;

                // Validate
                if (!iban) {
                    throw new Error('Please enter your IBAN.');
                }
                if (!this.validateIban(iban)) {
                    throw new Error('Please enter a valid IBAN.');
                }
                if (!accountHolder) {
                    throw new Error('Please enter the account holder name.');
                }
                if (!mandateAccepted) {
                    throw new Error('Please accept the mandate authorization.');
                }

                // For SEPA, we need to create a different flow
                // SEPA requires server-side processing with bank account details
                const response = await MerchelloPayment.fetchWithTimeout('/api/merchello/checkout/process-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        invoiceId: invoiceId,
                        providerAlias: currentSession?.providerAlias || 'braintree',
                        methodAlias: 'sepa',
                        formData: {
                            iban: iban,
                            accountHolder: accountHolder,
                            mandateAccepted: mandateAccepted,
                            deviceData: dataCollectorInstance?.deviceData || ''
                        }
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.errorMessage || 'Payment processing failed');
                }

                return result;
            } catch (error) {
                if (errorContainer) {
                    errorContainer.textContent = error.message;
                }
                return { success: false, error: error.message };
            }
        },

        /**
         * Validate IBAN format (basic validation)
         */
        validateIban(iban) {
            // Remove spaces and convert to uppercase
            const cleanIban = iban.replace(/\s/g, '').toUpperCase();
            // Basic length check (varies by country, typically 15-34)
            if (cleanIban.length < 15 || cleanIban.length > 34) {
                return false;
            }
            // Check format: 2 letters + 2 digits + alphanumeric
            return /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban);
        },

        /**
         * Process the payment after local payment approval
         */
        async processPayment(payload) {
            if (!currentCheckout) {
                throw new Error('Checkout not available');
            }

            currentCheckout.isProcessing = true;
            currentCheckout.error = null;

            try {
                const response = await fetch('/api/merchello/checkout/process-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        invoiceId: currentCheckout.invoiceId,
                        providerAlias: currentSession?.providerAlias || 'braintree',
                        methodAlias: currentSession?.methodAlias || 'ideal',
                        paymentMethodToken: payload.nonce,
                        formData: {
                            deviceData: dataCollectorInstance?.deviceData || '',
                            type: payload.type || '',
                            details: payload.details ? JSON.stringify(payload.details) : ''
                        }
                    })
                });

                // Handle error responses with user-friendly messages
                if (!response.ok) {
                    let errorMessage = 'Payment processing failed. Please try again.';
                    try {
                        const errorData = await response.json();
                        if (errorData.errors) {
                            console.error('Server validation errors:', Object.values(errorData.errors).flat());
                        }
                        if (errorData.errorMessage) {
                            errorMessage = errorData.errorMessage;
                        } else if (errorData.title) {
                            errorMessage = 'Payment could not be processed. Please try again or contact support.';
                        }
                    } catch {
                        // Could not parse error response
                    }
                    throw new Error(errorMessage);
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.errorMessage || 'Payment processing failed');
                }

                // Navigate to success page
                if (currentCheckout.onPaymentSuccess) {
                    currentCheckout.onPaymentSuccess(result);
                }

                return result;
            } catch (error) {
                currentCheckout.error = error.message;
                throw error;
            } finally {
                currentCheckout.isProcessing = false;
            }
        },

        /**
         * Get icon for payment method
         */
        getMethodIcon(methodAlias) {
            const icons = {
                'ideal': '<svg width="24" height="24" viewBox="0 0 40 20" fill="none"><rect width="40" height="20" rx="2" fill="#CC0066"/><text x="20" y="14" text-anchor="middle" fill="white" font-size="10" font-weight="bold">iDEAL</text></svg>',
                'bancontact': '<svg width="24" height="24" viewBox="0 0 40 20" fill="none"><rect width="40" height="20" rx="2" fill="#005498"/><text x="20" y="14" text-anchor="middle" fill="white" font-size="6" font-weight="bold">Bancontact</text></svg>',
                'eps': '<svg width="24" height="24" viewBox="0 0 40 20" fill="none"><rect width="40" height="20" rx="2" fill="#9E1B34"/><text x="20" y="14" text-anchor="middle" fill="white" font-size="10" font-weight="bold">eps</text></svg>',
                'p24': '<svg width="24" height="24" viewBox="0 0 40 20" fill="none"><rect width="40" height="20" rx="2" fill="#D13239"/><text x="20" y="14" text-anchor="middle" fill="white" font-size="10" font-weight="bold">P24</text></svg>',
                'sepa': '<svg width="24" height="24" viewBox="0 0 40 20" fill="none"><rect width="40" height="20" rx="2" fill="#2E4A7D"/><text x="20" y="14" text-anchor="middle" fill="white" font-size="10" font-weight="bold">SEPA</text></svg>'
            };
            return icons[methodAlias] || '';
        },

        /**
         * Clean up local payment instance
         */
        async teardown() {
            if (localPaymentInstance) {
                try {
                    // Local payment doesn't have a teardown method
                    localPaymentInstance = null;
                } catch (error) {
                    console.warn('Error cleaning up Local Payment:', error);
                }
            }

            if (dataCollectorInstance) {
                try {
                    await dataCollectorInstance.teardown();
                } catch (error) {
                    console.warn('Error tearing down Data Collector:', error);
                }
                dataCollectorInstance = null;
            }

            if (clientInstance) {
                try {
                    await clientInstance.teardown();
                } catch (error) {
                    console.warn('Error tearing down Braintree client:', error);
                }
                clientInstance = null;
            }

            currentSession = null;
            currentContainer = null;
            currentCheckout = null;
        },

        /**
         * Show error in container
         */
        showError(container, message) {
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

    // Register the adapter for Braintree local payment methods
    // The checkout system looks up adapters by provider:method pattern
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};

    // Register for each local payment method alias
    ['ideal', 'bancontact', 'eps', 'p24', 'sepa'].forEach(method => {
        window.MerchelloPaymentAdapters[`braintree:${method}`] = braintreeLocalPaymentAdapter;
    });

})();
