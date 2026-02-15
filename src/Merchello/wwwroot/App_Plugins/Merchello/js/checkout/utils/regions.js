// @ts-check
/**
 * Merchello Checkout - Region Loading Utility
 *
 * Shared utility for loading country regions (states/provinces).
 * Used by both single-page-checkout and address-form components.
 */

import { checkoutApi } from '../services/api.js';

/**
 * @typedef {Object} Region
 * @property {string} regionCode - The region code (e.g., 'CA', 'NY')
 * @property {string} name - The region name (e.g., 'California', 'New York')
 */

/**
 * Load regions for a country
 *
 * @param {string} addressType - 'billing' or 'shipping'
 * @param {string} countryCode - ISO country code (e.g., 'US', 'GB')
 * @returns {Promise<Region[]>} Array of regions, empty if none available
 */
export async function loadRegions(addressType, countryCode) {
    if (!countryCode) {
        return [];
    }

    try {
        const regions = await checkoutApi.getRegions(addressType, countryCode);
        return regions || [];
    } catch (error) {
        console.error('Failed to load regions:', error);
        return [];
    }
}

/**
 * Load regions using a custom API instance
 * Useful for testing or alternative API configurations
 *
 * @param {Object} api - API instance with getRegions method
 * @param {string} addressType - 'billing' or 'shipping'
 * @param {string} countryCode - ISO country code
 * @returns {Promise<Region[]>} Array of regions
 */
export async function loadRegionsWithApi(api, addressType, countryCode) {
    if (!countryCode || !api || typeof api.getRegions !== 'function') {
        return [];
    }

    try {
        const regions = await api.getRegions(addressType, countryCode);
        return regions || [];
    } catch (error) {
        console.error('Failed to load regions:', error);
        return [];
    }
}

/**
 * Check if a region code is valid for the given regions list
 *
 * @param {string} regionCode - The region code to validate
 * @param {Region[]} regions - The available regions
 * @returns {boolean} True if the region code is valid
 */
export function isValidRegion(regionCode, regions) {
    if (!regionCode || !Array.isArray(regions)) {
        return false;
    }
    return regions.some(r => r.regionCode === regionCode);
}

/**
 * Get region name by code
 *
 * @param {string} regionCode - The region code
 * @param {Region[]} regions - The available regions
 * @returns {string} The region name, or empty string if not found
 */
export function getRegionName(regionCode, regions) {
    if (!regionCode || !Array.isArray(regions)) {
        return '';
    }
    const region = regions.find(r => r.regionCode === regionCode);
    return region?.name || '';
}

export default {
    loadRegions,
    loadRegionsWithApi,
    isValidRegion,
    getRegionName
};
