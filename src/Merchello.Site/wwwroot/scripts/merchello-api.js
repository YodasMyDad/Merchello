/**
 * Merchello API Client - Storefront API contracts used by the sample site.
 *
 * DTO names and field names below are aligned with backend contracts in:
 * - src/Merchello.Core/Storefront/Dtos
 * - src/Merchello.Core/Shared/Dtos
 */

/**
 * @template T
 * @typedef {Object} ApiResult
 * @property {boolean} success
 * @property {T} [data]
 * @property {string} [error]
 */

/**
 * @typedef {Object} AddonSelectionDto
 * @property {string} optionId
 * @property {string} valueId
 */

/**
 * @typedef {Object} BasketCountDto
 * @property {number} itemCount
 * @property {number} total
 * @property {string} formattedTotal
 */

/**
 * @typedef {Object} BasketOperationResultDto
 * @property {boolean} success
 * @property {string} [message]
 * @property {number} itemCount
 * @property {number} total
 * @property {string} [formattedTotal]
 */

/**
 * @typedef {Object} SelectedOptionDto
 * @property {string} optionName
 * @property {string} valueName
 */

/**
 * @typedef {Object} StorefrontLineItemDto
 * @property {string} id
 * @property {string} sku
 * @property {string} name
 * @property {string} productRootName
 * @property {SelectedOptionDto[]} selectedOptions
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} lineTotal
 * @property {string} formattedUnitPrice
 * @property {string} formattedLineTotal
 * @property {number} displayUnitPrice
 * @property {number} displayLineTotal
 * @property {string} formattedDisplayUnitPrice
 * @property {string} formattedDisplayLineTotal
 * @property {number} displayUnitPriceWithAddons
 * @property {number} displayLineTotalWithAddons
 * @property {string} formattedDisplayUnitPriceWithAddons
 * @property {string} formattedDisplayLineTotalWithAddons
 * @property {number} taxRate
 * @property {boolean} isTaxable
 * @property {string} lineItemType
 * @property {string | null} dependentLineItemSku
 * @property {string | null} parentLineItemId
 */

/**
 * @typedef {Object} BasketItemAvailabilityDto
 * @property {boolean} canShipToLocation
 * @property {boolean} hasStock
 * @property {string} [message]
 */

/**
 * @typedef {Object} StorefrontBasketDto
 * @property {StorefrontLineItemDto[]} items
 * @property {number} subTotal
 * @property {number} discount
 * @property {number} tax
 * @property {number} shipping
 * @property {number} total
 * @property {boolean} isTaxEstimated
 * @property {string} [taxEstimationReason]
 * @property {string} formattedSubTotal
 * @property {string} formattedDiscount
 * @property {string} formattedTax
 * @property {string} formattedTotal
 * @property {string} currencySymbol
 * @property {number} displaySubTotal
 * @property {number} displayDiscount
 * @property {number} displayTax
 * @property {number} displayShipping
 * @property {number} displayTotal
 * @property {string} formattedDisplaySubTotal
 * @property {string} formattedDisplayDiscount
 * @property {string} formattedDisplayTax
 * @property {string} formattedDisplayShipping
 * @property {string} formattedDisplayTotal
 * @property {string} displayCurrencyCode
 * @property {string} displayCurrencySymbol
 * @property {number} exchangeRate
 * @property {boolean} displayPricesIncTax
 * @property {number} taxInclusiveDisplaySubTotal
 * @property {string} formattedTaxInclusiveDisplaySubTotal
 * @property {number} taxInclusiveDisplayShipping
 * @property {string} formattedTaxInclusiveDisplayShipping
 * @property {number} taxInclusiveDisplayDiscount
 * @property {string} formattedTaxInclusiveDisplayDiscount
 * @property {string} [taxIncludedMessage]
 * @property {number} itemCount
 * @property {boolean} isEmpty
 * @property {boolean} allItemsAvailable
 * @property {Object.<string, BasketItemAvailabilityDto>} itemAvailability
 */

/**
 * @typedef {Object} CountryDto
 * @property {string} code
 * @property {string} name
 */

/**
 * @typedef {Object} StorefrontCurrencyDto
 * @property {string} currencyCode
 * @property {string} currencySymbol
 * @property {number} decimalPlaces
 */

/**
 * @typedef {Object} ShippingCountriesDto
 * @property {CountryDto[]} countries
 * @property {CountryDto} current
 * @property {string} [currentRegionCode]
 * @property {string} [currentRegionName]
 * @property {StorefrontCurrencyDto} currency
 */

/**
 * @typedef {Object} SetCountryResultDto
 * @property {string} countryCode
 * @property {string} countryName
 * @property {string} currencyCode
 * @property {string} currencySymbol
 */

/**
 * @typedef {Object} StorefrontContextDto
 * @property {CountryDto} country
 * @property {string} [regionCode]
 * @property {string} [regionName]
 * @property {StorefrontCurrencyDto} currency
 * @property {BasketCountDto} basket
 */

/**
 * @typedef {Object} RegionDto
 * @property {string} countryCode
 * @property {string} regionCode
 * @property {string} name
 */

/**
 * @typedef {Object} BasketItemAvailabilityDetailDto
 * @property {string} lineItemId
 * @property {string} productId
 * @property {boolean} canShipToLocation
 * @property {boolean} hasStock
 * @property {string} [message]
 */

/**
 * @typedef {Object} BasketAvailabilityDto
 * @property {boolean} allItemsAvailable
 * @property {BasketItemAvailabilityDetailDto[]} items
 */

/**
 * @typedef {Object} ProductAvailabilityDto
 * @property {boolean} canShipToLocation
 * @property {boolean} hasStock
 * @property {number} availableStock
 * @property {string} [message]
 * @property {boolean} showStockLevels
 */

/**
 * @typedef {Object} EstimatedShippingDto
 * @property {boolean} success
 * @property {number} estimatedShipping
 * @property {string} formattedEstimatedShipping
 * @property {number} displayEstimatedShipping
 * @property {string} formattedDisplayEstimatedShipping
 * @property {number} displayTotal
 * @property {string} formattedDisplayTotal
 * @property {number} displayTax
 * @property {string} formattedDisplayTax
 * @property {boolean} displayPricesIncTax
 * @property {number} taxInclusiveDisplaySubTotal
 * @property {string} formattedTaxInclusiveDisplaySubTotal
 * @property {number} taxInclusiveDisplayShipping
 * @property {string} formattedTaxInclusiveDisplayShipping
 * @property {number} taxInclusiveDisplayDiscount
 * @property {string} formattedTaxInclusiveDisplayDiscount
 * @property {string} [taxIncludedMessage]
 * @property {number} groupCount
 * @property {string} [message]
 */

const MerchelloApi = {
    // Base URL for all API calls
    baseUrl: '/api/merchello/storefront',

    /**
     * Generic fetch wrapper with consistent error handling
     * @param {string} endpoint - API endpoint (relative to baseUrl)
     * @param {RequestInit} options - Fetch options
     * @returns {Promise<ApiResult<any>>}
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
         * @returns {Promise<ApiResult<BasketCountDto>>}
         */
        async getCount() {
            return MerchelloApi.request('/basket/count');
        },

        /**
         * Get full basket with all line items
         * @param {{includeAvailability?: boolean, countryCode?: string, regionCode?: string}} [options]
         * @returns {Promise<ApiResult<StorefrontBasketDto>>}
         */
        async get(options = {}) {
            const params = new URLSearchParams();
            if (options.includeAvailability) params.append('includeAvailability', 'true');
            if (options.countryCode) params.append('countryCode', options.countryCode);
            if (options.regionCode) params.append('regionCode', options.regionCode);
            const query = params.toString();
            return MerchelloApi.request(`/basket${query ? '?' + query : ''}`);
        },

        /**
         * Add item to basket
         * @param {Object} params - Add-to-basket payload
         * @param {string} params.productId - Product (variant) ID
         * @param {number} params.quantity - Quantity to add
         * @param {AddonSelectionDto[]} params.addons - Selected add-ons
         * @returns {Promise<ApiResult<BasketOperationResultDto>>}
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
         * @returns {Promise<ApiResult<BasketOperationResultDto>>}
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
         * @returns {Promise<ApiResult<BasketOperationResultDto>>}
         */
        async remove(lineItemId) {
            return MerchelloApi.request(`/basket/${lineItemId}`, {
                method: 'DELETE'
            });
        },

        /**
         * Clear the current basket
         * @returns {Promise<ApiResult<BasketOperationResultDto>>}
         */
        async clear() {
            return MerchelloApi.request('/basket/clear', {
                method: 'POST'
            });
        },

        /**
         * Check availability for all basket items
         * @param {string} countryCode - Country code
         * @param {string} regionCode - Region code (optional)
         * @returns {Promise<ApiResult<BasketAvailabilityDto>>}
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
         * @returns {Promise<ApiResult<EstimatedShippingDto>>}
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
         * @returns {Promise<ApiResult<ShippingCountriesDto>>}
         */
        async getCountries() {
            return MerchelloApi.request('/shipping/countries');
        },

        /**
         * Get current shipping country
         * @returns {Promise<ApiResult<CountryDto>>}
         */
        async getCurrentCountry() {
            return MerchelloApi.request('/shipping/country');
        },

        /**
         * Set shipping country (also updates currency)
         * @param {string} countryCode - Country code to set
         * @param {string} regionCode - Region code (optional)
         * @returns {Promise<ApiResult<SetCountryResultDto>>}
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
         * @returns {Promise<ApiResult<RegionDto[]>>}
         */
        async getRegions(countryCode) {
            return MerchelloApi.request(`/shipping/countries/${countryCode}/regions`);
        }
    },

    // =========================================================================
    // Bootstrap Context (Headless Convenience)
    // =========================================================================

    context: {
        /**
         * Get location + currency + basket summary in one call.
         * @returns {Promise<ApiResult<StorefrontContextDto>>}
         */
        async get() {
            return MerchelloApi.request('/context');
        }
    },

    // =========================================================================
    // Currency Operations
    // =========================================================================

    currency: {
        /**
         * Get current currency
         * @returns {Promise<ApiResult<StorefrontCurrencyDto>>}
         */
        async get() {
            return MerchelloApi.request('/currency');
        },

        /**
         * Set currency
         * @param {string} currencyCode - Currency code to set
         * @returns {Promise<ApiResult<StorefrontCurrencyDto>>}
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
         * @returns {Promise<ApiResult<ProductAvailabilityDto>>}
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
         * @param {{countryCode?: string, regionCode?: string}} [options] - Optional location override
         * @returns {Promise<ApiResult<UpsellSuggestionDto[]>>}
         */
        async getSuggestions(location, options = {}) {
            const params = new URLSearchParams({ location });
            if (options.countryCode) {
                params.append('countryCode', options.countryCode);
            }
            if (options.regionCode) {
                params.append('regionCode', options.regionCode);
            }
            return MerchelloApi.request(`/upsells?${params}`);
        },

        /**
         * Get upsell suggestions for a specific product page.
         * @param {string} productId - Product ID
         * @returns {Promise<ApiResult<UpsellSuggestionDto[]>>}
         */
        async getProductSuggestions(productId) {
            return MerchelloApi.request(`/upsells/product/${productId}`);
        },

        /**
         * Record upsell impression and click events (batch).
         * @param {Array<{upsellRuleId: string, eventType: string, productId?: string, displayLocation: number}>} events
         * @returns {Promise<ApiResult<void>>}
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
