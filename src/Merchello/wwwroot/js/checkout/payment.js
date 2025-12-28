/**
 * Merchello Checkout Payment Module
 * Handles payment method selection and processing for different integration types.
 */

const MerchelloPayment = {
    // Integration type constants matching PaymentIntegrationType enum
    IntegrationType: {
        Redirect: 0,
        HostedFields: 10,
        Widget: 20,
        DirectForm: 30
    },

    // Store for loaded SDK instances
    loadedSdks: {},

    // Store for current payment session
    currentSession: null,

    /**
     * Fetches available payment methods from the API
     * @returns {Promise<Array>} Array of payment methods
     */
    async getPaymentMethods() {
        try {
            const response = await fetch('/api/merchello/checkout/payment-methods');
            if (!response.ok) {
                throw new Error(`Failed to fetch payment methods: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            throw error;
        }
    },

    /**
     * Groups payment methods by provider for display
     * @param {Array} methods - Array of payment methods
     * @returns {Object} Methods grouped by provider alias
     */
    groupMethodsByProvider(methods) {
        return methods.reduce((groups, method) => {
            const key = method.providerAlias;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(method);
            return groups;
        }, {});
    },

    /**
     * Initiates payment for the current basket
     * @param {string} providerAlias - The payment provider alias
     * @param {string} methodAlias - The payment method alias (optional)
     * @param {string} returnUrl - URL to redirect to after payment
     * @param {string} cancelUrl - URL to redirect to if payment is cancelled
     * @returns {Promise<Object>} Payment session result
     */
    async initiatePayment(providerAlias, methodAlias, returnUrl, cancelUrl) {
        try {
            const response = await fetch('/api/merchello/checkout/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    providerAlias,
                    methodAlias,
                    returnUrl,
                    cancelUrl
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.errorMessage || 'Payment initiation failed');
            }

            this.currentSession = result;
            return result;
        } catch (error) {
            console.error('Error initiating payment:', error);
            throw error;
        }
    },

    /**
     * Handles the payment flow based on integration type
     * @param {Object} session - Payment session result from initiatePayment
     * @param {Object} options - Additional options for handling
     * @returns {Promise<void>}
     */
    async handlePaymentFlow(session, options = {}) {
        switch (session.integrationType) {
            case this.IntegrationType.Redirect:
                await this.handleRedirectFlow(session);
                break;

            case this.IntegrationType.HostedFields:
                await this.handleHostedFieldsFlow(session, options);
                break;

            case this.IntegrationType.Widget:
                await this.handleWidgetFlow(session, options);
                break;

            case this.IntegrationType.DirectForm:
                await this.handleDirectFormFlow(session, options);
                break;

            default:
                throw new Error(`Unknown integration type: ${session.integrationType}`);
        }
    },

    /**
     * Handles redirect flow - redirects to external payment page
     * @param {Object} session - Payment session
     */
    async handleRedirectFlow(session) {
        if (!session.redirectUrl) {
            throw new Error('No redirect URL provided');
        }
        window.location.href = session.redirectUrl;
    },

    /**
     * Handles hosted fields flow - loads SDK and renders inline card fields
     * @param {Object} session - Payment session
     * @param {Object} options - Options including container element ID
     */
    async handleHostedFieldsFlow(session, options) {
        const { containerId = 'hosted-fields-container', onReady, onError } = options;

        try {
            // Load the provider's SDK
            if (session.javaScriptSdkUrl) {
                await this.loadSdk(session.javaScriptSdkUrl);
            }

            // Get the container element
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container element '${containerId}' not found`);
            }

            // Show the container
            container.style.display = 'block';

            // Initialize hosted fields based on SDK configuration
            if (session.sdkConfiguration) {
                await this.initializeHostedFields(session, container);
            }

            if (onReady) {
                onReady(session);
            }
        } catch (error) {
            console.error('Error setting up hosted fields:', error);
            if (onError) {
                onError(error);
            }
            throw error;
        }
    },

    /**
     * Handles widget flow - loads SDK and renders provider widget
     * @param {Object} session - Payment session
     * @param {Object} options - Options including container element ID
     */
    async handleWidgetFlow(session, options) {
        const { containerId = 'widget-container', onReady, onError } = options;

        try {
            // Load the provider's SDK
            if (session.javaScriptSdkUrl) {
                await this.loadSdk(session.javaScriptSdkUrl);
            }

            // Get the container element
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container element '${containerId}' not found`);
            }

            // Show the container
            container.style.display = 'block';

            // Initialize widget based on SDK configuration
            if (session.sdkConfiguration) {
                await this.initializeWidget(session, container);
            }

            if (onReady) {
                onReady(session);
            }
        } catch (error) {
            console.error('Error setting up widget:', error);
            if (onError) {
                onError(error);
            }
            throw error;
        }
    },

    /**
     * Handles direct form flow - renders form fields and handles submission
     * @param {Object} session - Payment session
     * @param {Object} options - Options including container element ID
     */
    async handleDirectFormFlow(session, options) {
        const { containerId = 'direct-form-container', onReady, onSubmit, onError } = options;

        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container element '${containerId}' not found`);
            }

            // Show the container
            container.style.display = 'block';

            // Render form fields
            if (session.formFields && session.formFields.length > 0) {
                container.innerHTML = this.renderFormFields(session.formFields);
            }

            if (onReady) {
                onReady(session);
            }
        } catch (error) {
            console.error('Error setting up direct form:', error);
            if (onError) {
                onError(error);
            }
            throw error;
        }
    },

    /**
     * Loads a JavaScript SDK dynamically
     * @param {string} url - URL of the SDK to load
     * @returns {Promise<void>}
     */
    loadSdk(url) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (this.loadedSdks[url]) {
                resolve();
                return;
            }

            // Check if script tag already exists
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                this.loadedSdks[url] = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            script.onload = () => {
                this.loadedSdks[url] = true;
                resolve();
            };

            script.onerror = () => {
                reject(new Error(`Failed to load SDK: ${url}`));
            };

            document.head.appendChild(script);
        });
    },

    /**
     * Initializes hosted fields based on the provider SDK
     * @param {Object} session - Payment session
     * @param {HTMLElement} container - Container element
     */
    async initializeHostedFields(session, container) {
        const config = session.sdkConfiguration;

        // Provider-specific initialization
        // This will be extended for each provider (Stripe Elements, Braintree, etc.)
        if (config.provider === 'stripe') {
            await this.initializeStripeElements(session, container);
        } else if (config.provider === 'braintree') {
            await this.initializeBraintreeHostedFields(session, container);
        }
        // Add more providers as needed
    },

    /**
     * Initializes Stripe Elements for card payment
     * @param {Object} session - Payment session
     * @param {HTMLElement} container - Container element
     */
    async initializeStripeElements(session, container) {
        // This will be implemented when Stripe Elements is added
        // For now, show a placeholder
        container.innerHTML = `
            <div class="stripe-elements-container">
                <div id="card-element" class="p-4 border border-gray-300 rounded-lg"></div>
                <div id="card-errors" class="text-red-600 text-sm mt-2"></div>
            </div>
        `;
    },

    /**
     * Initializes Braintree Drop-in UI for card payments
     * @param {Object} session - Payment session containing clientToken and sdkConfiguration
     * @param {HTMLElement} container - Container element for the Drop-in UI
     */
    async initializeBraintreeHostedFields(session, container) {
        const config = session.sdkConfiguration || {};

        // Create container structure for Drop-in UI
        container.innerHTML = `
            <div class="braintree-dropin-wrapper">
                <div id="dropin-container"></div>
                <div id="dropin-errors" class="text-red-600 text-sm mt-2 hidden"></div>
            </div>
        `;

        try {
            // Wait for Braintree Drop-in SDK to be available
            if (typeof braintree === 'undefined' || typeof braintree.dropin === 'undefined') {
                throw new Error('Braintree Drop-in SDK not loaded. Ensure the SDK script is included.');
            }

            // Initialize Braintree Drop-in with client token
            const dropinOptions = {
                authorization: session.clientToken,
                container: '#dropin-container',
                card: config.dropIn?.card || {
                    vault: {
                        vaultCard: false
                    }
                }
            };

            // Create the Drop-in instance
            const dropinInstance = await braintree.dropin.create(dropinOptions);

            // Store instance for later use during payment submission
            this.braintreeDropin = dropinInstance;
            this.braintreeSession = session;

            console.log('Braintree Drop-in initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Braintree Drop-in:', error);
            const errorContainer = document.getElementById('dropin-errors');
            if (errorContainer) {
                errorContainer.textContent = 'Failed to load payment form. Please refresh and try again.';
                errorContainer.classList.remove('hidden');
            }
            throw error;
        }
    },

    /**
     * Requests a payment method nonce from Braintree Drop-in
     * Call this when the user submits the payment form
     * @returns {Promise<{nonce: string, deviceData?: string}>} Payment nonce and optional device data
     */
    async getBraintreePaymentNonce() {
        if (!this.braintreeDropin) {
            throw new Error('Braintree Drop-in not initialized. Call initializeBraintreeHostedFields first.');
        }

        try {
            const payload = await this.braintreeDropin.requestPaymentMethod();
            return {
                nonce: payload.nonce,
                deviceData: payload.deviceData,
                type: payload.type, // 'CreditCard', 'PayPalAccount', etc.
                details: payload.details // Card last four, card type, etc.
            };
        } catch (error) {
            // User may have cancelled or validation failed
            if (error.message === 'No payment method is available.') {
                throw new Error('Please enter your payment details.');
            }
            throw error;
        }
    },

    /**
     * Submits a Braintree payment to the server for processing
     * @param {Guid} invoiceId - The invoice ID to pay
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Payment result
     */
    async submitBraintreePayment(invoiceId, options = {}) {
        // Get the payment nonce from Drop-in
        const paymentData = await this.getBraintreePaymentNonce();

        // Submit to server for processing
        const response = await fetch('/api/merchello/checkout/process-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invoiceId: invoiceId,
                providerAlias: 'braintree',
                methodAlias: 'cards',
                paymentMethodToken: paymentData.nonce,
                formData: {
                    deviceData: paymentData.deviceData || ''
                }
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.errorMessage || 'Payment processing failed');
        }

        return result;
    },

    /**
     * Tears down the Braintree Drop-in instance
     * Call this when navigating away or reinitializing
     */
    async teardownBraintree() {
        if (this.braintreeDropin) {
            try {
                await this.braintreeDropin.teardown();
            } catch (error) {
                console.warn('Error tearing down Braintree Drop-in:', error);
            }
            this.braintreeDropin = null;
            this.braintreeSession = null;
        }
    },

    /**
     * Initializes a provider widget
     * @param {Object} session - Payment session
     * @param {HTMLElement} container - Container element
     */
    async initializeWidget(session, container) {
        const config = session.sdkConfiguration;

        // Provider-specific widget initialization
        if (config.provider === 'paypal') {
            await this.initializePayPalWidget(session, container);
        } else if (config.provider === 'applepay') {
            await this.initializeApplePayWidget(session, container);
        } else if (config.provider === 'googlepay') {
            await this.initializeGooglePayWidget(session, container);
        }
    },

    /**
     * Initializes PayPal widget
     * @param {Object} session - Payment session
     * @param {HTMLElement} container - Container element
     */
    async initializePayPalWidget(session, container) {
        container.innerHTML = `
            <div id="paypal-button-container"></div>
        `;
        // PayPal SDK initialization would go here
    },

    /**
     * Initializes Apple Pay widget
     * @param {Object} session - Payment session
     * @param {HTMLElement} container - Container element
     */
    async initializeApplePayWidget(session, container) {
        // Check if Apple Pay is available
        if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
            container.innerHTML = `
                <button type="button" id="apple-pay-button" class="apple-pay-button apple-pay-button-black"></button>
            `;
        } else {
            container.innerHTML = `
                <p class="text-gray-500 text-sm">Apple Pay is not available on this device.</p>
            `;
        }
    },

    /**
     * Initializes Google Pay widget
     * @param {Object} session - Payment session
     * @param {HTMLElement} container - Container element
     */
    async initializeGooglePayWidget(session, container) {
        container.innerHTML = `
            <div id="google-pay-button-container"></div>
        `;
        // Google Pay SDK initialization would go here
    },

    /**
     * Renders form fields for DirectForm integration type
     * @param {Array} fields - Array of form field definitions
     * @returns {string} HTML string for the form fields
     */
    renderFormFields(fields) {
        return fields.map(field => {
            const isRequired = field.isRequired ? 'required' : '';
            const requiredAsterisk = field.isRequired ? '<span class="text-red-500">*</span>' : '';

            switch (field.fieldType.toLowerCase()) {
                case 'text':
                case 'email':
                case 'phone':
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${field.key}">
                                ${field.label} ${requiredAsterisk}
                            </label>
                            <input type="${field.fieldType.toLowerCase()}"
                                   id="${field.key}"
                                   name="${field.key}"
                                   value="${field.defaultValue || ''}"
                                   placeholder="${field.placeholder || ''}"
                                   ${field.validationPattern ? `pattern="${field.validationPattern}"` : ''}
                                   ${isRequired}
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                            ${field.description ? `<p class="text-sm text-gray-500 mt-1">${field.description}</p>` : ''}
                        </div>
                    `;

                case 'textarea':
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${field.key}">
                                ${field.label} ${requiredAsterisk}
                            </label>
                            <textarea id="${field.key}"
                                      name="${field.key}"
                                      placeholder="${field.placeholder || ''}"
                                      ${isRequired}
                                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                      rows="3">${field.defaultValue || ''}</textarea>
                            ${field.description ? `<p class="text-sm text-gray-500 mt-1">${field.description}</p>` : ''}
                        </div>
                    `;

                case 'select':
                    const options = (field.options || [])
                        .map(opt => `<option value="${opt.value}" ${opt.value === field.defaultValue ? 'selected' : ''}>${opt.label}</option>`)
                        .join('');
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${field.key}">
                                ${field.label} ${requiredAsterisk}
                            </label>
                            <select id="${field.key}"
                                    name="${field.key}"
                                    ${isRequired}
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent">
                                <option value="">-- Select --</option>
                                ${options}
                            </select>
                            ${field.description ? `<p class="text-sm text-gray-500 mt-1">${field.description}</p>` : ''}
                        </div>
                    `;

                case 'date':
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${field.key}">
                                ${field.label} ${requiredAsterisk}
                            </label>
                            <input type="date"
                                   id="${field.key}"
                                   name="${field.key}"
                                   value="${field.defaultValue || ''}"
                                   ${isRequired}
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                            ${field.description ? `<p class="text-sm text-gray-500 mt-1">${field.description}</p>` : ''}
                        </div>
                    `;

                default:
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${field.key}">
                                ${field.label} ${requiredAsterisk}
                            </label>
                            <input type="text"
                                   id="${field.key}"
                                   name="${field.key}"
                                   value="${field.defaultValue || ''}"
                                   placeholder="${field.placeholder || ''}"
                                   ${isRequired}
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                            ${field.description ? `<p class="text-sm text-gray-500 mt-1">${field.description}</p>` : ''}
                        </div>
                    `;
            }
        }).join('');
    },

    /**
     * Collects form data from DirectForm fields
     * @param {Array} fields - Array of form field definitions
     * @returns {Object} Form data as key-value pairs
     */
    collectFormData(fields) {
        const data = {};
        fields.forEach(field => {
            const element = document.getElementById(field.key);
            if (element) {
                data[field.key] = element.value;
            }
        });
        return data;
    },

    /**
     * Validates form data against field definitions
     * @param {Array} fields - Array of form field definitions
     * @returns {Object} Validation result with isValid and errors
     */
    validateFormData(fields) {
        const errors = {};
        let isValid = true;

        fields.forEach(field => {
            const element = document.getElementById(field.key);
            if (!element) return;

            const value = element.value.trim();

            // Required check
            if (field.isRequired && !value) {
                errors[field.key] = field.validationMessage || `${field.label} is required`;
                isValid = false;
            }

            // Pattern check
            if (value && field.validationPattern) {
                const regex = new RegExp(field.validationPattern);
                if (!regex.test(value)) {
                    errors[field.key] = field.validationMessage || `${field.label} is invalid`;
                    isValid = false;
                }
            }
        });

        return { isValid, errors };
    },

    /**
     * Displays validation errors on the form
     * @param {Object} errors - Object with field keys and error messages
     */
    displayErrors(errors) {
        // Clear existing errors
        document.querySelectorAll('.field-error').forEach(el => el.remove());

        // Add new errors
        Object.keys(errors).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.classList.add('border-red-500');
                const errorDiv = document.createElement('p');
                errorDiv.className = 'field-error text-sm text-red-600 mt-1';
                errorDiv.textContent = errors[key];
                element.parentNode.appendChild(errorDiv);
            }
        });
    },

    /**
     * Clears all validation errors from the form
     */
    clearErrors() {
        document.querySelectorAll('.field-error').forEach(el => el.remove());
        document.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500');
        });
    },

    /**
     * Gets the payment icon for a method
     * @param {Object} method - Payment method object
     * @returns {string} HTML for the payment icon
     */
    getMethodIcon(method) {
        // Common payment method icons (using placeholder divs for now)
        const icons = {
            'cards': `<div class="flex gap-1">
                <div class="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">VISA</div>
                <div class="w-8 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center">MC</div>
            </div>`,
            'paypal': `<div class="w-12 h-5 bg-blue-800 rounded text-white text-xs flex items-center justify-center">PayPal</div>`,
            'applepay': `<div class="w-10 h-5 bg-black rounded text-white text-xs flex items-center justify-center">Pay</div>`,
            'googlepay': `<div class="w-10 h-5 bg-white border rounded text-xs flex items-center justify-center">G Pay</div>`
        };

        if (method.icon) {
            // If icon is a URL, return an img tag
            if (method.icon.startsWith('http') || method.icon.startsWith('/')) {
                return `<img src="${method.icon}" alt="${method.displayName}" class="h-6 w-auto" />`;
            }
            // If icon is a key, look it up
            if (icons[method.icon]) {
                return icons[method.icon];
            }
        }

        // Default to method alias icon
        return icons[method.methodAlias] || '';
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MerchelloPayment;
}
