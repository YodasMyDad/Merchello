// @ts-check
/**
 * Merchello Checkout Store
 *
 * Shared state management for checkout components using Alpine.store().
 * Replaces custom DOM events with a centralized reactive store.
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
 * Initialize the checkout store
 *
 * @param {Object} [initialData] - Optional initial data from server
 * @param {Partial<BasketState>} [initialData.basket]
 * @param {Partial<CurrencyState>} [initialData.currency]
 * @param {string} [initialData.email]
 * @param {Partial<AddressState>} [initialData.billing]
 * @param {Partial<AddressState>} [initialData.shipping]
 * @param {boolean} [initialData.shippingSameAsBilling]
 */
export function initCheckoutStore(initialData = {}) {
    const announcer = createAnnouncer();

    // @ts-ignore - Alpine is global
    Alpine.store('checkout', {
        // ============================================
        // Basket State
        // ============================================

        /** @type {BasketState} */
        basket: {
            total: initialData.basket?.total ?? 0,
            shipping: initialData.basket?.shipping ?? 0,
            tax: initialData.basket?.tax ?? 0,
            subtotal: initialData.basket?.subtotal ?? 0,
            discount: initialData.basket?.discount ?? 0
        },

        /** @type {CurrencyState} */
        currency: {
            code: initialData.currency?.code ?? 'GBP',
            symbol: initialData.currency?.symbol ?? '£'
        },

        // ============================================
        // Form State
        // ============================================

        /** @type {string} */
        email: initialData.email ?? '',

        /** @type {boolean} */
        shippingSameAsBilling: initialData.shippingSameAsBilling ?? true,

        /** @type {AddressState} */
        billingAddress: {
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

        /** @type {AddressState} */
        shippingAddress: {
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

        // ============================================
        // UI State
        // ============================================

        /** @type {boolean} */
        isSubmitting: false,

        /** @type {string} */
        generalError: '',

        /** @type {boolean} */
        shippingCalculated: false,

        // ============================================
        // Methods
        // ============================================

        /**
         * Update basket totals
         * @param {Partial<BasketState>} data
         */
        updateBasket(data) {
            // Create a new basket object to ensure Alpine's reactivity detects the change
            this.basket = {
                total: data.total !== undefined ? data.total : this.basket.total,
                shipping: data.shipping !== undefined ? data.shipping : this.basket.shipping,
                tax: data.tax !== undefined ? data.tax : this.basket.tax,
                subtotal: data.subtotal !== undefined ? data.subtotal : this.basket.subtotal,
                discount: data.discount !== undefined ? data.discount : this.basket.discount
            };
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
         * Set email address
         * @param {string} email
         */
        setEmail(email) {
            this.email = email;
        },

        /**
         * Update billing address
         * @param {Partial<AddressState>} data
         */
        updateBillingAddress(data) {
            Object.assign(this.billingAddress, data);

            // Sync to shipping if same as billing
            if (this.shippingSameAsBilling) {
                this.syncShippingFromBilling();
            }
        },

        /**
         * Update shipping address
         * @param {Partial<AddressState>} data
         */
        updateShippingAddress(data) {
            Object.assign(this.shippingAddress, data);
        },

        /**
         * Sync shipping address from billing
         */
        syncShippingFromBilling() {
            Object.assign(this.shippingAddress, this.billingAddress);
        },

        /**
         * Get the effective shipping address (billing if same, otherwise shipping)
         * @returns {AddressState}
         */
        getEffectiveShippingAddress() {
            return this.shippingSameAsBilling ? this.billingAddress : this.shippingAddress;
        },

        /**
         * Format a value as currency
         * @param {number} value
         * @returns {string}
         */
        formatCurrency(value) {
            return `${this.currency.symbol}${value.toFixed(2)}`;
        },

        /**
         * Set the submitting state
         * @param {boolean} value
         */
        setSubmitting(value) {
            this.isSubmitting = value;
        },

        /**
         * Set a general error message
         * @param {string} message
         */
        setError(message) {
            this.generalError = message;
            if (message) {
                announcer.announceError(message);
            }
        },

        /**
         * Clear the general error
         */
        clearError() {
            this.generalError = '';
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
