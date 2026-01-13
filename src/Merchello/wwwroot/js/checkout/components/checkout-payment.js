// @ts-check
/**
 * Merchello Checkout - Payment Selection Component
 *
 * Alpine.js component for displaying and selecting payment methods.
 * Reads payment state from the checkout store and dispatches events on selection.
 */

/**
 * Payment integration types
 * @readonly
 * @enum {number}
 */
export const IntegrationType = Object.freeze({
    Redirect: 0,
    HostedFields: 10,
    Widget: 20,
    DirectForm: 30
});

/**
 * @typedef {Object} PaymentMethod
 * @property {string} providerAlias
 * @property {string} methodAlias
 * @property {string} displayName
 * @property {number} integrationType
 * @property {string} [iconUrl]
 */

/**
 * Initialize the checkout payment Alpine.data component
 */
export function initCheckoutPayment() {
    // @ts-ignore - Alpine is global
    Alpine.data('checkoutPayment', () => ({
        // ============================================
        // Local State
        // ============================================

        /** Track the selected method key for radio binding */
        selectedMethodKey: '',

        // ============================================
        // Computed Properties (from store)
        // ============================================

        /** @returns {PaymentMethod[]} */
        get methods() {
            return this.$store.checkout?.paymentMethods ?? [];
        },

        /** @returns {PaymentMethod|null} */
        get selectedMethod() {
            return this.$store.checkout?.selectedPaymentMethod ?? null;
        },

        /** @returns {boolean} */
        get loading() {
            return this.$store.checkout?.paymentLoading ?? true;
        },

        /** @returns {string|null} */
        get error() {
            return this.$store.checkout?.paymentError ?? null;
        },

        /** @returns {Object|null} */
        get session() {
            return this.$store.checkout?.paymentSession ?? null;
        },

        /**
         * Get card-based payment methods (HostedFields, DirectForm)
         * These render an inline form for card entry
         * @returns {PaymentMethod[]}
         */
        get cardMethods() {
            const formBasedTypes = [IntegrationType.HostedFields, IntegrationType.DirectForm];
            return this.methods.filter(m => formBasedTypes.includes(m.integrationType));
        },

        /**
         * Get redirect payment methods (PayPal, bank transfers, etc.)
         * These redirect to external provider
         * @returns {PaymentMethod[]}
         */
        get redirectMethods() {
            return this.methods.filter(m => m.integrationType === IntegrationType.Redirect);
        },

        /**
         * Get widget-based payment methods (embedded widgets)
         * @returns {PaymentMethod[]}
         */
        get widgetMethods() {
            return this.methods.filter(m => m.integrationType === IntegrationType.Widget);
        },

        /** @returns {boolean} */
        get hasMethods() {
            return this.methods.length > 0;
        },

        /** @returns {boolean} */
        get hasCardMethods() {
            return this.cardMethods.length > 0;
        },

        /** @returns {boolean} */
        get hasRedirectMethods() {
            return this.redirectMethods.length > 0;
        },

        // ============================================
        // Lifecycle
        // ============================================

        init() {
            // Sync selected method key if one is already selected
            if (this.selectedMethod) {
                this.selectedMethodKey = this.getMethodKey(this.selectedMethod);
            }

            // Sync local state when store's selected method changes (e.g., cleared on error)
            this.$watch('$store.checkout.selectedPaymentMethod', (value) => {
                if (value === null) {
                    this.selectedMethodKey = '';
                }
            });
        },

        // ============================================
        // Methods
        // ============================================

        /**
         * Generate a unique key for a payment method
         * @param {PaymentMethod} method
         * @returns {string}
         */
        getMethodKey(method) {
            return `${method.providerAlias}:${method.methodAlias || ''}`;
        },

        /**
         * Select a payment method
         * @param {PaymentMethod} method
         */
        selectMethod(method) {
            this.selectedMethodKey = this.getMethodKey(method);

            // Update store
            this.$store.checkout?.setPaymentMethod(method);

            // Dispatch event for orchestrator
            this.$dispatch('payment-method-changed', { method });
        },

        /**
         * Check if a method is currently selected
         * @param {PaymentMethod} method
         * @returns {boolean}
         */
        isSelected(method) {
            if (!this.selectedMethod) return false;
            return this.selectedMethod.providerAlias === method.providerAlias &&
                   this.selectedMethod.methodAlias === method.methodAlias;
        },

        /**
         * Get the icon HTML for a payment method
         * @param {PaymentMethod} method
         * @returns {string}
         */
        getIcon(method) {
            // Use MerchelloPayment's icon method if available
            if (typeof window !== 'undefined' && window.MerchelloPayment?.getMethodIcon) {
                return window.MerchelloPayment.getMethodIcon(method);
            }
            // Fallback generic card icon
            return getPaymentMethodIcon(method);
        },

        /**
         * Check if the selected method requires a form
         * @returns {boolean}
         */
        requiresForm() {
            if (!this.selectedMethod) return false;
            return [IntegrationType.HostedFields, IntegrationType.DirectForm]
                .includes(this.selectedMethod.integrationType);
        },

        /**
         * Check if email is required before showing payment form
         * @returns {boolean}
         */
        needsEmail() {
            return !this.$store.checkout?.form?.email;
        }
    }));
}

// ============================================
// Standalone Helper Functions
// ============================================

/**
 * Get a generic icon for a payment method (standalone function)
 * @param {PaymentMethod} method
 * @returns {string} SVG HTML string
 */
export function getPaymentMethodIcon(method) {
    // Check MerchelloPayment first
    if (typeof window !== 'undefined' && window.MerchelloPayment?.getMethodIcon) {
        return window.MerchelloPayment.getMethodIcon(method);
    }

    // Generic card icon fallback
    return '<svg class="w-6 h-5" viewBox="0 0 24 20" fill="currentColor"><rect x="1" y="1" width="22" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="22" height="4" fill="currentColor" opacity="0.3"/></svg>';
}

/**
 * Categorize payment methods by integration type (standalone function)
 * @param {PaymentMethod[]} methods
 * @returns {{ card: PaymentMethod[], redirect: PaymentMethod[], widget: PaymentMethod[] }}
 */
export function categorizePaymentMethods(methods) {
    const formBasedTypes = [IntegrationType.HostedFields, IntegrationType.DirectForm];

    return {
        card: methods.filter(m => formBasedTypes.includes(m.integrationType)),
        redirect: methods.filter(m => m.integrationType === IntegrationType.Redirect),
        widget: methods.filter(m => m.integrationType === IntegrationType.Widget)
    };
}

/**
 * Generate a unique key for a payment method (standalone function)
 * @param {PaymentMethod} method
 * @returns {string}
 */
export function getMethodKey(method) {
    return `${method.providerAlias}:${method.methodAlias || ''}`;
}

export default {
    initCheckoutPayment,
    IntegrationType,
    getPaymentMethodIcon,
    categorizePaymentMethods,
    getMethodKey
};
