// @ts-check
/**
 * Merchello Checkout API Service
 * Centralized API calls for the checkout flow.
 *
 * All checkout API endpoints are consolidated here for:
 * - Consistent error handling
 * - Type documentation via JSDoc
 * - Easy testing and mocking
 */

const BASE_URL = '/api/merchello/checkout';

/**
 * @typedef {Object} BasketTotals
 * @property {number} total
 * @property {number} shipping
 * @property {number} tax
 * @property {number} subtotal
 * @property {number} discount
 * @property {number} [displayTotal] - Total in display currency
 * @property {number} [displayShipping] - Shipping in display currency
 * @property {number} [displayTax] - Tax in display currency
 * @property {number} [displaySubTotal] - Subtotal in display currency
 * @property {number} [displayDiscount] - Discount in display currency
 */

/**
 * @typedef {Object} AddressFields
 * @property {string} name
 * @property {string} [company]
 * @property {string} address1
 * @property {string} [address2]
 * @property {string} city
 * @property {string} [state]
 * @property {string} [stateCode]
 * @property {string} countryCode
 * @property {string} [country]
 * @property {string} postalCode
 * @property {string} [phone]
 */

/**
 * @typedef {Object} ShippingOption
 * @property {string} id
 * @property {string} name
 * @property {string} deliveryDescription
 * @property {string} formattedCost
 * @property {number} cost
 * @property {boolean} isNextDay
 */

/**
 * @typedef {Object} ShippingGroup
 * @property {string} groupId
 * @property {string} groupName
 * @property {Array<{name: string, quantity: number, formattedAmount: string}>} lineItems
 * @property {ShippingOption[]} shippingOptions
 * @property {string|null} selectedShippingOptionId
 */

/**
 * @typedef {Object} BasketError
 * @property {string} message
 * @property {boolean} isShippingError
 */

/**
 * @typedef {Object} Region
 * @property {string} code
 * @property {string} name
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} providerAlias
 * @property {string} methodAlias
 * @property {string} displayName
 * @property {number} integrationType
 * @property {string} [iconHtml]
 */

/**
 * Fetch wrapper with consistent error handling
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });

    const data = await response.json();

    // API returns success flag - let caller handle failures
    return data;
}

/**
 * Checkout API service
 */
export const checkoutApi = {
    /**
     * Initialize checkout - calculate shipping and auto-select options
     * @param {Object} data
     * @param {string} data.countryCode
     * @param {string} [data.stateCode]
     * @param {boolean} [data.autoSelectCheapestShipping]
     * @param {string} [data.email]
     * @param {Object.<string, string>} [data.previousShippingSelections] - Previous shipping selections to restore (groupId -> optionId)
     * @returns {Promise<{success: boolean, message?: string, basket?: BasketTotals & {errors?: BasketError[]}, shippingGroups?: ShippingGroup[]}>}
     */
    initialize(data) {
        return fetchJson(`${BASE_URL}/initialize`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * Save billing and shipping addresses
     * @param {Object} data
     * @param {string} data.email
     * @param {AddressFields} data.billingAddress
     * @param {AddressFields} data.shippingAddress
     * @param {boolean} data.shippingSameAsBilling
     * @param {boolean} [data.acceptsMarketing]
     * @param {string} [data.password]
     * @returns {Promise<{success: boolean, message?: string, basket?: BasketTotals}>}
     */
    saveAddresses(data) {
        return fetchJson(`${BASE_URL}/addresses`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * Save shipping selections
     * @param {Object.<string, string>} selections - Map of groupId to shippingOptionId
     * @returns {Promise<{success: boolean, message?: string, basket?: BasketTotals}>}
     */
    saveShipping(selections) {
        return fetchJson(`${BASE_URL}/shipping`, {
            method: 'POST',
            body: JSON.stringify({ selections })
        });
    },

    /**
     * Get regions for a country (billing or shipping)
     * @param {'billing'|'shipping'} addressType
     * @param {string} countryCode
     * @returns {Promise<Region[]>}
     */
    async getRegions(addressType, countryCode) {
        const response = await fetch(`${BASE_URL}/${addressType}/regions/${countryCode}`);
        if (!response.ok) throw new Error('Failed to load regions');
        return response.json();
    },

    /**
     * Apply a discount code
     * @param {string} code
     * @returns {Promise<{success: boolean, message?: string, discountAmount?: number, basket?: BasketTotals}>}
     */
    applyDiscount(code) {
        return fetchJson(`${BASE_URL}/discount/apply`, {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    },

    /**
     * Remove a discount
     * @param {string} discountId
     * @returns {Promise<{success: boolean, message?: string, basket?: BasketTotals}>}
     */
    removeDiscount(discountId) {
        return fetchJson(`${BASE_URL}/discount/${discountId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Capture email for abandoned checkout tracking
     * @param {string} email
     * @returns {Promise<{success: boolean}>}
     */
    captureEmail(email) {
        return fetchJson(`${BASE_URL}/capture-email`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    /**
     * Capture address data for auto-save during checkout.
     * Call this on address field blur to persist data across sessions.
     * @param {Object} data
     * @param {string} [data.email]
     * @param {Partial<AddressFields>} [data.billingAddress]
     * @param {Partial<AddressFields>} [data.shippingAddress]
     * @param {boolean} [data.shippingSameAsBilling]
     * @returns {Promise<{success: boolean}>}
     */
    captureAddress(data) {
        return fetchJson(`${BASE_URL}/capture-address`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * Check if an email has an existing account
     * @param {string} email
     * @returns {Promise<{hasExistingAccount: boolean}>}
     */
    checkEmail(email) {
        return fetchJson(`${BASE_URL}/check-email`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    /**
     * Validate password against requirements
     * @param {string} password
     * @returns {Promise<{isValid: boolean, errors: string[]}>}
     */
    validatePassword(password) {
        return fetchJson(`${BASE_URL}/validate-password`, {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    },

    /**
     * Sign in with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{success: boolean, errorMessage?: string, showForgotPassword?: boolean}>}
     */
    signIn(email, password) {
        return fetchJson(`${BASE_URL}/sign-in`, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    /**
     * Request a password reset email
     * @param {string} email
     * @returns {Promise<{success: boolean, message: string}>}
     */
    forgotPassword(email) {
        return fetchJson(`${BASE_URL}/forgot-password`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    /**
     * Get available payment methods
     * @returns {Promise<PaymentMethod[]>}
     */
    async getPaymentMethods() {
        const response = await fetch(`${BASE_URL}/payment-methods`);
        if (!response.ok) throw new Error('Failed to load payment methods');
        return response.json();
    },

    /**
     * Initiate payment
     * @param {Object} data
     * @param {string} data.providerAlias
     * @param {string} [data.methodAlias]
     * @param {string} data.returnUrl
     * @param {string} data.cancelUrl
     * @returns {Promise<{success: boolean, errorMessage?: string, invoiceId?: string, redirectUrl?: string, integrationType?: number, adapterUrl?: string, javaScriptSdkUrl?: string, providerAlias?: string, methodAlias?: string}>}
     */
    initiatePayment(data) {
        return fetchJson(`${BASE_URL}/pay`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

export default checkoutApi;
