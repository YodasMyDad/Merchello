// @ts-check
/**
 * Merchello Checkout - Address Form Component
 *
 * Alpine.js component for handling address forms (billing/shipping).
 * Manages region loading, validation, and synchronization with the store.
 */

import { loadRegions, getRegionName, isValidRegion } from '../utils/regions.js';
import { validatePhone } from '../services/validation.js';

/**
 * @typedef {Object} Region
 * @property {string} code
 * @property {string} name
 */

/**
 * @typedef {Object} AddressFields
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

/** Required address fields */
const REQUIRED_FIELDS = ['name', 'address1', 'city', 'countryCode', 'postalCode'];

/**
 * Initialize the checkout address form Alpine.data component
 */
export function initCheckoutAddressForm() {
    // @ts-ignore - Alpine is global
    Alpine.data('checkoutAddressForm', (prefix) => ({
        // ============================================
        // Configuration
        // ============================================

        /** @type {string} */
        prefix,

        // ============================================
        // Local State
        // ============================================

        /** @type {Region[]} */
        regions: [],

        /** @type {boolean} */
        loadingRegions: false,

        // ============================================
        // Computed Properties (from store)
        // ============================================

        /**
         * Get the address fields from the store
         * @returns {AddressFields}
         */
        get fields() {
            return this.$store.checkout?.form?.[this.prefix] ?? {};
        },

        /**
         * Get errors for this address prefix
         * @returns {Object.<string, string>}
         */
        get errors() {
            const allErrors = this.$store.checkout?.errors ?? {};
            const prefixed = {};
            const prefixDot = `${this.prefix}.`;

            Object.keys(allErrors).forEach(key => {
                if (key.startsWith(prefixDot)) {
                    // Return without prefix for template compatibility
                    prefixed[key] = allErrors[key];
                }
            });

            return prefixed;
        },

        /**
         * Check if this is the billing address
         * @returns {boolean}
         */
        get isBilling() {
            return this.prefix === 'billing';
        },

        /**
         * Check if shipping is same as billing
         * @returns {boolean}
         */
        get sameAsBilling() {
            return this.$store.checkout?.form?.sameAsBilling ?? true;
        },

        /**
         * Check if regions are available for dropdown
         * @returns {boolean}
         */
        get hasRegions() {
            return this.regions.length > 0;
        },

        // ============================================
        // Lifecycle
        // ============================================

        async init() {
            // Load regions if country is already set
            if (this.fields.countryCode) {
                await this.loadRegions();
            }
        },

        // ============================================
        // Field Update Methods
        // ============================================

        /**
         * Update a field in the store
         * @param {string} field - Field name (without prefix)
         * @param {*} value - New value
         */
        setField(field, value) {
            const path = `${this.prefix}.${field}`;
            this.$store.checkout?.setFormField(path, value);

            // Dispatch change event
            this.$dispatch('address-field-changed', {
                prefix: this.prefix,
                field,
                value
            });
        },

        // ============================================
        // Country/Region Handling
        // ============================================

        /**
         * Load regions for the current country
         */
        async loadRegions() {
            const countryCode = this.fields.countryCode;
            if (!countryCode) {
                this.regions = [];
                return;
            }

            this.loadingRegions = true;
            try {
                this.regions = await loadRegions(this.prefix, countryCode);
            } catch (error) {
                console.error(`Failed to load regions for ${this.prefix}:`, error);
                this.regions = [];
            } finally {
                this.loadingRegions = false;
            }
        },

        /**
         * Handle country change
         */
        async onCountryChange() {
            // Clear state when country changes
            this.$store.checkout?.setFormField(`${this.prefix}.state`, '');
            this.$store.checkout?.setFormField(`${this.prefix}.stateCode`, '');

            // Load new regions
            await this.loadRegions();

            // Dispatch event for orchestrator
            this.$dispatch('address-changed', {
                prefix: this.prefix,
                field: 'countryCode',
                value: this.fields.countryCode,
                regions: this.regions
            });
        },

        /**
         * Handle state/region change
         */
        onStateChange() {
            // Update state name from code
            if (this.fields.stateCode && this.regions.length > 0) {
                const stateName = getRegionName(this.fields.stateCode, this.regions);
                if (stateName) {
                    this.$store.checkout?.setFormField(`${this.prefix}.state`, stateName);
                }
            }

            // Dispatch event
            this.$dispatch('address-changed', {
                prefix: this.prefix,
                field: 'stateCode',
                value: this.fields.stateCode
            });
        },

        /**
         * Handle general field change (blur)
         */
        onFieldChange(field) {
            this.$dispatch('address-changed', {
                prefix: this.prefix,
                field,
                value: this.fields[field]
            });
        },

        // ============================================
        // Validation
        // ============================================

        /**
         * Validate a single field
         * @param {string} field - Field name (without prefix)
         * @returns {boolean} Whether the field is valid
         */
        validateField(field) {
            const fullPath = `${this.prefix}.${field}`;
            const value = this.fields[field];

            // Clear previous error
            this.$store.checkout?.clearError(fullPath);

            // Required field check
            if (REQUIRED_FIELDS.includes(field) && !value) {
                this.$store.checkout?.setError(fullPath, 'This field is required.');
                return false;
            }

            // Phone validation
            if (field === 'phone' && value) {
                const result = validatePhone(value);
                if (!result.isValid) {
                    this.$store.checkout?.setError(fullPath, result.error);
                    return false;
                }
            }

            return true;
        },

        /**
         * Validate all fields
         * @returns {boolean} Whether all fields are valid
         */
        validateAll() {
            let isValid = true;

            REQUIRED_FIELDS.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            // Also validate phone if provided
            if (this.fields.phone) {
                if (!this.validateField('phone')) {
                    isValid = false;
                }
            }

            return isValid;
        },

        /**
         * Check if a field has an error
         * @param {string} field - Field name (without prefix)
         * @returns {boolean}
         */
        hasError(field) {
            return !!this.errors[`${this.prefix}.${field}`];
        },

        /**
         * Get error message for a field
         * @param {string} field - Field name (without prefix)
         * @returns {string}
         */
        getError(field) {
            return this.errors[`${this.prefix}.${field}`] ?? '';
        }
    }));
}

// ============================================
// Standalone Helper Functions
// ============================================

/**
 * Validate an address object (standalone function)
 * @param {AddressFields} address
 * @returns {{ isValid: boolean, errors: Object.<string, string> }}
 */
export function validateAddress(address) {
    const errors = {};
    let isValid = true;

    REQUIRED_FIELDS.forEach(field => {
        if (!address[field]) {
            errors[field] = 'This field is required.';
            isValid = false;
        }
    });

    if (address.phone) {
        const phoneResult = validatePhone(address.phone);
        if (!phoneResult.isValid) {
            errors.phone = phoneResult.error;
            isValid = false;
        }
    }

    return { isValid, errors };
}

/**
 * Check if an address has minimum data for shipping calculation
 * @param {AddressFields} address
 * @returns {boolean}
 */
export function canCalculateShipping(address) {
    return !!(address.countryCode && address.postalCode && address.postalCode.length >= 3);
}

/**
 * Sync billing address to shipping address
 * @param {AddressFields} billing
 * @param {AddressFields} shipping
 * @returns {AddressFields}
 */
export function syncBillingToShipping(billing, shipping) {
    return { ...shipping, ...billing };
}

export default {
    initCheckoutAddressForm,
    validateAddress,
    canCalculateShipping,
    syncBillingToShipping
};
