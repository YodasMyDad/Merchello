/**
 * Merchello API Client - Centralized API service for storefront operations
 *
 * This module provides a single source of truth for all API calls,
 * with consistent error handling, request/response typing, and endpoint management.
 */

const MerchelloApi = {
    // Base URL for all API calls
    baseUrl: '/api/merchello/storefront',

    /**
     * Generic fetch wrapper with consistent error handling
     * @param {string} endpoint - API endpoint (relative to baseUrl)
     * @param {RequestInit} options - Fetch options
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    async request(endpoint, options = {}) {
        try {
            const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errorData.message || `Request failed with status ${response.status}`
                };
            }

            if (response.status === 204) {
                return { success: true };
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            return {
                success: false,
                error: error.message || 'An unexpected error occurred'
            };
        }
    },

    // =========================================================================
    // Basket Operations
    // =========================================================================

    basket: {
        /**
         * Get basket item count and total
         * @returns {Promise<{success: boolean, data?: {itemCount: number, total: number, formattedTotal: string}}>}
         */
        async getCount() {
            return MerchelloApi.request('/basket/count');
        },

        /**
         * Get full basket with all line items
         * @returns {Promise<{success: boolean, data?: StorefrontBasketDto}>}
         */
        async get() {
            return MerchelloApi.request('/basket');
        },

        /**
         * Add item to basket
         * @param {Object} params - Add to basket parameters
         * @param {string} params.productId - Product (variant) ID
         * @param {number} params.quantity - Quantity to add
         * @param {Array<{valueId: string}>} params.addons - Selected addon values
         * @returns {Promise<{success: boolean, data?: BasketOperationResultDto}>}
         */
        async add(params) {
            return MerchelloApi.request('/basket/add', {
                method: 'POST',
                body: JSON.stringify({
                    productId: params.productId,
                    quantity: params.quantity || 1,
                    addons: params.addons || []
                })
            });
        },

        /**
         * Update line item quantity
         * @param {string} lineItemId - Line item ID
         * @param {number} quantity - New quantity
         * @returns {Promise<{success: boolean, data?: BasketOperationResultDto}>}
         */
        async updateQuantity(lineItemId, quantity) {
            return MerchelloApi.request('/basket/update', {
                method: 'POST',
                body: JSON.stringify({ lineItemId, quantity })
            });
        },

        /**
         * Remove item from basket
         * @param {string} lineItemId - Line item ID to remove
         * @returns {Promise<{success: boolean, data?: BasketOperationResultDto}>}
         */
        async remove(lineItemId) {
            return MerchelloApi.request(`/basket/${lineItemId}`, {
                method: 'DELETE'
            });
        },

        /**
         * Check availability for all basket items
         * @param {string} countryCode - Country code
         * @param {string} regionCode - Region code (optional)
         * @returns {Promise<{success: boolean, data?: BasketAvailabilityDto}>}
         */
        async checkAvailability(countryCode, regionCode = null) {
            const params = new URLSearchParams();
            if (countryCode) params.append('countryCode', countryCode);
            if (regionCode) params.append('regionCode', regionCode);
            const query = params.toString();
            return MerchelloApi.request(`/basket/availability${query ? '?' + query : ''}`);
        },

        /**
         * Get estimated shipping for basket
         * @param {string} countryCode - Country code (optional, uses current if not provided)
         * @param {string} regionCode - Region code (optional)
         * @returns {Promise<{success: boolean, data?: EstimatedShippingDto}>}
         */
        async getEstimatedShipping(countryCode = null, regionCode = null) {
            const params = new URLSearchParams();
            if (countryCode) params.append('countryCode', countryCode);
            if (regionCode) params.append('regionCode', regionCode);
            const query = params.toString();
            return MerchelloApi.request(`/basket/estimated-shipping${query ? '?' + query : ''}`);
        }
    },

    // =========================================================================
    // Shipping & Location Operations
    // =========================================================================

    shipping: {
        /**
         * Get available shipping countries and current selection
         * @returns {Promise<{success: boolean, data?: ShippingCountriesDto}>}
         */
        async getCountries() {
            return MerchelloApi.request('/shipping/countries');
        },

        /**
         * Get current shipping country
         * @returns {Promise<{success: boolean, data?: StorefrontCountryDto}>}
         */
        async getCurrentCountry() {
            return MerchelloApi.request('/shipping/country');
        },

        /**
         * Set shipping country (also updates currency)
         * @param {string} countryCode - Country code to set
         * @param {string} regionCode - Region code (optional)
         * @returns {Promise<{success: boolean, data?: SetCountryResultDto}>}
         */
        async setCountry(countryCode, regionCode = null) {
            return MerchelloApi.request('/shipping/country', {
                method: 'POST',
                body: JSON.stringify({ countryCode, regionCode })
            });
        },

        /**
         * Get regions for a country
         * @param {string} countryCode - Country code
         * @returns {Promise<{success: boolean, data?: StorefrontRegionDto[]}>}
         */
        async getRegions(countryCode) {
            return MerchelloApi.request(`/shipping/countries/${countryCode}/regions`);
        }
    },

    // =========================================================================
    // Currency Operations
    // =========================================================================

    currency: {
        /**
         * Get current currency
         * @returns {Promise<{success: boolean, data?: StorefrontCurrencyDto}>}
         */
        async get() {
            return MerchelloApi.request('/currency');
        },

        /**
         * Set currency
         * @param {string} currencyCode - Currency code to set
         * @returns {Promise<{success: boolean, data?: StorefrontCurrencyDto}>}
         */
        async set(currencyCode) {
            return MerchelloApi.request('/currency', {
                method: 'POST',
                body: JSON.stringify({ currencyCode })
            });
        }
    },

    // =========================================================================
    // Product Operations
    // =========================================================================

    products: {
        /**
         * Check product availability for a location
         * @param {string} productId - Product ID
         * @param {Object} options - Availability options
         * @param {string} options.countryCode - Country code
         * @param {string} options.regionCode - Region code (optional)
         * @param {number} options.quantity - Quantity to check (default 1)
         * @returns {Promise<{success: boolean, data?: ProductAvailabilityDto}>}
         */
        async checkAvailability(productId, options = {}) {
            const params = new URLSearchParams();
            if (options.countryCode) params.append('countryCode', options.countryCode);
            if (options.regionCode) params.append('regionCode', options.regionCode);
            if (options.quantity) params.append('quantity', options.quantity.toString());
            const query = params.toString();
            return MerchelloApi.request(`/products/${productId}/availability${query ? '?' + query : ''}`);
        }
    },

    // =========================================================================
    // Upsell Operations
    // =========================================================================

    upsells: {
        /**
         * Get upsell suggestions for the current basket at a specific display location.
         * @param {string} location - Display location: Checkout, Basket, ProductPage, Email, Confirmation
         * @returns {Promise<{success: boolean, data?: UpsellSuggestionDto[]}>}
         */
        async getSuggestions(location) {
            const params = new URLSearchParams({ location });
            return MerchelloApi.request(`/upsells?${params}`);
        },

        /**
         * Get upsell suggestions for a specific product page.
         * @param {string} productId - Product ID
         * @returns {Promise<{success: boolean, data?: UpsellSuggestionDto[]}>}
         */
        async getProductSuggestions(productId) {
            return MerchelloApi.request(`/upsells/product/${productId}`);
        },

        /**
         * Record upsell impression and click events (batch).
         * @param {Array<{upsellRuleId: string, eventType: string, productId?: string, displayLocation: number}>} events
         * @returns {Promise<{success: boolean}>}
         */
        async recordEvents(events) {
            return MerchelloApi.request('/upsells/events', {
                method: 'POST',
                body: JSON.stringify({ events })
            });
        }
    }
};

// Export for ES modules if supported, otherwise attach to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MerchelloApi;
} else {
    window.MerchelloApi = MerchelloApi;
}
