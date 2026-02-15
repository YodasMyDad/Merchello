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
 * @property {boolean} [supportsVaulting]
 */

/**
 * @typedef {Object} SavedPaymentMethod
 * @property {string} id
 * @property {string} providerAlias
 * @property {string} methodType
 * @property {string} [cardBrand]
 * @property {string} [last4]
 * @property {string} [expiryFormatted]
 * @property {boolean} isExpired
 * @property {string} displayLabel
 * @property {boolean} isDefault
 * @property {string} [iconHtml]
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
        // Saved Payment Methods (from store)
        // ============================================

        /** @returns {SavedPaymentMethod[]} */
        get savedMethods() {
            return this.$store.checkout?.savedPaymentMethods ?? [];
        },

        /** @returns {boolean} */
        get hasSavedMethods() {
            return this.savedMethods.length > 0;
        },

        /** @returns {SavedPaymentMethod|null} */
        get selectedSavedMethod() {
            return this.$store.checkout?.selectedSavedMethod ?? null;
        },

        /** @returns {boolean} */
        get isUsingSavedMethod() {
            return this.selectedSavedMethod !== null;
        },

        /** @returns {boolean} */
        get canSavePaymentMethod() {
            return this.$store.checkout?.canSavePaymentMethods === true &&
                   this.selectedMethod?.supportsVaulting === true &&
                   !this.isUsingSavedMethod;
        },

        /** @returns {boolean} */
        get savePaymentMethod() {
            return this.$store.checkout?.savePaymentMethod ?? false;
        },

        /** @returns {boolean} */
        get setAsDefaultMethod() {
            return this.$store.checkout?.setAsDefaultMethod ?? false;
        },

        /**
         * Get non-expired saved methods grouped by provider
         * @returns {SavedPaymentMethod[]}
         */
        get validSavedMethods() {
            return this.savedMethods.filter(m => !m.isExpired);
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
        },

        // ============================================
        // Saved Payment Methods
        // ============================================

        /**
         * Select a saved payment method
         * @param {SavedPaymentMethod} method
         */
        selectSavedMethod(method) {
            this.selectedMethodKey = `saved:${method.id}`;
            this.$store.checkout?.selectSavedMethod(method);

            // Dispatch event for orchestrator
            this.$dispatch('saved-payment-method-selected', { method });
        },

        /**
         * Clear saved method selection (switch to new payment)
         */
        clearSavedMethod() {
            this.$store.checkout?.selectSavedMethod(null);
        },

        /**
         * Check if a saved method is currently selected
         * @param {SavedPaymentMethod} method
         * @returns {boolean}
         */
        isSavedMethodSelected(method) {
            return this.selectedSavedMethod?.id === method.id;
        },

        /**
         * Toggle save payment method checkbox
         * @param {boolean} save
         */
        toggleSavePaymentMethod(save) {
            this.$store.checkout?.setSavePaymentMethod(save);
        },

        /**
         * Toggle set as default checkbox
         * @param {boolean} setDefault
         */
        toggleSetAsDefault(setDefault) {
            this.$store.checkout?.setAsDefault(setDefault);
        },

        /**
         * Get icon for a saved payment method
         * @param {SavedPaymentMethod} method
         * @returns {string}
         */
        getSavedMethodIcon(method) {
            if (method.iconHtml) {
                return method.iconHtml;
            }
            // Fallback based on method type
            return getSavedMethodIcon(method);
        }
    }));
}

/**
 * Get icon HTML for a saved payment method
 * @param {SavedPaymentMethod} method
 * @returns {string}
 */
export function getSavedMethodIcon(method) {
    // Card brand specific icons
    if (method.methodType === 'Card' && method.cardBrand) {
        const brand = method.cardBrand.toLowerCase();
        switch (brand) {
            case 'visa':
                return '<svg class="w-8 h-5" viewBox="0 0 32 20"><rect fill="#1A1F71" width="32" height="20" rx="2"/><text x="16" y="13" font-size="8" fill="white" text-anchor="middle" font-weight="bold">VISA</text></svg>';
            case 'mastercard':
                return '<svg class="w-8 h-5" viewBox="0 0 32 20"><rect fill="#000" width="32" height="20" rx="2"/><circle cx="12" cy="10" r="6" fill="#EB001B"/><circle cx="20" cy="10" r="6" fill="#F79E1B"/></svg>';
            case 'amex':
            case 'american_express':
                return '<svg class="w-8 h-5" viewBox="0 0 32 20"><rect fill="#006FCF" width="32" height="20" rx="2"/><text x="16" y="13" font-size="6" fill="white" text-anchor="middle" font-weight="bold">AMEX</text></svg>';
            default:
                // Generic card icon
                return '<svg class="w-6 h-5" viewBox="0 0 24 20" fill="currentColor"><rect x="1" y="1" width="22" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="22" height="4" fill="currentColor" opacity="0.3"/></svg>';
        }
    }

    // PayPal
    if (method.methodType === 'PayPal') {
        return '<svg class="w-8 h-5" viewBox="0 0 32 20"><rect fill="#003087" width="32" height="20" rx="2"/><text x="16" y="13" font-size="6" fill="white" text-anchor="middle" font-weight="bold">PayPal</text></svg>';
    }

    // Bank account
    if (method.methodType === 'BankAccount') {
        return '<svg class="w-6 h-5" viewBox="0 0 24 20" fill="currentColor"><path d="M12 2L2 7v2h20V7L12 2zm-8 5l8-4 8 4H4zm-2 4h20v2H2v-2zm2 4h4v5H4v-5zm6 0h4v5h-4v-5zm6 0h4v5h-4v-5z"/></svg>';
    }

    // Generic fallback
    return '<svg class="w-6 h-5" viewBox="0 0 24 20" fill="currentColor"><rect x="1" y="1" width="22" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
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

/**
 * Get inline style for a payment method (standalone function)
 * @param {PaymentMethod} method
 * @param {boolean} isSelected - Whether the method is currently selected
 * @returns {string} CSS inline style string
 */
export function getPaymentMethodStyle(method, isSelected = false) {
    // Check MerchelloPayment first
    if (typeof window !== 'undefined' && window.MerchelloPayment?.getMethodStyle) {
        return window.MerchelloPayment.getMethodStyle(method, isSelected);
    }

    // No custom style
    return '';
}

export default {
    initCheckoutPayment,
    IntegrationType,
    getPaymentMethodIcon,
    getPaymentMethodStyle,
    categorizePaymentMethods,
    getMethodKey,
    getSavedMethodIcon
};
