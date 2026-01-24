// @ts-check
/**
 * Merchello Checkout - Shipping Selection Component
 *
 * Alpine.js component for displaying and selecting shipping methods.
 * Reads shipping state from the checkout store and dispatches events on selection.
 */

/**
 * @typedef {Object} ShippingOption
 * @property {string} id - The ShippingOption GUID (empty for dynamic providers)
 * @property {string} name
 * @property {number} cost
 * @property {string} formattedCost
 * @property {string} deliveryDescription
 * @property {boolean} isNextDay
 * @property {string} providerKey - Provider key (e.g., "flat-rate", "fedex")
 * @property {string} selectionKey - Unified selection ID ("so:{guid}" or "dyn:{provider}:{serviceCode}")
 * @property {string|null} serviceCode - Carrier service code for dynamic providers
 * @property {string|null} estimatedDeliveryDate - ISO date string for estimated delivery
 * @property {boolean} isFallbackRate - True if rate is from cache due to API failure
 */

/**
 * @typedef {Object} ShippingGroup
 * @property {string} groupId
 * @property {string} groupName
 * @property {Array} lineItems
 * @property {ShippingOption[]} shippingOptions
 * @property {string|null} selectedShippingOptionId - SelectionKey of selected option
 * @property {string|null} rateError - Error message if rate fetching failed
 * @property {boolean} hasFallbackRates - True if any options are fallback rates
 */

/**
 * Initialize the checkout shipping Alpine.data component
 */
export function initCheckoutShipping() {
    // @ts-ignore - Alpine is global
    Alpine.data('checkoutShipping', () => ({
        // ============================================
        // Computed Properties (from store)
        // ============================================

        /** @returns {ShippingGroup[]} */
        get groups() {
            return this.$store.checkout?.shippingGroups ?? [];
        },

        /** @returns {Object.<string, string>} */
        get selections() {
            return this.$store.checkout?.shippingSelections ?? {};
        },

        /** @returns {boolean} */
        get loading() {
            return this.$store.checkout?.shippingLoading ?? false;
        },

        /** @returns {string|null} */
        get error() {
            return this.$store.checkout?.shippingError ?? null;
        },

        /** @returns {boolean} */
        get allItemsShippable() {
            return this.$store.checkout?.allItemsShippable ?? true;
        },

        /** @returns {Array} */
        get itemAvailabilityErrors() {
            return this.$store.checkout?.itemAvailabilityErrors ?? [];
        },

        /** @returns {boolean} */
        get canCalculate() {
            return this.$store.checkout?.canCalculateShipping?.() ?? false;
        },

        /** @returns {boolean} */
        get hasGroups() {
            return this.groups.length > 0;
        },

        /** @returns {boolean} */
        get hasMultipleGroups() {
            return this.groups.length > 1;
        },

        /** @returns {boolean} */
        get allSelected() {
            if (this.groups.length === 0) return false;
            return this.groups.every(g =>
                !g.shippingOptions?.length || this.selections[g.groupId]
            );
        },

        // ============================================
        // Methods
        // ============================================

        /**
         * Select a shipping option for a group
         * @param {string} groupId
         * @param {ShippingOption} option
         */
        selectOption(groupId, option) {
            // Update store using selectionKey
            this.$store.checkout?.setShippingSelection(groupId, option.selectionKey);

            // Dispatch event for orchestrator
            this.$dispatch('shipping-selection-changed', {
                groupId,
                selectionKey: option.selectionKey,
                cost: option.cost,
                option
            });
        },

        /**
         * Get the selected selectionKey for a group
         * @param {string} groupId
         * @returns {string|undefined}
         */
        getSelectedKey(groupId) {
            return this.selections[groupId];
        },

        /**
         * Get the selected option object for a group
         * @param {ShippingGroup} group
         * @returns {ShippingOption|undefined}
         */
        getSelectedOption(group) {
            const selectedKey = this.selections[group.groupId];
            if (!selectedKey) return undefined;
            return group.shippingOptions?.find(o => o.selectionKey === selectedKey);
        },

        /**
         * Get the name of the selected shipping option
         * @param {ShippingGroup} group
         * @returns {string}
         */
        getSelectedName(group) {
            const selected = this.getSelectedOption(group);
            return selected?.name ?? 'Select shipping method';
        },

        /**
         * Check if an option is selected
         * @param {string} groupId
         * @param {string} selectionKey
         * @returns {boolean}
         */
        isSelected(groupId, selectionKey) {
            return this.selections[groupId] === selectionKey;
        },

        /**
         * Format shipping cost with currency
         * @param {number} cost
         * @returns {string}
         */
        formatCost(cost) {
            if (cost === 0) return 'FREE';
            return this.$store.checkout?.formatCurrency?.(cost) ?? String(cost);
        },

        /**
         * Sort shipping options (next day first, then by cost)
         * @param {ShippingOption[]} options
         * @returns {ShippingOption[]}
         */
        sortOptions(options) {
            if (!options || options.length <= 1) return options;
            return [...options].sort((a, b) => {
                if (a.isNextDay && !b.isNextDay) return -1;
                if (!a.isNextDay && b.isNextDay) return 1;
                return a.cost - b.cost;
            });
        }
    }));
}

// ============================================
// Standalone Helper Functions
// ============================================
// These can be imported and used by other components

/**
 * Get selected shipping name for a group (standalone function)
 * @param {ShippingGroup} group
 * @param {Object.<string, string>} selections - Map of groupId to selectionKey
 * @returns {string}
 */
export function getSelectedShippingName(group, selections) {
    const selectedKey = selections[group.groupId];
    if (selectedKey && group.shippingOptions) {
        const selected = group.shippingOptions.find(o => o.selectionKey === selectedKey);
        if (selected) return selected.name;
    }
    return 'Select shipping method';
}

/**
 * Sort shipping options by priority and cost (standalone function)
 * @param {ShippingOption[]} options
 * @returns {ShippingOption[]}
 */
export function sortShippingOptions(options) {
    if (!options || options.length <= 1) return options;
    return [...options].sort((a, b) => {
        if (a.isNextDay && !b.isNextDay) return -1;
        if (!a.isNextDay && b.isNextDay) return 1;
        return a.cost - b.cost;
    });
}

/**
 * Check if all shipping groups have a selection (standalone function)
 * @param {ShippingGroup[]} groups
 * @param {Object.<string, string>} selections
 * @returns {boolean}
 */
export function allShippingSelected(groups, selections) {
    if (groups.length === 0) return false;
    return groups.every(g =>
        !g.shippingOptions?.length || selections[g.groupId]
    );
}

export default {
    initCheckoutShipping,
    getSelectedShippingName,
    sortShippingOptions,
    allShippingSelected
};
