/**
 * Stripe Card Elements Adapter
 *
 * Handles Stripe Individual Card Elements (cardNumber, cardExpiry, cardCvc)
 * for card payments with per-field customization.
 * Equivalent to Braintree's Hosted Fields approach.
 *
 * See: https://docs.stripe.com/js/element/other_element
 */
(function() {
    'use strict';

    // Store Stripe instances
    let stripeInstance = null;
    let elementsInstance = null;
    let cardNumberElement = null;
    let cardExpiryElement = null;
    let cardCvcElement = null;
    let currentSession = null;
    let currentContainer = null;

    // Element styling matching Braintree's look
    const elementStyle = {
        base: {
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1f2937',
            lineHeight: '44px',
            '::placeholder': {
                color: '#9ca3af'
            }
        },
        invalid: {
            color: '#dc2626'
        },
        complete: {
            color: '#059669'
        }
    };

    /**
     * Stripe Card Elements Adapter
     * Registered with window.MerchelloPaymentAdapters['stripe-card-elements']
     */
    const stripeCardElementsAdapter = {
        /**
         * Render the Stripe Card Elements
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} session - The payment session from the server
         * @param {Object} checkout - The MerchelloPayment instance
         */
        async render(container, session, checkout) {
            try {
                currentSession = session;
                currentContainer = container;
                const sdkConfig = session.sdkConfiguration || {};

                // Validate required config
                if (!sdkConfig.publishableKey) {
                    throw new Error('Stripe publishable key not provided');
                }

                // Initialize Stripe if not already done
                if (!stripeInstance) {
                    if (!window.Stripe) {
                        throw new Error('Stripe.js not loaded. Ensure the SDK URL is correct.');
                    }
                    stripeInstance = Stripe(sdkConfig.publishableKey);
                }

                // Create container structure with individual field containers
                container.innerHTML = `
                    <div class="stripe-card-elements-wrapper">
                        <div class="stripe-form-field">
                            <label for="stripe-card-number" class="stripe-label">Card Number</label>
                            <div class="stripe-field-wrapper">
                                <div id="stripe-card-number" class="stripe-card-field"></div>
                                <div id="stripe-card-icon" class="stripe-card-icon"></div>
                            </div>
                        </div>
                        <div class="stripe-form-row">
                            <div class="stripe-form-field stripe-form-field--half">
                                <label for="stripe-card-expiry" class="stripe-label">Expiry Date</label>
                                <div id="stripe-card-expiry" class="stripe-card-field"></div>
                            </div>
                            <div class="stripe-form-field stripe-form-field--half">
                                <label for="stripe-card-cvc" class="stripe-label">CVC</label>
                                <div id="stripe-card-cvc" class="stripe-card-field"></div>
                            </div>
                        </div>
                        <div class="stripe-form-field">
                            <label for="stripe-cardholder-name" class="stripe-label">Name on Card</label>
                            <input type="text" id="stripe-cardholder-name" class="stripe-input-field" placeholder="Name on Card" autocomplete="cc-name" />
                        </div>
                        <div id="stripe-errors" class="stripe-error-message"></div>
                    </div>
                    <style>
                        .stripe-card-elements-wrapper {
                            display: flex;
                            flex-direction: column;
                            gap: 1rem;
                        }
                        .stripe-form-field {
                            display: flex;
                            flex-direction: column;
                            gap: 0.25rem;
                            position: relative;
                        }
                        .stripe-field-wrapper {
                            position: relative;
                        }
                        .stripe-form-row {
                            display: flex;
                            gap: 1rem;
                        }
                        .stripe-form-field--half {
                            flex: 1;
                        }
                        .stripe-label {
                            font-size: 0.875rem;
                            font-weight: 500;
                            color: #374151;
                        }
                        .stripe-card-field {
                            height: 44px;
                            padding: 0 0.75rem;
                            border: 1px solid #d1d5db;
                            border-radius: 0.375rem;
                            background: white;
                            transition: border-color 0.15s ease, box-shadow 0.15s ease;
                        }
                        .stripe-card-field:hover {
                            border-color: #9ca3af;
                        }
                        .stripe-card-field.StripeElement--focus {
                            border-color: #3b82f6;
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                            outline: none;
                        }
                        .stripe-card-field.StripeElement--complete {
                            border-color: #10b981;
                        }
                        .stripe-card-field.StripeElement--invalid {
                            border-color: #ef4444;
                        }
                        .stripe-input-field {
                            height: 44px;
                            padding: 0 0.75rem;
                            border: 1px solid #d1d5db;
                            border-radius: 0.375rem;
                            background: white;
                            font-size: 16px;
                            font-family: system-ui, -apple-system, sans-serif;
                            color: #1f2937;
                            width: 100%;
                            box-sizing: border-box;
                            transition: border-color 0.15s ease, box-shadow 0.15s ease;
                        }
                        .stripe-input-field:hover {
                            border-color: #9ca3af;
                        }
                        .stripe-input-field:focus {
                            border-color: #3b82f6;
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                            outline: none;
                        }
                        .stripe-input-field::placeholder {
                            color: #9ca3af;
                        }
                        .stripe-card-icon {
                            position: absolute;
                            right: 0.75rem;
                            top: 50%;
                            transform: translateY(-50%);
                            width: 32px;
                            height: 20px;
                            pointer-events: none;
                        }
                        .stripe-error-message {
                            color: #dc2626;
                            font-size: 0.875rem;
                            min-height: 1.25rem;
                        }
                        .stripe-error-message:empty {
                            display: none;
                        }
                    </style>
                `;

                // Get field containers
                const numberContainer = container.querySelector('#stripe-card-number');
                const expiryContainer = container.querySelector('#stripe-card-expiry');
                const cvcContainer = container.querySelector('#stripe-card-cvc');

                if (!numberContainer || !expiryContainer || !cvcContainer) {
                    throw new Error('Card element containers not found');
                }

                // Create Elements instance with client secret
                const clientSecret = session.clientSecret || sdkConfig.clientSecret;
                if (!clientSecret) {
                    throw new Error('Stripe client secret not provided');
                }

                elementsInstance = stripeInstance.elements({
                    clientSecret: clientSecret,
                    appearance: {
                        theme: 'stripe'
                    }
                });

                // Create individual card elements
                cardNumberElement = elementsInstance.create('cardNumber', {
                    style: elementStyle,
                    placeholder: '4242 4242 4242 4242',
                    showIcon: false // We'll show our own icon
                });

                cardExpiryElement = elementsInstance.create('cardExpiry', {
                    style: elementStyle,
                    placeholder: 'MM / YY'
                });

                cardCvcElement = elementsInstance.create('cardCvc', {
                    style: elementStyle,
                    placeholder: '123'
                });

                // Mount elements
                cardNumberElement.mount(numberContainer);
                cardExpiryElement.mount(expiryContainer);
                cardCvcElement.mount(cvcContainer);

                // Set up card brand detection
                const cardIconContainer = container.querySelector('#stripe-card-icon');
                cardNumberElement.on('change', (event) => {
                    if (cardIconContainer) {
                        if (event.brand && event.brand !== 'unknown') {
                            cardIconContainer.innerHTML = this.getCardIcon(event.brand);
                        } else {
                            cardIconContainer.innerHTML = '';
                        }
                    }

                    // Show any errors
                    this.handleElementError(event);
                });

                // Set up error handling for other elements
                cardExpiryElement.on('change', (event) => this.handleElementError(event));
                cardCvcElement.on('change', (event) => this.handleElementError(event));

                // Clear errors on focus
                cardNumberElement.on('focus', () => this.clearError());
                cardExpiryElement.on('focus', () => this.clearError());
                cardCvcElement.on('focus', () => this.clearError());

                // Clear errors when typing in cardholder name
                const cardholderInput = container.querySelector('#stripe-cardholder-name');
                if (cardholderInput) {
                    cardholderInput.addEventListener('focus', () => this.clearError());
                }

                console.log('Stripe Card Elements initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Stripe Card Elements:', error);
                this.showError(container, error.message);
                throw error;
            }
        },

        /**
         * Handle element change errors
         * @param {Object} event - The Stripe element change event
         */
        handleElementError(event) {
            const errorContainer = currentContainer?.querySelector('#stripe-errors');
            if (!errorContainer) return;

            if (event.error) {
                errorContainer.textContent = event.error.message;
            } else if (event.complete) {
                errorContainer.textContent = '';
            }
        },

        /**
         * Clear error messages
         */
        clearError() {
            const errorContainer = currentContainer?.querySelector('#stripe-errors');
            if (errorContainer) {
                errorContainer.textContent = '';
            }
        },

        /**
         * Get SVG icon for card brand
         * @param {string} brand - The card brand (visa, mastercard, etc.)
         * @returns {string} SVG HTML
         */
        getCardIcon(brand) {
            const icons = {
                'visa': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#1434CB"/><path d="M12.5 13.5L13.8 6.5H15.7L14.4 13.5H12.5ZM19.6 6.7C19.2 6.5 18.6 6.4 17.8 6.4C15.9 6.4 14.6 7.4 14.6 8.7C14.6 9.7 15.5 10.3 16.2 10.6C16.9 10.9 17.2 11.2 17.2 11.5C17.2 12 16.6 12.2 16 12.2C15.2 12.2 14.8 12.1 14.1 11.8L13.8 11.7L13.5 13.3C14 13.5 14.8 13.7 15.7 13.7C17.7 13.7 19 12.7 19 11.3C19 10.5 18.5 9.9 17.4 9.4C16.8 9.1 16.4 8.9 16.4 8.5C16.4 8.2 16.7 7.9 17.4 7.9C18 7.9 18.5 8 18.8 8.2L19 8.3L19.6 6.7ZM23.4 6.5H22C21.5 6.5 21.1 6.6 20.9 7.2L18.1 13.5H20.1L20.5 12.3H22.9L23.2 13.5H25L23.4 6.5ZM21 10.8L21.9 8.3L22.5 10.8H21ZM11.4 6.5L9.5 11.3L9.3 10.3C8.9 9.1 7.8 7.8 6.6 7.1L8.3 13.5H10.4L13.5 6.5H11.4Z" fill="white"/><path d="M8.2 6.5H5L5 6.6C7.5 7.2 9.2 8.7 9.8 10.3L9.1 7.2C9 6.7 8.6 6.5 8.2 6.5Z" fill="#F9A533"/></svg>',
                'mastercard': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#000"/><circle cx="12" cy="10" r="6" fill="#EB001B"/><circle cx="20" cy="10" r="6" fill="#F79E1B"/><path d="M16 5.3A6 6 0 0 0 14 10a6 6 0 0 0 2 4.7 6 6 0 0 0 2-4.7 6 6 0 0 0-2-4.7z" fill="#FF5F00"/></svg>',
                'amex': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#006FCF"/><path d="M5 13.5V6.5H8.5L9.5 8.5L10.5 6.5H14V13.5H11.5V9L10 12H9L7.5 9V13.5H5ZM15 13.5V6.5H21V8H17V9.5H20.5V11H17V12H21V13.5H15ZM22 13.5L25 10L22 6.5H25L26.5 8.5L28 6.5H31L28 10L31 13.5H28L26.5 11.5L25 13.5H22Z" fill="white"/></svg>',
                'discover': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#fff" stroke="#d1d5db"/><path d="M0 0h32v10H0z" fill="#4D4D4D"/><ellipse cx="20" cy="10" rx="8" ry="6" fill="#F47216"/></svg>',
                'diners': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#0079BE"/><circle cx="16" cy="10" r="7" fill="white"/><path d="M13 6v8M19 6v8M11 10h10" stroke="#0079BE" stroke-width="1.5"/></svg>',
                'jcb': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#fff" stroke="#d1d5db"/><rect x="4" y="3" width="8" height="14" rx="2" fill="#0E4C96"/><rect x="12" y="3" width="8" height="14" rx="2" fill="#E41D2D"/><rect x="20" y="3" width="8" height="14" rx="2" fill="#007940"/></svg>',
                'unionpay': '<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="2" fill="#1A1F71"/><path d="M8 4h6l-2 12H6L8 4z" fill="#E21836"/><path d="M13 4h6l-2 12h-6l2-12z" fill="#00447C"/><path d="M18 4h6l-2 12h-6l2-12z" fill="#007B84"/></svg>'
            };
            return icons[brand] || '';
        },

        /**
         * Validate and get payment method details (tokenize equivalent)
         * For Stripe, this confirms the PaymentIntent
         * @returns {Promise<Object>} Payment result with paymentIntent details
         */
        async tokenize() {
            if (!stripeInstance || !elementsInstance || !cardNumberElement) {
                return { success: false, error: 'Stripe not initialized. Call render() first.' };
            }

            // Clear any previous errors
            this.clearError();

            try {
                // Validate cardholder name
                const cardholderInput = currentContainer?.querySelector('#stripe-cardholder-name');
                const cardholderName = cardholderInput?.value?.trim() || '';

                if (!cardholderName) {
                    const errorContainer = currentContainer?.querySelector('#stripe-errors');
                    if (errorContainer) {
                        errorContainer.textContent = 'Please enter the name on your card.';
                    }
                    return { success: false, error: 'Please enter the name on your card.' };
                }

                const sdkConfig = currentSession?.sdkConfiguration || {};

                // Confirm the card payment
                const { error, paymentIntent } = await stripeInstance.confirmCardPayment(
                    currentSession?.clientSecret || sdkConfig.clientSecret,
                    {
                        payment_method: {
                            card: cardNumberElement,
                            billing_details: {
                                name: cardholderName
                            }
                        }
                    },
                    {
                        handleActions: false // Don't redirect for 3D Secure yet
                    }
                );

                if (error) {
                    const errorContainer = currentContainer?.querySelector('#stripe-errors');
                    if (errorContainer) {
                        errorContainer.textContent = error.message;
                    }
                    return {
                        success: false,
                        error: error.message,
                        errorCode: error.code
                    };
                }

                if (paymentIntent) {
                    // If 3D Secure is required, handle it
                    if (paymentIntent.status === 'requires_action') {
                        const { error: actionError, paymentIntent: confirmedIntent } =
                            await stripeInstance.confirmCardPayment(currentSession?.clientSecret || sdkConfig.clientSecret);

                        if (actionError) {
                            return {
                                success: false,
                                error: actionError.message,
                                errorCode: actionError.code
                            };
                        }

                        return {
                            success: true,
                            nonce: confirmedIntent.id,
                            paymentIntentId: confirmedIntent.id,
                            status: confirmedIntent.status
                        };
                    }

                    return {
                        success: true,
                        nonce: paymentIntent.id,
                        paymentIntentId: paymentIntent.id,
                        status: paymentIntent.status
                    };
                }

                return {
                    success: false,
                    error: 'Unexpected payment state'
                };
            } catch (error) {
                console.error('Stripe tokenization error:', error);
                const errorContainer = currentContainer?.querySelector('#stripe-errors');
                if (errorContainer) {
                    errorContainer.textContent = error.message || 'Payment validation failed.';
                }
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * Submit the payment
         * @param {string} invoiceId - The invoice ID being paid
         * @param {Object} options - Additional options (billingAddress, email, etc.)
         * @returns {Promise<Object>} Payment result
         */
        async submit(invoiceId, options = {}) {
            if (!stripeInstance || !elementsInstance || !cardNumberElement) {
                return { success: false, error: 'Stripe not initialized. Call render() first.' };
            }

            // Clear any previous errors
            this.clearError();

            try {
                // Validate cardholder name
                const cardholderInput = currentContainer?.querySelector('#stripe-cardholder-name');
                const cardholderName = cardholderInput?.value?.trim() || '';

                if (!cardholderName) {
                    const errorContainer = currentContainer?.querySelector('#stripe-errors');
                    if (errorContainer) {
                        errorContainer.textContent = 'Please enter the name on your card.';
                    }
                    return { success: false, error: 'Please enter the name on your card.' };
                }

                const sdkConfig = currentSession?.sdkConfiguration || {};

                // Build billing details
                const billingDetails = {
                    name: cardholderName
                };

                if (options.email) {
                    billingDetails.email = options.email;
                }

                if (options.billingAddress) {
                    billingDetails.address = {
                        line1: options.billingAddress.line1 || '',
                        line2: options.billingAddress.line2 || '',
                        city: options.billingAddress.city || '',
                        state: options.billingAddress.region || '',
                        postal_code: options.billingAddress.postalCode || '',
                        country: options.billingAddress.countryCode || ''
                    };
                    if (options.billingAddress.phone) {
                        billingDetails.phone = options.billingAddress.phone;
                    }
                }

                // Confirm the card payment (handles 3D Secure automatically)
                const { error, paymentIntent } = await stripeInstance.confirmCardPayment(
                    currentSession?.clientSecret || sdkConfig.clientSecret,
                    {
                        payment_method: {
                            card: cardNumberElement,
                            billing_details: billingDetails
                        },
                        return_url: options.returnUrl || sdkConfig.returnUrl || window.location.href
                    }
                );

                if (error) {
                    // Show error to customer
                    const errorContainer = currentContainer?.querySelector('#stripe-errors');
                    if (errorContainer) {
                        errorContainer.textContent = error.message;
                    }
                    return {
                        success: false,
                        error: error.message,
                        errorCode: error.code
                    };
                }

                // Payment succeeded or is processing
                if (paymentIntent) {
                    // Get vault settings from checkout store
                    const vaultSettings = MerchelloPayment.getVaultSettings();

                    // Notify server of payment completion
                    const response = await MerchelloPayment.fetchWithTimeout('/api/merchello/checkout/process-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            invoiceId: invoiceId,
                            providerAlias: currentSession?.providerAlias || 'stripe',
                            methodAlias: currentSession?.methodAlias || 'cards-hosted',
                            paymentMethodToken: paymentIntent.id,
                            transactionId: paymentIntent.id,
                            savePaymentMethod: vaultSettings.savePaymentMethod,
                            setAsDefaultMethod: vaultSettings.setAsDefaultMethod
                        })
                    });

                    const result = await response.json();
                    return result;
                }

                return {
                    success: false,
                    error: 'Unexpected payment state'
                };
            } catch (error) {
                console.error('Stripe payment submission error:', error);
                const errorContainer = currentContainer?.querySelector('#stripe-errors');
                if (errorContainer) {
                    errorContainer.textContent = error.message || 'Payment failed. Please try again.';
                }
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * Clean up Stripe elements
         */
        teardown() {
            if (cardNumberElement) {
                cardNumberElement.destroy();
                cardNumberElement = null;
            }
            if (cardExpiryElement) {
                cardExpiryElement.destroy();
                cardExpiryElement = null;
            }
            if (cardCvcElement) {
                cardCvcElement.destroy();
                cardCvcElement = null;
            }
            elementsInstance = null;
            currentSession = null;
            currentContainer = null;
            // Note: We keep stripeInstance to avoid re-initialization
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

    // Register the adapter - use 'stripe' as the key since that's the provider alias
    // that the checkout system uses to look up adapters. Each adapter file registers
    // under the same key, and only one adapter file is loaded based on the payment method.
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
    window.MerchelloPaymentAdapters['stripe'] = stripeCardElementsAdapter;

})();
