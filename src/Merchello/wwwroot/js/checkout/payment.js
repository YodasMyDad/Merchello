/**
 * Merchello Checkout Payment Module
 * Handles payment method selection and processing for different integration types.
 *
 * Uses a pluggable adapter pattern - all provider-specific code is loaded dynamically
 * from adapter scripts. The checkout knows nothing about individual providers.
 */

// Global adapter registry - providers register their adapters here
window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};

const MerchelloPayment = {
    // Integration type constants matching PaymentIntegrationType enum
    IntegrationType: {
        Redirect: 0,
        HostedFields: 10,
        Widget: 20,
        DirectForm: 30
    },

    // Default timeout for API requests (30 seconds)
    defaultTimeout: 30000,

    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string safe for HTML attribute insertion
     */
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    },

    /**
     * Fetch wrapper with timeout support for older browsers
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {number} timeout - Timeout in milliseconds (default 30000)
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithTimeout(url, options = {}, timeout = this.defaultTimeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    // Store for loaded SDK/adapter scripts
    loadedScripts: {},

    // Store for current payment session
    currentSession: null,

    // Current active adapter instance
    currentAdapter: null,

    /**
     * Fetches available payment methods from the API
     * @returns {Promise<Array>} Array of payment methods
     */
    async getPaymentMethods() {
        try {
            const response = await this.fetchWithTimeout('/api/merchello/checkout/payment-methods');
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
            // Teardown any existing adapter
            await this.teardownCurrentAdapter();

            const response = await this.fetchWithTimeout('/api/merchello/checkout/pay', {
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

            if (!result.success) {
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
            case this.IntegrationType.Widget:
                await this.handleAdapterFlow(session, options);
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
     * Handles adapter-based flow for HostedFields and Widget integration types
     * Dynamically loads the provider's adapter script and delegates to it
     * @param {Object} session - Payment session
     * @param {Object} options - Options including container element ID
     */
    async handleAdapterFlow(session, options) {
        const { containerId, onReady, onError } = options;
        const typeName = session.integrationType === this.IntegrationType.HostedFields ? 'hosted-fields' : 'widget';
        const defaultContainerId = `${typeName}-container`;

        try {
            const container = document.getElementById(containerId || defaultContainerId);
            if (!container) {
                throw new Error(`Container element '${containerId || defaultContainerId}' not found`);
            }

            // Show the container
            container.style.display = 'block';

            // Check if adapter URL is provided
            if (!session.adapterUrl) {
                throw new Error(`Payment method requires an adapter but none was provided. Provider: ${session.providerAlias || 'unknown'}`);
            }

            // Load the provider's SDK if specified
            if (session.javaScriptSdkUrl) {
                await this.loadScript(session.javaScriptSdkUrl);
            }

            // Load the adapter script
            await this.loadScript(session.adapterUrl);

            // Get the adapter from the registry
            const adapterKey = session.providerAlias;
            const adapter = window.MerchelloPaymentAdapters[adapterKey];

            if (!adapter) {
                throw new Error(`Payment adapter not found for provider: ${adapterKey}. Ensure the adapter registers with window.MerchelloPaymentAdapters['${adapterKey}']`);
            }

            if (typeof adapter.render !== 'function') {
                throw new Error(`Payment adapter for '${adapterKey}' does not implement required 'render' method`);
            }

            // Store the current adapter
            this.currentAdapter = adapter;

            // Call the adapter's render method
            await adapter.render(container, session, this);

            if (onReady) {
                onReady(session);
            }
        } catch (error) {
            console.error('Error setting up payment adapter:', error);
            if (onError) {
                onError(error);
            }
            throw error;
        }
    },

    /**
     * Submits the current payment using the active adapter
     * @param {string} invoiceId - The invoice ID to pay
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Payment result
     */
    async submitPayment(invoiceId, options = {}) {
        if (!this.currentAdapter) {
            throw new Error('No payment adapter is active. Call handlePaymentFlow first.');
        }

        if (typeof this.currentAdapter.submit !== 'function') {
            throw new Error('Current payment adapter does not implement required \'submit\' method');
        }

        return await this.currentAdapter.submit(invoiceId, options);
    },

    /**
     * Tears down the current adapter if one is active
     */
    async teardownCurrentAdapter() {
        if (this.currentAdapter && typeof this.currentAdapter.teardown === 'function') {
            try {
                await this.currentAdapter.teardown();
            } catch (error) {
                console.warn('Error tearing down payment adapter:', error);
            }
        }
        this.currentAdapter = null;
        this.currentSession = null;
    },

    /**
     * Handles direct form flow - renders form fields and handles submission
     * @param {Object} session - Payment session
     * @param {Object} options - Options including container element ID
     */
    async handleDirectFormFlow(session, options) {
        const { containerId = 'direct-form-container', onReady, onError } = options;

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
     * Loads a JavaScript script dynamically
     * @param {string} url - URL of the script to load
     * @returns {Promise<void>}
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (this.loadedScripts[url]) {
                resolve();
                return;
            }

            // Check if script tag already exists
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                this.loadedScripts[url] = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            script.onload = () => {
                this.loadedScripts[url] = true;
                resolve();
            };

            script.onerror = () => {
                reject(new Error(`Failed to load script: ${url}`));
            };

            document.head.appendChild(script);
        });
    },

    /**
     * Renders form fields for DirectForm integration type
     * @param {Array} fields - Array of form field definitions
     * @returns {string} HTML string for the form fields
     */
    renderFormFields(fields) {
        const esc = this.escapeHtml.bind(this);

        return fields.map(field => {
            const isRequired = field.isRequired ? 'required' : '';
            const requiredAsterisk = field.isRequired ? '<span class="text-red-500">*</span>' : '';
            const key = esc(field.key);
            const label = esc(field.label);
            const defaultValue = esc(field.defaultValue);
            const placeholder = esc(field.placeholder);
            const description = esc(field.description);
            const pattern = esc(field.validationPattern);

            switch (field.fieldType.toLowerCase()) {
                case 'text':
                case 'email':
                case 'phone':
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${key}">
                                ${label} ${requiredAsterisk}
                            </label>
                            <input type="${esc(field.fieldType.toLowerCase())}"
                                   id="${key}"
                                   name="${key}"
                                   value="${defaultValue}"
                                   placeholder="${placeholder}"
                                   ${pattern ? `pattern="${pattern}"` : ''}
                                   ${isRequired}
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                            ${description ? `<p class="text-sm text-gray-500 mt-1">${description}</p>` : ''}
                        </div>
                    `;

                case 'textarea':
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${key}">
                                ${label} ${requiredAsterisk}
                            </label>
                            <textarea id="${key}"
                                      name="${key}"
                                      placeholder="${placeholder}"
                                      ${isRequired}
                                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                      rows="3">${defaultValue}</textarea>
                            ${description ? `<p class="text-sm text-gray-500 mt-1">${description}</p>` : ''}
                        </div>
                    `;

                case 'select':
                    const options = (field.options || [])
                        .map(opt => `<option value="${esc(opt.value)}" ${opt.value === field.defaultValue ? 'selected' : ''}>${esc(opt.label)}</option>`)
                        .join('');
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${key}">
                                ${label} ${requiredAsterisk}
                            </label>
                            <select id="${key}"
                                    name="${key}"
                                    ${isRequired}
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent">
                                <option value="">-- Select --</option>
                                ${options}
                            </select>
                            ${description ? `<p class="text-sm text-gray-500 mt-1">${description}</p>` : ''}
                        </div>
                    `;

                case 'date':
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${key}">
                                ${label} ${requiredAsterisk}
                            </label>
                            <input type="date"
                                   id="${key}"
                                   name="${key}"
                                   value="${defaultValue}"
                                   ${isRequired}
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                            ${description ? `<p class="text-sm text-gray-500 mt-1">${description}</p>` : ''}
                        </div>
                    `;

                default:
                    return `
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="${key}">
                                ${label} ${requiredAsterisk}
                            </label>
                            <input type="text"
                                   id="${key}"
                                   name="${key}"
                                   value="${defaultValue}"
                                   placeholder="${placeholder}"
                                   ${isRequired}
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                            ${description ? `<p class="text-sm text-gray-500 mt-1">${description}</p>` : ''}
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
     * Prefers iconHtml from API, falls back to icon URL, then default icons
     * @param {Object} method - Payment method object
     * @returns {string} HTML for the payment icon
     */
    getMethodIcon(method) {
        // Prefer iconHtml from the provider (allows full control)
        if (method.iconHtml) {
            return method.iconHtml;
        }

        // If icon is a URL, return an img tag
        if (method.icon) {
            if (method.icon.startsWith('http') || method.icon.startsWith('/')) {
                return `<img src="${method.icon}" alt="${method.displayName}" class="h-6 w-auto" />`;
            }
        }

        // Fallback: generic icons based on method type
        const typeIcons = {
            0: `<svg class="w-8 h-5" viewBox="0 0 32 20" fill="currentColor"><rect x="1" y="1" width="30" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="30" height="4" fill="currentColor" opacity="0.3"/></svg>`, // Cards
            10: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67a.643.643 0 00-1.09.63L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/></svg>`, // ApplePay
            20: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`, // GooglePay
            30: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>` // PayPal / Other
        };

        // Return icon based on method type if available
        if (method.methodType !== undefined && method.methodType !== null && typeIcons[method.methodType]) {
            return typeIcons[method.methodType];
        }

        // Default card icon
        return typeIcons[0];
    },

    /**
     * Processes a payment result and handles success/failure
     * @param {Object} result - Payment processing result
     * @param {Object} callbacks - Success/failure callbacks
     */
    handlePaymentResult(result, callbacks = {}) {
        const { onSuccess, onFailure, onPending } = callbacks;

        if (result.success) {
            if (result.status === 'pending' && onPending) {
                onPending(result);
            } else if (onSuccess) {
                onSuccess(result);
            }
        } else if (onFailure) {
            onFailure(result);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MerchelloPayment;
}
