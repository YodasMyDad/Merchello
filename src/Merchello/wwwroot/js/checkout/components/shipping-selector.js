// @ts-check
/**
 * Merchello Checkout - Shipping Selector Component
 *
 * Handles shipping option selection for one or more warehouse groups.
 */

import { checkoutApi } from '../services/api.js';

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
 * Initialize the shipping selector Alpine.data component
 */
export function initShippingSelector() {
    // @ts-ignore - Alpine is global
    Alpine.data('shippingSelector', (initialGroups = [], initialSelections = {}) => ({
        /** @type {ShippingGroup[]} */
        shippingGroups: initialGroups,

        /** @type {Object.<string, string>} */
        shippingSelections: { ...initialSelections },

        /** @type {boolean} */
        loading: false,

        /** @type {string|null} */
        error: null,

        /** @type {BasketError[]} */
        itemAvailabilityErrors: [],

        /** @type {boolean} */
        allItemsShippable: true,

        /** @type {boolean} */
        _calculated: initialGroups.length > 0,

        /**
         * Initialize the component
         */
        init() {
            // Sort initial shipping options
            if (this.shippingGroups.length > 0) {
                this.sortShippingOptions();
            }
        },

        /**
         * Calculate shipping for an address
         * @param {string} countryCode
         * @param {string} [stateCode]
         * @param {string} [email]
         * @returns {Promise<boolean>}
         */
        async calculateShipping(countryCode, stateCode, email) {
            if (!countryCode) return false;

            this.loading = true;
            this.error = null;

            try {
                const data = await checkoutApi.initialize({
                    countryCode,
                    stateCode,
                    autoSelectCheapestShipping: true,
                    email
                });

                if (data.success) {
                    this.shippingGroups = data.shippingGroups || [];
                    this.sortShippingOptions();

                    // Apply auto-selected options
                    this.shippingGroups.forEach(g => {
                        if (g.selectedShippingOptionId) {
                            this.shippingSelections[g.groupId] = g.selectedShippingOptionId;
                        }
                    });

                    // Update basket totals in store
                    if (data.basket) {
                        // @ts-ignore - Alpine store
                        this.$store.checkout.updateBasket({
                            total: data.basket.total,
                            shipping: data.basket.shipping ?? 0,
                            tax: data.basket.tax ?? 0
                        });

                        // Check for item-level shipping errors
                        this.processBasketErrors(data.basket.errors);
                    }

                    this._calculated = true;
                    // @ts-ignore - Alpine store
                    this.$store.checkout.shippingCalculated = true;
                    // @ts-ignore - Alpine store
                    this.$store.checkout.announce(
                        this.allItemsShippable
                            ? 'Shipping options loaded'
                            : 'Some items cannot be shipped to this location'
                    );

                    return true;
                } else {
                    this.error = data.message || 'Unable to calculate shipping.';

                    // Also check for item-level errors in basket
                    if (data.basket?.errors) {
                        this.processBasketErrors(data.basket.errors);
                    }

                    return false;
                }
            } catch (error) {
                console.error('Failed to calculate shipping:', error);
                this.error = 'An error occurred while calculating shipping.';
                return false;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Process basket errors for item availability
         * @param {BasketError[]} [errors]
         */
        processBasketErrors(errors) {
            if (errors && errors.length > 0) {
                this.itemAvailabilityErrors = errors.filter(e => e.isShippingError);
                this.allItemsShippable = this.itemAvailabilityErrors.length === 0;
            } else {
                this.itemAvailabilityErrors = [];
                this.allItemsShippable = true;
            }
        },

        /**
         * Handle shipping option selection change
         * @param {string} groupId
         * @param {ShippingOption} option
         */
        async onOptionChange(groupId, option) {
            this.shippingSelections[groupId] = option.id;

            // @ts-ignore - Alpine store
            this.$store.checkout.announce(`Selected ${option.name} shipping`);

            // Track analytics
            if (window.MerchelloSinglePageAnalytics) {
                window.MerchelloSinglePageAnalytics.trackShippingSelected(groupId, option.name, option.cost);
            }

            // Recalculate totals with new shipping
            await this.updateShippingAndRecalculate();
        },

        /**
         * Save shipping selections and recalculate totals
         */
        async updateShippingAndRecalculate() {
            try {
                const data = await checkoutApi.saveShipping(this.shippingSelections);

                if (data.success && data.basket) {
                    // @ts-ignore - Alpine store
                    this.$store.checkout.updateBasket({
                        total: data.basket.total,
                        shipping: data.basket.shipping ?? 0,
                        tax: data.basket.tax ?? 0
                    });
                }
            } catch (error) {
                console.error('Failed to update shipping totals:', error);
            }
        },

        /**
         * Sort shipping options: Next Day first, then by cost
         */
        sortShippingOptions() {
            this.shippingGroups.forEach(group => {
                if (group.shippingOptions && group.shippingOptions.length > 1) {
                    group.shippingOptions.sort((a, b) => {
                        // Next Day options come first
                        if (a.isNextDay && !b.isNextDay) return -1;
                        if (!a.isNextDay && b.isNextDay) return 1;
                        // Within same category, sort by cost (cheapest first)
                        return a.cost - b.cost;
                    });
                }
            });
        },

        /**
         * Get the selected shipping option name for a group
         * @param {ShippingGroup} group
         * @returns {string}
         */
        getSelectedShippingName(group) {
            const selectedId = this.shippingSelections[group.groupId];
            if (selectedId && group.shippingOptions) {
                const selected = group.shippingOptions.find(o => o.id === selectedId);
                if (selected) return selected.name;
            }
            return 'Select shipping method';
        },

        /**
         * Check if all groups have a shipping option selected
         * @returns {boolean}
         */
        get allSelected() {
            if (this.shippingGroups.length === 0) return false;
            return this.shippingGroups.every(g =>
                g.shippingOptions.length === 0 || this.shippingSelections[g.groupId]
            );
        },

        /**
         * Calculate total shipping from selected options
         * @returns {number}
         */
        get calculatedShipping() {
            let total = 0;
            for (const group of this.shippingGroups) {
                const selectedId = this.shippingSelections[group.groupId];
                if (selectedId && group.shippingOptions) {
                    const selected = group.shippingOptions.find(o => o.id === selectedId);
                    if (selected) {
                        total += selected.cost;
                    }
                }
            }
            return total;
        },

        /**
         * Check if shipping has been calculated
         * @returns {boolean}
         */
        get hasCalculated() {
            return this._calculated;
        }
    }));
}

export default { initShippingSelector };
