/**
 * Stripe Payment Adapter
 *
 * Handles Stripe Payment Element for card payments.
 * Uses the Payment Element for a unified card entry experience.
 *
 * See: https://docs.stripe.com/payments/payment-element
 */
(function() {
    'use strict';

    // Store Stripe instances
    let stripeInstance = null;
    let elementsInstance = null;
    let paymentElement = null;
    let currentSession = null;
    let currentContainer = null;

    /**
     * Wait until a mount target is actually in the DOM and visible.
     * Stripe can throw "didn't mount normally" if mounted too early.
     * @param {HTMLElement} element
     * @param {number} timeoutMs
     * @returns {Promise<void>}
     */
    function waitForMountableElement(element, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();

            const check = () => {
                if (!element || !element.isConnected) {
                    if (Date.now() - start > timeoutMs) {
                        reject(new Error('Stripe mount target is not connected to the DOM.'));
                        return;
                    }
                    requestAnimationFrame(check);
                    return;
                }

                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0;

                if (isVisible) {
                    resolve();
                    return;
                }

                if (Date.now() - start > timeoutMs) {
                    reject(new Error('Stripe mount target is not visible.'));
                    return;
                }

                requestAnimationFrame(check);
            };

            requestAnimationFrame(check);
        });
    }

    /**
     * Wait for Stripe Payment Element ready or loaderror.
     * @param {Object} element
     * @param {number} timeoutMs
     * @returns {Promise<void>}
     */
    function waitForPaymentElementReady(element, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const timeoutId = setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error('Stripe Payment Element did not become ready after mount.'));
            }, timeoutMs);

            element.on('ready', () => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                resolve();
            });

            element.on('loaderror', (event) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                const message = event?.error?.message || 'Stripe Payment Element failed to load.';
                reject(new Error(message));
            });
        });
    }

    /**
     * Stripe Payment Adapter
     * Registered with window.MerchelloPaymentAdapters['stripe']
     */
    const stripePaymentAdapter = {
        /**
         * Render the Stripe Payment Element
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

                // Create container structure
                container.innerHTML = `
                    <div class="stripe-payment-wrapper">
                        <div id="stripe-payment-element" class="mb-4"></div>
                        <div id="stripe-payment-errors" class="text-red-600 text-sm mt-2 hidden"></div>
                    </div>
                `;

                // Create Elements instance
                const clientSecret = session.clientSecret || sdkConfig.clientSecret;
                if (!clientSecret) {
                    throw new Error('Stripe client secret not provided');
                }

                elementsInstance = stripeInstance.elements({
                    clientSecret: clientSecret,
                    appearance: {
                        theme: 'stripe',
                        variables: {
                            borderRadius: '8px',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                        }
                    }
                });

                const paymentElementContainer = container.querySelector('#stripe-payment-element');
                if (!paymentElementContainer) {
                    throw new Error('Payment element container not found');
                }

                // Ensure mount target is visible/stable before Stripe mount.
                await waitForMountableElement(paymentElementContainer, 5000);

                // Create and mount the Payment Element.
                // Retry once if Stripe fails to reach ready state.
                let lastMountError = null;
                for (let attempt = 0; attempt < 2; attempt++) {
                    paymentElement = elementsInstance.create('payment', {
                        layout: 'tabs'
                    });

                    const readyPromise = waitForPaymentElementReady(paymentElement, 5000);
                    paymentElement.mount(paymentElementContainer);

                    try {
                        await readyPromise;
                        lastMountError = null;
                        break;
                    } catch (mountError) {
                        lastMountError = mountError;
                        try {
                            paymentElement.destroy();
                        } catch (destroyError) {
                            console.warn('Stripe Payment Element destroy after failed mount:', destroyError);
                        }
                        paymentElement = null;

                        // Give layout one frame before retrying.
                        await new Promise((resolve) => requestAnimationFrame(resolve));
                        await waitForMountableElement(paymentElementContainer, 2000);
                    }
                }

                if (lastMountError) {
                    throw lastMountError;
                }

                // Handle validation errors
                // Note: Use currentContainer for Shadow DOM compatibility
                paymentElement.on('change', function(event) {
                    const errorContainer = currentContainer?.querySelector('#stripe-payment-errors');
                    if (!errorContainer) return;

                    if (event.error) {
                        errorContainer.textContent = event.error.message;
                        errorContainer.classList.remove('hidden');
                    } else {
                        errorContainer.textContent = '';
                        errorContainer.classList.add('hidden');
                    }
                });

                console.log('Stripe Payment Element initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Stripe Payment Element:', error);
                this.showError(container, error.message);
                throw error;
            }
        },

        /**
         * Validate and confirm the payment element (tokenize equivalent for Stripe)
         * For Stripe, this actually confirms the PaymentIntent since there's no separate tokenization step
         * @returns {Promise<Object>} Payment result with paymentIntent details
         */
        async tokenize() {
            if (!stripeInstance || !elementsInstance) {
                throw new Error('Stripe not initialized. Call render() first.');
            }

            // Use stored container reference for Shadow DOM compatibility
            const errorContainer = currentContainer?.querySelector('#stripe-payment-errors');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.classList.add('hidden');
            }

            try {
                const sdkConfig = currentSession?.sdkConfiguration || {};

                // Confirm the payment (Stripe combines validation and confirmation)
                const { error, paymentIntent } = await stripeInstance.confirmPayment({
                    elements: elementsInstance,
                    confirmParams: {
                        return_url: sdkConfig.returnUrl || window.location.href
                    },
                    redirect: 'if_required'
                });

                if (error) {
                    if (errorContainer) {
                        errorContainer.textContent = error.message;
                        errorContainer.classList.remove('hidden');
                    }
                    return {
                        success: false,
                        error: error.message,
                        errorCode: error.code
                    };
                }

                if (paymentIntent) {
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
                if (errorContainer) {
                    errorContainer.textContent = error.message || 'Payment validation failed.';
                    errorContainer.classList.remove('hidden');
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
         * @param {Object} options - Additional options (returnUrl, etc.)
         * @returns {Promise<Object>} Payment result
         */
        async submit(invoiceId, options = {}) {
            if (!stripeInstance || !elementsInstance) {
                throw new Error('Stripe not initialized. Call render() first.');
            }

            // Use stored container reference for Shadow DOM compatibility
            const errorContainer = currentContainer?.querySelector('#stripe-payment-errors');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.classList.add('hidden');
            }

            try {
                const sdkConfig = currentSession?.sdkConfiguration || {};

                // Confirm the payment
                const { error, paymentIntent } = await stripeInstance.confirmPayment({
                    elements: elementsInstance,
                    confirmParams: {
                        return_url: options.returnUrl || sdkConfig.returnUrl || window.location.href
                    },
                    redirect: 'if_required'
                });

                if (error) {
                    // Show error to customer
                    if (errorContainer) {
                        errorContainer.textContent = error.message;
                        errorContainer.classList.remove('hidden');
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
                            methodAlias: currentSession?.methodAlias || 'cards',
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
                if (errorContainer) {
                    errorContainer.textContent = error.message || 'Payment failed. Please try again.';
                    errorContainer.classList.remove('hidden');
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
            if (paymentElement) {
                paymentElement.destroy();
                paymentElement = null;
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

    // Register the adapter
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
    window.MerchelloPaymentAdapters['stripe'] = stripePaymentAdapter;

})();
