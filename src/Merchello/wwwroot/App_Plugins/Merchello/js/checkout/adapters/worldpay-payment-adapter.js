/**
 * WorldPay Payment Adapter
 *
 * Handles WorldPay Checkout SDK for card payments with hosted fields and 3D Secure.
 * Uses the Access Worldpay Checkout SDK for PCI-compliant card entry.
 *
 * See: https://developer.worldpay.com/products/access/checkout
 * See: https://developer.worldpay.com/products/3ds
 */
(function() {
    'use strict';

    // Store WorldPay instance
    let checkoutInstance = null;
    let currentSession = null;
    let currentContainer = null;
    let challengeIframe = null;

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
     * Show error message safely (XSS-safe)
     * @param {HTMLElement} container - The error container
     * @param {string} message - The error message
     */
    function showError(container, message) {
        const errorEl = container.querySelector('#worldpay-errors');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    }

    /**
     * Hide error message
     * @param {HTMLElement} container - The error container
     */
    function hideError(container) {
        const errorEl = container.querySelector('#worldpay-errors');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Collect device data for 3DS
     * @returns {Object} Device data object
     */
    function collectDeviceData() {
        return {
            userAgent: navigator.userAgent,
            browserLanguage: navigator.language || 'en-GB',
            screenHeight: window.screen.height.toString(),
            screenWidth: window.screen.width.toString(),
            colorDepth: window.screen.colorDepth.toString(),
            timeZone: new Date().getTimezoneOffset().toString(),
            acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        };
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Show 3DS challenge iframe
     * @param {HTMLElement} container - The container element
     * @param {Object} challengeData - Challenge data from server
     * @returns {Promise<string>} Challenge reference after completion
     */
    function showChallengeIframe(container, challengeData) {
        return new Promise((resolve, reject) => {
            // Create challenge overlay
            const overlay = document.createElement('div');
            overlay.id = 'worldpay-3ds-overlay';
            overlay.innerHTML = `
                <div class="worldpay-3ds-modal">
                    <div class="worldpay-3ds-header">
                        <span>Card Verification</span>
                        <button type="button" class="worldpay-3ds-close" aria-label="Close">&times;</button>
                    </div>
                    <div class="worldpay-3ds-content">
                        <iframe id="worldpay-3ds-iframe" name="worldpay-3ds-iframe"></iframe>
                        <form id="worldpay-3ds-form" target="worldpay-3ds-iframe" method="POST" action="${escapeHtml(challengeData.url || '')}">
                            <input type="hidden" name="JWT" value="${escapeHtml(challengeData.jwt || '')}" />
                            <input type="hidden" name="MD" value="${escapeHtml(challengeData.reference || '')}" />
                        </form>
                    </div>
                </div>
                <style>
                    #worldpay-3ds-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                    }
                    .worldpay-3ds-modal {
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                        max-width: 450px;
                        width: 95%;
                        max-height: 90vh;
                        overflow: hidden;
                    }
                    .worldpay-3ds-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1rem;
                        border-bottom: 1px solid #e5e7eb;
                        font-weight: 600;
                    }
                    .worldpay-3ds-close {
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        cursor: pointer;
                        color: #6b7280;
                        padding: 0;
                        line-height: 1;
                    }
                    .worldpay-3ds-close:hover {
                        color: #1f2937;
                    }
                    .worldpay-3ds-content {
                        padding: 0;
                    }
                    #worldpay-3ds-iframe {
                        width: 100%;
                        height: 450px;
                        border: none;
                    }
                    #worldpay-3ds-form {
                        display: none;
                    }
                </style>
            `;

            document.body.appendChild(overlay);
            challengeIframe = overlay;

            // Close button handler
            const closeBtn = overlay.querySelector('.worldpay-3ds-close');
            closeBtn.addEventListener('click', () => {
                cleanup();
                reject(new Error('3DS challenge cancelled by user'));
            });

            // Listen for challenge completion message
            const messageHandler = (event) => {
                // Check for completion message from 3DS iframe
                if (event.data && (event.data.MessageType === 'profile.completed' ||
                    event.data.type === '3ds-challenge-complete')) {
                    cleanup();
                    resolve(challengeData.reference);
                }
            };

            window.addEventListener('message', messageHandler);

            // Submit the challenge form
            const form = overlay.querySelector('#worldpay-3ds-form');
            form.submit();

            // Timeout ID for cleanup
            let challengeTimeoutId = null;

            // Cleanup function
            function cleanup() {
                window.removeEventListener('message', messageHandler);
                if (challengeTimeoutId) {
                    clearTimeout(challengeTimeoutId);
                    challengeTimeoutId = null;
                }
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                challengeIframe = null;
            }

            // Timeout for challenge (5 minutes)
            challengeTimeoutId = setTimeout(() => {
                if (challengeIframe) {
                    cleanup();
                    reject(new Error('3DS challenge timed out'));
                }
            }, 5 * 60 * 1000);
        });
    }

    /**
     * Get card icon SVG based on card type
     * @param {string} cardType - The card type (visa, mastercard, etc.)
     * @returns {string} SVG markup
     */
    function getCardIcon(cardType) {
        const icons = {
            visa: '<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#0066B2"/><path d="M15.8 15.6l1.5-8.5h2.2l-1.5 8.5h-2.2zm9.7-8.3c-.4-.2-1.1-.4-2-.4-2.2 0-3.7 1.1-3.7 2.6 0 1.1 1.1 1.8 1.9 2.1.8.4 1.1.6 1.1 1 0 .5-.7.8-1.3.8-.9 0-1.3-.1-2-.4l-.3-.1-.3 1.8c.5.2 1.4.4 2.4.4 2.3 0 3.8-1.1 3.9-2.7 0-.9-.6-1.6-1.8-2.2-.8-.4-1.2-.6-1.2-1 0-.3.4-.7 1.2-.7.7 0 1.2.1 1.6.3l.2.1.3-1.6zm5.4-.2h-1.7c-.5 0-.9.1-1.2.6l-3.3 7.9h2.3l.5-1.3h2.9l.3 1.3h2.1l-1.9-8.5zm-2.8 5.5l1.2-3.1.7 3.1h-1.9zm-14.2-5.5l-2.1 5.8-.2-1.2c-.4-1.3-1.7-2.7-3.1-3.4l2 7.3h2.4l3.6-8.5h-2.6z" fill="#FFF"/><path d="M9.4 7.1H5.8l-.1.2c2.8.7 4.7 2.3 5.5 4.3l-.8-3.9c-.1-.5-.5-.6-1-.6z" fill="#F9A533"/></svg>',
            mastercard: '<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#000"/><circle cx="15" cy="12" r="7" fill="#EB001B"/><circle cx="23" cy="12" r="7" fill="#F79E1B"/><path d="M19 6.5c-1.7 1.3-2.8 3.3-2.8 5.5s1.1 4.2 2.8 5.5c1.7-1.3 2.8-3.3 2.8-5.5s-1.1-4.2-2.8-5.5z" fill="#FF5F00"/></svg>',
            amex: '<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#2557D6"/><path d="M19 12l-2.5-6h-3l4 9h3l4-9h-3L19 12zm-9.5-6H6l-3 9h2.5l.5-1.5h3l.5 1.5h2.5l-3-9zm-1 6h-2l1-3 1 3zm19-6h-4v9h4V13.5h3V12h-3v-1.5h3V9h-3V7.5z" fill="#FFF"/></svg>',
            discover: '<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#FFF"/><path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#F27712"/><circle cx="19" cy="12" r="5" fill="#FFF"/></svg>',
            jcb: '<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#FFF"/><path d="M9 4c-1.7 0-3 1.3-3 3v10c0 1.7 1.3 3 3 3h4V4H9z" fill="#0E4C96"/><path d="M17 4c-1.7 0-3 1.3-3 3v10c0 1.7 1.3 3 3 3h4V4h-4z" fill="#E41D2E"/><path d="M25 4c-1.7 0-3 1.3-3 3v10c0 1.7 1.3 3 3 3h4V4h-4z" fill="#007940"/></svg>',
            maestro: '<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#FFF"/><circle cx="15" cy="12" r="7" fill="#0066B2"/><circle cx="23" cy="12" r="7" fill="#D9232D"/><path d="M19 6.5c-1.7 1.3-2.8 3.3-2.8 5.5s1.1 4.2 2.8 5.5c1.7-1.3 2.8-3.3 2.8-5.5s-1.1-4.2-2.8-5.5z" fill="#6C6BBD"/></svg>'
        };
        return icons[cardType?.toLowerCase()] || icons.visa;
    }

    /**
     * WorldPay Payment Adapter
     * Registered with window.MerchelloPaymentAdapters['worldpay']
     */
    const worldpayPaymentAdapter = {
        /**
         * Adapter configuration
         */
        config: {
            name: 'WorldPay',
            supportsStandard: true,
            supportsExpress: false
        },

        /**
         * Render the WorldPay Checkout SDK fields
         * @param {HTMLElement} container - The container element to render into
         * @param {Object} session - The payment session from the server
         * @param {Object} context - The render context { isExpress, session?, checkout?, method? }
         */
        async render(container, session, context) {
            try {
                currentSession = session;
                currentContainer = container;
                const config = session.sdkConfiguration || {};

                // Validate required config
                if (!config.merchantId) {
                    throw new Error('WorldPay merchant ID not provided');
                }

                // Load the WorldPay Checkout SDK
                await loadScript(session.javaScriptSdkUrl);
                await waitForGlobal('Worldpay.checkout');

                // Create container structure with field containers
                container.innerHTML = `
                    <div class="worldpay-hosted-fields-wrapper">
                        <form id="worldpay-card-form" class="worldpay-card-form">
                            <div class="worldpay-form-field">
                                <label for="worldpay-card-pan" class="worldpay-label">Card Number</label>
                                <div id="worldpay-card-pan" class="worldpay-hosted-field"></div>
                                <div id="worldpay-card-icon" class="worldpay-card-icon"></div>
                            </div>
                            <div class="worldpay-form-row">
                                <div class="worldpay-form-field worldpay-form-field--half">
                                    <label for="worldpay-card-expiry" class="worldpay-label">Expiry Date</label>
                                    <div id="worldpay-card-expiry" class="worldpay-hosted-field"></div>
                                </div>
                                <div class="worldpay-form-field worldpay-form-field--half">
                                    <label for="worldpay-card-cvv" class="worldpay-label">CVV</label>
                                    <div id="worldpay-card-cvv" class="worldpay-hosted-field"></div>
                                </div>
                            </div>
                            <div id="worldpay-errors" class="worldpay-error-message hidden"></div>
                        </form>
                    </div>
                    <style>
                        .worldpay-hosted-fields-wrapper {
                            display: flex;
                            flex-direction: column;
                            gap: 1rem;
                        }
                        .worldpay-card-form {
                            display: flex;
                            flex-direction: column;
                            gap: 1rem;
                        }
                        .worldpay-form-field {
                            display: flex;
                            flex-direction: column;
                            gap: 0.25rem;
                            position: relative;
                        }
                        .worldpay-form-row {
                            display: flex;
                            gap: 1rem;
                        }
                        .worldpay-form-field--half {
                            flex: 1;
                        }
                        .worldpay-label {
                            font-size: 0.875rem;
                            font-weight: 500;
                            color: #374151;
                        }
                        .worldpay-hosted-field {
                            height: 44px;
                            padding: 0 0.75rem;
                            border: 1px solid #d1d5db;
                            border-radius: 0.375rem;
                            background-color: #fff;
                            transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                        }
                        .worldpay-hosted-field:focus-within {
                            border-color: #3b82f6;
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                        }
                        .worldpay-hosted-field.is-valid {
                            border-color: #059669;
                        }
                        .worldpay-hosted-field.is-invalid {
                            border-color: #dc2626;
                        }
                        .worldpay-card-icon {
                            position: absolute;
                            right: 0.75rem;
                            top: 50%;
                            transform: translateY(25%);
                            width: 32px;
                            height: 20px;
                        }
                        .worldpay-card-icon svg {
                            width: 100%;
                            height: 100%;
                        }
                        .worldpay-error-message {
                            color: #dc2626;
                            font-size: 0.875rem;
                            margin-top: 0.5rem;
                        }
                        .worldpay-error-message.hidden {
                            display: none;
                        }
                    </style>
                `;

                // Initialize WorldPay Checkout SDK
                Worldpay.checkout.init(
                    {
                        id: config.merchantId,
                        form: '#worldpay-card-form',
                        fields: {
                            pan: {
                                selector: '#worldpay-card-pan',
                                placeholder: 'Card Number'
                            },
                            cvv: {
                                selector: '#worldpay-card-cvv',
                                placeholder: 'CVV'
                            },
                            expiry: {
                                selector: '#worldpay-card-expiry',
                                placeholder: 'MM/YY'
                            }
                        },
                        styles: {
                            'input': {
                                'font-size': '16px',
                                'font-family': 'system-ui, -apple-system, sans-serif',
                                'color': '#1f2937',
                                'line-height': '44px'
                            },
                            'input:focus': {
                                'color': '#111827'
                            },
                            'input.is-valid': {
                                'color': '#059669'
                            },
                            'input.is-invalid': {
                                'color': '#dc2626'
                            },
                            '::-webkit-input-placeholder': {
                                'color': '#9ca3af'
                            },
                            '::placeholder': {
                                'color': '#9ca3af'
                            }
                        },
                        enablePanFormatting: true
                    },
                    function(error, checkout) {
                        if (error) {
                            console.error('WorldPay SDK initialization error:', error);
                            showError(container, error.message || 'Failed to initialize payment form');
                            return;
                        }

                        checkoutInstance = checkout;

                        // Set up card type detection (if available)
                        if (checkout.on) {
                            checkout.on('cardType', function(event) {
                                const iconContainer = container.querySelector('#worldpay-card-icon');
                                if (iconContainer && event.cardType) {
                                    iconContainer.innerHTML = getCardIcon(event.cardType);
                                }
                            });

                            checkout.on('validation', function(event) {
                                const field = container.querySelector(`#worldpay-card-${event.field}`);
                                if (field) {
                                    field.classList.toggle('is-valid', event.isValid === true);
                                    field.classList.toggle('is-invalid', event.isValid === false);
                                }
                            });
                        }

                        console.debug('WorldPay Checkout SDK initialized successfully');
                    }
                );

            } catch (error) {
                console.error('WorldPay adapter render error:', error);
                showError(container, error.message || 'Failed to load payment form');
                throw error;
            }
        },

        /**
         * Submit the payment with 3DS support
         * @param {string} sessionId - The session ID
         * @param {Object} data - Additional data { invoiceId, checkout, billingAddress }
         * @returns {Promise<Object>} Payment result
         */
        async submit(sessionId, data = {}) {
            if (!checkoutInstance) {
                return { success: false, error: 'Payment form not initialized' };
            }

            hideError(currentContainer);

            return new Promise((resolve) => {
                checkoutInstance.generateSessionState(async function(error, sessionState) {
                    if (error) {
                        console.error('WorldPay session generation error:', error);
                        showError(currentContainer, error.message || 'Card validation failed');
                        resolve({ success: false, error: error.message || 'Card validation failed' });
                        return;
                    }

                    try {
                        // Collect device data for 3DS
                        const deviceData = collectDeviceData();

                        // Get vault settings from checkout store
                        const vaultSettings = MerchelloPayment.getVaultSettings();

                        // Build payment request with device data
                        const paymentRequest = {
                            invoiceId: data.invoiceId || currentSession?.sdkConfiguration?.invoiceId,
                            providerAlias: 'worldpay',
                            methodAlias: currentSession?.methodAlias || 'cards',
                            paymentMethodToken: sessionState,
                            customerEmail: data.customerEmail,
                            customerName: data.customerName,
                            savePaymentMethod: vaultSettings.savePaymentMethod,
                            setAsDefaultMethod: vaultSettings.setAsDefaultMethod,
                            metadata: {
                                ...deviceData,
                                returnUrl: window.location.href,
                                challengeWindowSize: '390x400'
                            }
                        };

                        // Add billing address if available
                        if (data.billingAddress) {
                            paymentRequest.metadata.billingAddress1 = data.billingAddress.address1 || data.billingAddress.line1;
                            paymentRequest.metadata.billingAddress2 = data.billingAddress.address2 || data.billingAddress.line2;
                            paymentRequest.metadata.billingCity = data.billingAddress.city;
                            paymentRequest.metadata.billingPostalCode = data.billingAddress.postalCode || data.billingAddress.zip;
                            paymentRequest.metadata.billingCountryCode = data.billingAddress.countryCode || data.billingAddress.country;
                        }

                        // Post the payment request
                        const response = await fetch('/api/merchello/checkout/process-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(paymentRequest)
                        });

                        let result = await response.json();

                        // Handle 3DS challenge if required
                        if (result.status === 'requiresAction' && result.actionRequired?.type === '3ds_challenge') {
                            console.debug('3DS challenge required');

                            try {
                                const challengeReference = await showChallengeIframe(
                                    currentContainer,
                                    result.actionRequired.challengeData
                                );

                                // Complete payment after challenge
                                const challengeResponse = await fetch('/api/merchello/checkout/process-payment', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        invoiceId: paymentRequest.invoiceId,
                                        providerAlias: 'worldpay',
                                        methodAlias: 'cards',
                                        paymentMethodToken: result.actionRequired.challengeData.sessionState,
                                        savePaymentMethod: vaultSettings.savePaymentMethod,
                                        setAsDefaultMethod: vaultSettings.setAsDefaultMethod,
                                        metadata: {
                                            challengeReference: challengeReference
                                        }
                                    })
                                });

                                result = await challengeResponse.json();
                            } catch (challengeError) {
                                console.error('3DS challenge error:', challengeError);
                                showError(currentContainer, challengeError.message || '3D Secure verification failed');
                                resolve({ success: false, error: challengeError.message });
                                return;
                            }
                        }

                        if (!result.success) {
                            showError(currentContainer, result.errorMessage || 'Payment failed');
                        }

                        resolve(result);
                    } catch (err) {
                        console.error('WorldPay payment submission error:', err);
                        showError(currentContainer, err.message || 'Payment failed');
                        resolve({ success: false, error: err.message || 'Payment failed' });
                    }
                });
            });
        },

        /**
         * Get payment token without submitting (for backoffice testing)
         * @returns {Promise<Object>} Token result
         */
        async tokenize() {
            if (!checkoutInstance) {
                return { success: false, error: 'Payment form not initialized' };
            }

            return new Promise((resolve) => {
                checkoutInstance.generateSessionState(function(error, sessionState) {
                    if (error) {
                        console.error('WorldPay tokenization error:', error);
                        resolve({ success: false, error: error.message || 'Tokenization failed' });
                        return;
                    }

                    resolve({ success: true, nonce: sessionState });
                });
            });
        },

        /**
         * Clean up when switching payment methods
         * @param {string} [sessionId] - Optional session ID
         */
        teardown(sessionId) {
            // Clean up challenge iframe if present
            if (challengeIframe && challengeIframe.parentNode) {
                challengeIframe.parentNode.removeChild(challengeIframe);
                challengeIframe = null;
            }

            if (checkoutInstance && typeof checkoutInstance.clear === 'function') {
                try {
                    checkoutInstance.clear();
                } catch (e) {
                    console.warn('Error clearing WorldPay instance:', e);
                }
            }
            checkoutInstance = null;
            currentSession = null;
            currentContainer = null;
        }
    };

    // Register the adapter
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
    window.MerchelloPaymentAdapters['worldpay'] = worldpayPaymentAdapter;

    console.debug('WorldPay payment adapter registered (with 3DS support)');
})();
