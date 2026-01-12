/**
 * Shipping calculation utilities.
 * Shared logic for calculating shipping totals from selected options.
 * Single source of truth - avoid duplicating this logic in multiple components.
 */

/**
 * Calculate total shipping cost from selected shipping options.
 * This is a display calculation only - actual totals should be validated server-side.
 *
 * @param {Array<{groupId: string, shippingOptions: Array<{id: string, cost: number}>}>} shippingGroups - The shipping groups with available options
 * @param {Object<string, string>} shippingSelections - Map of groupId to selected option id
 * @returns {number} The total shipping cost
 */
export function calculateShippingTotal(shippingGroups, shippingSelections) {
    if (!shippingGroups || !shippingSelections) {
        return 0;
    }

    let total = 0;
    for (const group of shippingGroups) {
        const selectedId = shippingSelections[group.groupId];
        if (selectedId && group.shippingOptions) {
            const selected = group.shippingOptions.find(o => o.id === selectedId);
            if (selected) {
                total += selected.cost;
            }
        }
    }
    return total;
}

/**
 * Check if all shipping groups have a selected option.
 *
 * @param {Array<{groupId: string, shippingOptions: Array}>} shippingGroups - The shipping groups
 * @param {Object<string, string>} shippingSelections - Map of groupId to selected option id
 * @returns {boolean} True if all groups have a selection
 */
export function allGroupsHaveSelection(shippingGroups, shippingSelections) {
    if (!shippingGroups || shippingGroups.length === 0) {
        return false;
    }

    return shippingGroups.every(group =>
        shippingSelections[group.groupId] &&
        group.shippingOptions?.some(o => o.id === shippingSelections[group.groupId])
    );
}
