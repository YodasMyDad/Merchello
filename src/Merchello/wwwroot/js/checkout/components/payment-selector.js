// @ts-check
/**
 * Merchello Checkout - Payment Selector Component
 *
 * Handles payment method selection and payment form rendering.
 * Works with the existing payment.js adapter system.
 */

import { checkoutApi } from '../services/api.js';

/**
 * @typedef {Object} PaymentMethod
 * @property {string} providerAlias
 * @property {string} methodAlias
 * @property {string} displayName
 * @property {number} integrationType - 0=Redirect, 10=HostedFields, 20=Widget, 30=DirectForm
 * @property {string} [iconHtml]
 */

/**
 * @typedef {Object} PaymentSession
 * @property {boolean} success
 * @property {string} [errorMessage]
 * @property {string} [invoiceId]
 * @property {string} [redirectUrl]
 * @property {number} [integrationType]
 * @property {string} [adapterUrl]
 * @property {string} [javaScriptSdkUrl]
 * @property {string} [providerAlias]
 * @property {string} [methodAlias]
 */

/**
 * Integration type constants
 */
const IntegrationType = {
    Redirect: 0,
    HostedFields: 10,
    Widget: 20,
    DirectForm: 30
};

/**
 * Initialize the payment selector Alpine.data component
 */
export function initPaymentSelector() {
    // @ts-ignore - Alpine is global
    Alpine.data('paymentSelector', () => ({
        /** @type {PaymentMethod[]} */
        paymentMethods: [],

        /** @type {PaymentMethod[]} */
        cardPaymentMethods: [],

        /** @type {PaymentMethod[]} */
        redirectPaymentMethods: [],

        /** @type {PaymentMethod|null} */
        selectedMethod: null,

        /** @type {string} */
        selectedMethodKey: '',

        /** @type {PaymentSession|null} */
        paymentSession: null,

        /** @type {string|null} */
        invoiceId: null,

        /** @type {boolean} */
        loading: true,

        /** @type {string|null} */
        error: null,

        /**
         * Initialize the component
         */
        async init() {
            await this.loadPaymentMethods();
        },

        /**
         * Load available payment methods
         */
        async loadPaymentMethods() {
            this.loading = true;
            this.error = null;

            try {
                const methods = await checkoutApi.getPaymentMethods();
                this.paymentMethods = methods || [];

                // Separate form-based methods from redirect methods
                const formBasedTypes = [IntegrationType.HostedFields, IntegrationType.DirectForm];
                this.cardPaymentMethods = this.paymentMethods.filter(m => formBasedTypes.includes(m.integrationType));
                this.redirectPaymentMethods = this.paymentMethods.filter(m => !formBasedTypes.includes(m.integrationType));

            } catch (error) {
                console.error('Failed to load payment methods:', error);
                this.error = 'Unable to load payment methods. Please refresh the page.';
            } finally {
                this.loading = false;
            }
        },

        /**
         * Handle payment method selection
         * @param {PaymentMethod} method
         */
        async onMethodChange(method) {
            // Check if same method already selected with active session
            const isSameMethod = this.selectedMethod?.providerAlias === method.providerAlias
                && this.selectedMethod?.methodAlias === method.methodAlias;

            if (isSameMethod && this.paymentSession) {
                return; // Already initialized
            }

            this.selectedMethod = method;
            this.selectedMethodKey = `${method.providerAlias}:${method.methodAlias || ''}`;
            this.error = null;

            // Track analytics
            if (!isSameMethod && window.MerchelloSinglePageAnalytics) {
                window.MerchelloSinglePageAnalytics.trackPaymentSelected(method.displayName);
            }

            if (!isSameMethod) {
                // @ts-ignore - Alpine store
                this.$store.checkout.announce(`Selected ${method.displayName} payment`);
            }

            // Notify parent that payment method changed
            this.$dispatch('payment-method-changed', { method });
        },

        /**
         * Initialize payment form for HostedFields/DirectForm methods
         * @param {PaymentMethod} method
         * @returns {Promise<PaymentSession|null>}
         */
        async initializePaymentForm(method) {
            if (!method) return null;

            // Only initialize form-based payment methods
            if (![IntegrationType.HostedFields, IntegrationType.DirectForm].includes(method.integrationType)) {
                return null;
            }

            try {
                const returnUrl = window.location.origin + '/checkout/return';
                const cancelUrl = window.location.origin + '/checkout/cancel';

                const payData = await checkoutApi.initiatePayment({
                    providerAlias: method.providerAlias,
                    methodAlias: method.methodAlias || null,
                    returnUrl,
                    cancelUrl
                });

                if (payData.success && window.MerchelloPayment) {
                    this.invoiceId = payData.invoiceId;
                    this.paymentSession = payData;

                    // Select container based on integration type
                    let containerId = 'hosted-fields-container';
                    if (payData.integrationType === IntegrationType.DirectForm) {
                        containerId = 'direct-form-container';
                    } else if (payData.integrationType === IntegrationType.Widget) {
                        containerId = 'widget-container';
                    }

                    await window.MerchelloPayment.handlePaymentFlow(payData, {
                        containerId,
                        onReady: () => {
                            // @ts-ignore - Alpine store
                            this.$store.checkout.announce('Payment form ready');
                        },
                        onError: (err) => {
                            console.error('Payment form setup failed:', err);
                            this.error = err.message || 'Failed to load payment form';
                        }
                    });

                    return payData;
                } else if (!payData.success) {
                    console.error('Payment session creation failed:', payData.errorMessage);
                    this.error = payData.errorMessage || 'Failed to initialize payment';
                }

                return null;
            } catch (error) {
                console.error('Failed to initialize payment form:', error);
                this.error = 'Failed to load payment form. Please try again.';
                return null;
            }
        },

        /**
         * Get payment method icon HTML
         * @param {PaymentMethod} method
         * @returns {string}
         */
        getMethodIcon(method) {
            if (window.MerchelloPayment && typeof window.MerchelloPayment.getMethodIcon === 'function') {
                return window.MerchelloPayment.getMethodIcon(method);
            }
            // Fallback card icon
            return '<svg class="w-6 h-5" viewBox="0 0 24 20" fill="currentColor"><rect x="1" y="1" width="22" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="22" height="4" fill="currentColor" opacity="0.3"/></svg>';
        },

        /**
         * Check if the selected method is a redirect type
         * @returns {boolean}
         */
        get isRedirectMethod() {
            return this.selectedMethod?.integrationType === IntegrationType.Redirect;
        },

        /**
         * Check if the selected method needs a form
         * @returns {boolean}
         */
        get needsPaymentForm() {
            if (!this.selectedMethod) return false;
            return [IntegrationType.HostedFields, IntegrationType.DirectForm].includes(this.selectedMethod.integrationType);
        },

        /**
         * Check if we have any payment methods available
         * @returns {boolean}
         */
        get hasPaymentMethods() {
            return this.paymentMethods.length > 0;
        },

        /**
         * Check if payment session matches current method
         * @returns {boolean}
         */
        get sessionMatchesMethod() {
            if (!this.paymentSession || !this.selectedMethod) return false;
            return this.paymentSession.providerAlias === this.selectedMethod.providerAlias
                && this.paymentSession.methodAlias === (this.selectedMethod.methodAlias || null);
        }
    }));
}

export default { initPaymentSelector };
