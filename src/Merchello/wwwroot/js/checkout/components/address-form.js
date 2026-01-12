// @ts-check
/**
 * Merchello Checkout - Address Form Component
 *
 * Reusable address form component for billing and shipping addresses.
 * Can be used multiple times on a page with different prefixes.
 */

import { checkoutApi } from '../services/api.js';
import { validateAddress, validateField } from '../services/validation.js';
import { createDebouncer } from '../utils/debounce.js';

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

/**
 * @typedef {Object} Region
 * @property {string} code
 * @property {string} name
 */

/**
 * Initialize the address form Alpine.data component
 */
export function initAddressForm() {
    // @ts-ignore - Alpine is global
    Alpine.data('addressForm', (prefix, initialFields = {}, options = {}) => {
        const debouncer = createDebouncer();

        return {
            // Configuration
            prefix,
            showRequired: options.showRequired ?? true,

            /** @type {AddressFields} */
            fields: {
                name: '',
                company: '',
                address1: '',
                address2: '',
                city: '',
                state: '',
                stateCode: '',
                country: '',
                countryCode: '',
                postalCode: '',
                phone: '',
                ...initialFields
            },

            /** @type {Region[]} */
            regions: [],

            /** @type {Object.<string, string>} */
            errors: {},

            /**
             * Initialize the component
             */
            async init() {
                // Load regions if we have a country
                if (this.fields.countryCode) {
                    await this.loadRegions();
                }

                // Watch for field changes and sync to store
                this.$watch('fields', (value) => {
                    this.syncToStore();
                }, { deep: true });

                // Initial sync
                this.syncToStore();
            },

            /**
             * Sync fields to checkout store
             */
            syncToStore() {
                // @ts-ignore - Alpine store
                const store = this.$store.checkout;
                if (!store) return;

                if (this.prefix === 'billing') {
                    store.updateBillingAddress(this.fields);
                } else if (this.prefix === 'shipping') {
                    store.updateShippingAddress(this.fields);
                }
            },

            /**
             * Load regions for the selected country
             */
            async loadRegions() {
                if (!this.fields.countryCode) {
                    this.regions = [];
                    return;
                }

                try {
                    this.regions = await checkoutApi.getRegions(this.prefix, this.fields.countryCode);
                } catch (error) {
                    console.error('Failed to load regions:', error);
                    this.regions = [];
                }
            },

            /**
             * Handle country change
             */
            async onCountryChange() {
                // Clear state when country changes
                this.fields.state = '';
                this.fields.stateCode = '';

                // Load new regions
                await this.loadRegions();

                // Notify parent of address change
                this.$dispatch('address-changed', {
                    prefix: this.prefix,
                    field: 'countryCode',
                    fields: this.fields
                });
            },

            /**
             * Handle state/region change
             */
            onStateChange() {
                // Find the region name from code
                const region = this.regions.find(r => r.code === this.fields.stateCode);
                if (region) {
                    this.fields.state = region.name;
                }

                // Notify parent of address change
                this.$dispatch('address-changed', {
                    prefix: this.prefix,
                    field: 'stateCode',
                    fields: this.fields
                });
            },

            /**
             * Handle field change (for non-country/state fields)
             * @param {string} fieldName
             */
            onFieldChange(fieldName) {
                // Clear field error
                delete this.errors[`${this.prefix}.${fieldName}`];

                // Notify parent
                this.$dispatch('address-changed', {
                    prefix: this.prefix,
                    field: fieldName,
                    fields: this.fields
                });
            },

            /**
             * Handle field blur (validation)
             * @param {string} fieldName
             */
            onFieldBlur(fieldName) {
                this.validateSingleField(fieldName);

                // Notify parent
                this.$dispatch('address-blur', {
                    prefix: this.prefix,
                    field: fieldName,
                    fields: this.fields
                });
            },

            /**
             * Validate a single field
             * @param {string} fieldName
             */
            validateSingleField(fieldName) {
                const fullFieldName = `${this.prefix}.${fieldName}`;
                const result = validateField(fullFieldName, this.fields[fieldName]);

                if (!result.isValid) {
                    this.errors[fullFieldName] = result.error;
                } else {
                    delete this.errors[fullFieldName];
                }
            },

            /**
             * Validate all fields
             * @returns {boolean}
             */
            validate() {
                const result = validateAddress(this.fields, this.prefix);
                this.errors = result.errors;
                return result.isValid;
            },

            /**
             * Clear all errors
             */
            clearErrors() {
                this.errors = {};
            },

            /**
             * Check if a specific field has an error
             * @param {string} fieldName
             * @returns {boolean}
             */
            hasError(fieldName) {
                return `${this.prefix}.${fieldName}` in this.errors;
            },

            /**
             * Get error message for a field
             * @param {string} fieldName
             * @returns {string}
             */
            getError(fieldName) {
                return this.errors[`${this.prefix}.${fieldName}`] || '';
            },

            /**
             * Debounced handler for triggering shipping calculation
             * @param {Function} callback
             */
            debouncedCallback(callback) {
                debouncer.debounce(`${this.prefix}-callback`, callback, 500);
            },

            /**
             * Check if shipping can be calculated (has required fields)
             * @returns {boolean}
             */
            canCalculateShipping() {
                return !!(
                    this.fields.countryCode &&
                    this.fields.postalCode &&
                    this.fields.postalCode.length >= 3
                );
            },

            /**
             * Get fields as a plain object (for API calls)
             * @returns {AddressFields}
             */
            getFields() {
                return { ...this.fields };
            },

            /**
             * Set fields from an external source
             * @param {Partial<AddressFields>} newFields
             */
            setFields(newFields) {
                Object.assign(this.fields, newFields);
            }
        };
    });
}

export default { initAddressForm };
