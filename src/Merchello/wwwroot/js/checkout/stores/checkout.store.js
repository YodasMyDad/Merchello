// @ts-check
/**
 * Merchello Checkout Store
 *
 * SINGLE SOURCE OF TRUTH for checkout state.
 * All checkout components access state via this.$store.checkout.
 * Components dispatch events for changes; the main orchestrator handles flow.
 */

import { createAnnouncer } from '../utils/announcer.js';

/**
 * @typedef {Object} BasketState
 * @property {number} total
 * @property {number} shipping
 * @property {number} tax
 * @property {number} subtotal
 * @property {number} discount
 */

/**
 * @typedef {Object} CurrencyState
 * @property {string} code - ISO currency code (e.g., 'GBP')
 * @property {string} symbol - Currency symbol (e.g., '£')
 */

/**
 * @typedef {Object} AddressState
 * @property {string} name
 * @property {string} company
 * @property {string} address1
 * @property {string} address2
 * @property {string} city
 * @property {string} state
 * @property {string} stateCode
 * @property {string} country
 * @property {string} countryCode
 * @property {string} postalCode
 * @property {string} phone
 */

/**
 * @typedef {Object} AppliedDiscount
 * @property {string} id - Discount ID
 * @property {string} name - Display name
 * @property {string|null} code - Discount code (null for automatic discounts)
 * @property {number} amount - Discount amount
 * @property {string} formattedAmount - Formatted display amount
 * @property {boolean} isAutomatic - Whether discount was auto-applied
 */

/**
 * @typedef {Object} ShippingOption
 * @property {string} id
 * @property {string} name
 * @property {number} cost
 * @property {string} formattedCost
 * @property {number} daysFrom
 * @property {number} daysTo
 * @property {boolean} isNextDay
 * @property {string} deliveryDescription
 */

/**
 * @typedef {Object} ShippingGroup
 * @property {string} groupId
 * @property {string} groupName
 * @property {string} warehouseId
 * @property {Array} lineItems
 * @property {ShippingOption[]} shippingOptions
 * @property {string|null} selectedShippingOptionId
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} providerAlias
 * @property {string} methodAlias
 * @property {string} displayName
 * @property {number} integrationType
 * @property {string} iconUrl
 */

/**
 * @typedef {Object} FieldErrors
 * @type {Object.<string, string>}
 */

/**
 * Initialize the checkout store
 *
 * @param {Object} [initialData] - Optional initial data from server
 * @param {Partial<BasketState>} [initialData.basket]
 * @param {Partial<CurrencyState>} [initialData.currency]
 * @param {string} [initialData.email]
 * @param {Partial<AddressState>} [initialData.billing]
 * @param {Partial<AddressState>} [initialData.shipping]
 * @param {boolean} [initialData.shippingSameAsBilling]
 * @param {AppliedDiscount[]} [initialData.appliedDiscounts]
 * @param {ShippingGroup[]} [initialData.shippingGroups]
 * @param {Object.<string, string>} [initialData.shippingSelections]
 * @param {PaymentMethod[]} [initialData.paymentMethods]
 */
export function initCheckoutStore(initialData = {}) {
    const announcer = createAnnouncer();

    // Parse initial shipping selections from groups
    // Note: JSON from Razor uses 'selectedOptionId', not 'selectedShippingOptionId'
    const initialSelections = {};
    if (initialData.shippingGroups) {
        initialData.shippingGroups.forEach(g => {
            if (g.selectedOptionId) {
                initialSelections[g.groupId] = g.selectedOptionId;
            }
        });
    }

    // @ts-ignore - Alpine is global
    Alpine.store('checkout', {
        // ============================================
        // FORM STATE (moved from component)
        // ============================================

        /** @type {Object} */
        form: {
            email: initialData.email ?? '',
            billing: {
                name: '',
                company: '',
                address1: '',
                address2: '',
                city: '',
                state: '',
                stateCode: '',
                country: '',
                countryCode: initialData.billing?.countryCode ?? '',
                postalCode: '',
                phone: '',
                ...initialData.billing
            },
            shipping: {
                name: '',
                company: '',
                address1: '',
                address2: '',
                city: '',
                state: '',
                stateCode: '',
                country: '',
                countryCode: initialData.shipping?.countryCode ?? '',
                postalCode: '',
                phone: '',
                ...initialData.shipping
            },
            sameAsBilling: initialData.shippingSameAsBilling ?? true,
            acceptsMarketing: false,
            password: ''
        },

        // ============================================
        // BASKET STATE
        // ============================================

        /** @type {BasketState} */
        basket: {
            total: initialData.basket?.total ?? 0,
            shipping: initialData.basket?.shipping ?? 0,
            tax: initialData.basket?.tax ?? 0,
            subtotal: initialData.basket?.subtotal ?? 0,
            discount: initialData.basket?.discount ?? 0
        },

        // Tax-inclusive display state
        /** @type {boolean} */
        displayPricesIncTax: initialData.displayPricesIncTax ?? false,
        /** @type {number} */
        taxInclusiveDisplaySubTotal: initialData.taxInclusiveDisplaySubTotal ?? 0,
        /** @type {string} */
        formattedTaxInclusiveDisplaySubTotal: initialData.formattedTaxInclusiveDisplaySubTotal ?? '',
        /** @type {string|null} */
        taxIncludedMessage: initialData.taxIncludedMessage ?? null,

        /** @type {CurrencyState} */
        currency: {
            code: initialData.currency?.code ?? 'GBP',
            symbol: initialData.currency?.symbol ?? '£'
        },

        /** @type {AppliedDiscount[]} */
        appliedDiscounts: initialData.appliedDiscounts ?? [],

        // ============================================
        // SHIPPING STATE
        // ============================================

        /** @type {ShippingGroup[]} */
        shippingGroups: initialData.shippingGroups ?? [],

        /** @type {Object.<string, string>} */
        shippingSelections: { ...initialSelections, ...initialData.shippingSelections },

        /** @type {boolean} */
        shippingLoading: false,

        /** @type {string|null} */
        shippingError: null,

        /** @type {boolean} */
        shippingCalculated: (initialData.shippingGroups?.length ?? 0) > 0,

        /** @type {Array} */
        itemAvailabilityErrors: [],

        /** @type {boolean} */
        allItemsShippable: true,

        // ============================================
        // PAYMENT STATE
        // ============================================

        /** @type {PaymentMethod[]} */
        paymentMethods: initialData.paymentMethods ?? [],

        /** @type {PaymentMethod|null} */
        selectedPaymentMethod: null,

        /** @type {Object|null} */
        paymentSession: null,

        /** @type {boolean} */
        paymentLoading: true,

        /** @type {string|null} */
        paymentError: null,

        /** @type {string|null} */
        invoiceId: null,

        /** @type {boolean} */
        paymentFormInitializing: false,

        // ============================================
        // UI STATE
        // ============================================

        /** @type {boolean} */
        isSubmitting: false,

        /** @type {FieldErrors} */
        errors: {},

        /** @type {string} */
        generalError: '',

        // ============================================
        // COMPUTED GETTERS (as methods)
        // ============================================

        /**
         * Check if shipping can be calculated (has required address fields)
         * @returns {boolean}
         */
        canCalculateShipping() {
            const addr = this.form.sameAsBilling ? this.form.billing : this.form.shipping;
            return !!(addr.countryCode && addr.postalCode && addr.postalCode.length >= 3);
        },

        /**
         * Check if all shipping groups have a selection
         * @returns {boolean}
         */
        allShippingSelected() {
            if (this.shippingGroups.length === 0) return false;
            return this.shippingGroups.every(g =>
                g.shippingOptions.length === 0 || this.shippingSelections[g.groupId]
            );
        },

        /**
         * Get the effective shipping address (billing if same, otherwise shipping)
         * @returns {AddressState}
         */
        getEffectiveShippingAddress() {
            return this.form.sameAsBilling ? this.form.billing : this.form.shipping;
        },

        // ============================================
        // FORM METHODS
        // ============================================

        /**
         * Set a form field using dot notation path
         * @param {string} path - Field path (e.g., 'email', 'billing.name')
         * @param {*} value - The value to set
         */
        setFormField(path, value) {
            const parts = path.split('.');
            if (parts.length === 1) {
                this.form[path] = value;
            } else if (parts.length === 2) {
                const [group, field] = parts;
                if (this.form[group]) {
                    this.form[group][field] = value;
                }
            }

            // Auto-sync shipping from billing if sameAsBilling
            if (path.startsWith('billing.') && this.form.sameAsBilling) {
                const field = path.replace('billing.', '');
                this.form.shipping[field] = value;
            }
        },

        /**
         * Set email address
         * @param {string} email
         */
        setEmail(email) {
            this.form.email = email;
        },

        /**
         * Update billing address
         * @param {Partial<AddressState>} data
         */
        updateBillingAddress(data) {
            Object.assign(this.form.billing, data);

            // Sync to shipping if same as billing
            if (this.form.sameAsBilling) {
                this.syncShippingFromBilling();
            }
        },

        /**
         * Update shipping address
         * @param {Partial<AddressState>} data
         */
        updateShippingAddress(data) {
            Object.assign(this.form.shipping, data);
        },

        /**
         * Sync shipping address from billing
         */
        syncShippingFromBilling() {
            Object.assign(this.form.shipping, this.form.billing);
        },

        /**
         * Set same as billing toggle
         * @param {boolean} value
         */
        setSameAsBilling(value) {
            this.form.sameAsBilling = value;
            if (value) {
                this.syncShippingFromBilling();
            }
        },

        // ============================================
        // BASKET METHODS
        // ============================================

        /**
         * Update basket totals
         * Prefers display currency amounts (displayTotal, etc.) over store currency amounts
         * @param {Object} data - Basket data from API
         */
        updateBasket(data) {
            // Create a new basket object to ensure Alpine's reactivity detects the change
            // Use display currency amounts if available, otherwise fall back to store currency
            this.basket = {
                total: data.displayTotal ?? data.total ?? this.basket.total,
                shipping: data.displayShipping ?? data.shipping ?? this.basket.shipping,
                tax: data.displayTax ?? data.tax ?? this.basket.tax,
                subtotal: data.displaySubTotal ?? data.subtotal ?? this.basket.subtotal,
                discount: data.displayDiscount ?? data.discount ?? this.basket.discount
            };

            // Update applied discounts list (for reactive UI updates)
            if (data.appliedDiscounts !== undefined) {
                this.appliedDiscounts = data.appliedDiscounts ?? [];
            }

            // Update currency if provided
            if (data.displayCurrencyCode || data.displayCurrencySymbol) {
                this.currency = {
                    code: data.displayCurrencyCode ?? this.currency.code,
                    symbol: data.displayCurrencySymbol ?? this.currency.symbol
                };
            }

            // Update tax-inclusive display properties
            if (data.displayPricesIncTax !== undefined) {
                this.displayPricesIncTax = data.displayPricesIncTax;
            }
            if (data.taxInclusiveDisplaySubTotal !== undefined) {
                this.taxInclusiveDisplaySubTotal = data.taxInclusiveDisplaySubTotal;
                this.formattedTaxInclusiveDisplaySubTotal = data.formattedTaxInclusiveDisplaySubTotal ?? '';
            }
            if (data.taxIncludedMessage !== undefined) {
                this.taxIncludedMessage = data.taxIncludedMessage;
            }
        },

        /**
         * Update currency settings
         * @param {Partial<CurrencyState>} data
         */
        updateCurrency(data) {
            if (data.code) this.currency.code = data.code;
            if (data.symbol) this.currency.symbol = data.symbol;
        },

        /**
         * Format a value as currency
         * @param {number} value
         * @returns {string}
         */
        formatCurrency(value) {
            if (typeof value !== 'number' || isNaN(value)) {
                return `${this.currency.symbol}0.00`;
            }
            return `${this.currency.symbol}${value.toFixed(2)}`;
        },

        // ============================================
        // SHIPPING METHODS
        // ============================================

        /**
         * Update shipping groups and selections
         * @param {ShippingGroup[]} groups
         * @param {Object.<string, string>} [selections]
         */
        updateShipping(groups, selections) {
            this.shippingGroups = groups;
            if (selections) {
                this.shippingSelections = selections;
            }
            this.shippingCalculated = groups.length > 0;
        },

        /**
         * Set shipping selection for a group
         * @param {string} groupId
         * @param {string} optionId
         */
        setShippingSelection(groupId, optionId) {
            this.shippingSelections = {
                ...this.shippingSelections,
                [groupId]: optionId
            };
        },

        /**
         * Set shipping loading state
         * @param {boolean} loading
         */
        setShippingLoading(loading) {
            this.shippingLoading = loading;
        },

        /**
         * Set shipping error
         * @param {string|null} error
         */
        setShippingError(error) {
            this.shippingError = error;
            if (error) {
                announcer.announceError(error);
            }
        },

        // ============================================
        // PAYMENT METHODS
        // ============================================

        /**
         * Set available payment methods
         * @param {PaymentMethod[]} methods
         */
        setPaymentMethods(methods) {
            this.paymentMethods = methods;
        },

        /**
         * Set the selected payment method
         * @param {PaymentMethod|null} method
         */
        setPaymentMethod(method) {
            this.selectedPaymentMethod = method;
        },

        /**
         * Set payment session
         * @param {Object|null} session
         */
        setPaymentSession(session) {
            this.paymentSession = session;
            if (session?.invoiceId) {
                this.invoiceId = session.invoiceId;
            }
        },

        /**
         * Set payment loading state
         * @param {boolean} loading
         */
        setPaymentLoading(loading) {
            this.paymentLoading = loading;
        },

        /**
         * Set payment error
         * @param {string|null} error
         */
        setPaymentError(error) {
            this.paymentError = error;
            if (error) {
                announcer.announceError(error);
            }
        },

        /**
         * Set payment form initializing state (for skeleton loader)
         * @param {boolean} initializing
         */
        setPaymentFormInitializing(initializing) {
            this.paymentFormInitializing = initializing;
        },

        // ============================================
        // ERROR METHODS
        // ============================================

        /**
         * Set an error for a specific field
         * @param {string} field - Field path (e.g., 'email', 'billing.name')
         * @param {string} message - Error message
         */
        setError(field, message) {
            this.errors = { ...this.errors, [field]: message };
        },

        /**
         * Clear error for a specific field
         * @param {string} field
         */
        clearError(field) {
            const { [field]: _, ...rest } = this.errors;
            this.errors = rest;
        },

        /**
         * Clear all field errors
         */
        clearAllErrors() {
            this.errors = {};
            this.generalError = '';
        },

        /**
         * Set a general error message
         * @param {string} message
         */
        setGeneralError(message) {
            this.generalError = message;
            if (message) {
                announcer.announceError(message);
            }
        },

        /**
         * Clear the general error
         */
        clearGeneralError() {
            this.generalError = '';
        },

        // ============================================
        // UI STATE METHODS
        // ============================================

        /**
         * Set the submitting state
         * @param {boolean} value
         */
        setSubmitting(value) {
            this.isSubmitting = value;
        },

        /**
         * Announce a message to screen readers
         * @param {string} message
         */
        announce(message) {
            announcer.announce(message);
        }
    });
}

/**
 * Get the checkout store
 * @returns {ReturnType<typeof initCheckoutStore> extends void ? any : never}
 */
export function getCheckoutStore() {
    // @ts-ignore - Alpine is global
    return Alpine.store('checkout');
}

export default { initCheckoutStore, getCheckoutStore };
