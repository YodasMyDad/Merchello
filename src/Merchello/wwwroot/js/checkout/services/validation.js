// @ts-check
/**
 * Merchello Checkout Validation Service
 * Form validation rules for the checkout flow.
 */

/**
 * Email regex pattern
 * @type {RegExp}
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Required address fields
 * @type {string[]}
 */
const REQUIRED_ADDRESS_FIELDS = ['name', 'address1', 'city', 'countryCode', 'postalCode'];

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {Object.<string, string>} errors - Field name to error message map
 */

/**
 * @typedef {Object} AddressFields
 * @property {string} [name]
 * @property {string} [company]
 * @property {string} [address1]
 * @property {string} [address2]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [stateCode]
 * @property {string} [countryCode]
 * @property {string} [country]
 * @property {string} [postalCode]
 * @property {string} [phone]
 */

/**
 * Validate an email address
 * @param {string} email
 * @returns {{isValid: boolean, error?: string}}
 */
export function validateEmail(email) {
    if (!email || !email.trim()) {
        return { isValid: false, error: 'Email is required.' };
    }

    if (!EMAIL_PATTERN.test(email)) {
        return { isValid: false, error: 'Please enter a valid email address.' };
    }

    return { isValid: true };
}

/**
 * Validate address fields
 * @param {AddressFields} fields
 * @param {string} [prefix] - Optional prefix for error keys (e.g., 'billing', 'shipping')
 * @returns {ValidationResult}
 */
export function validateAddress(fields, prefix) {
    const errors = {};
    let isValid = true;

    for (const fieldName of REQUIRED_ADDRESS_FIELDS) {
        const value = fields[fieldName];
        if (!value || !String(value).trim()) {
            const errorKey = prefix ? `${prefix}.${fieldName}` : fieldName;
            errors[errorKey] = 'This field is required.';
            isValid = false;
        }
    }

    return { isValid, errors };
}

/**
 * Validate a single field
 * @param {string} fieldName - Full field name (e.g., 'email', 'billing.name')
 * @param {any} value
 * @returns {{isValid: boolean, error?: string}}
 */
export function validateField(fieldName, value) {
    // Email validation
    if (fieldName === 'email') {
        return validateEmail(value);
    }

    // Extract field type from prefixed names (e.g., 'billing.name' -> 'name')
    const baseName = fieldName.includes('.') ? fieldName.split('.').pop() : fieldName;

    // Required field check
    if (REQUIRED_ADDRESS_FIELDS.includes(baseName)) {
        if (!value || !String(value).trim()) {
            return { isValid: false, error: 'This field is required.' };
        }
    }

    return { isValid: true };
}

/**
 * Validate the entire checkout form
 * @param {Object} form
 * @param {string} form.email
 * @param {AddressFields} form.billing
 * @param {AddressFields} form.shipping
 * @param {boolean} shippingSameAsBilling
 * @returns {ValidationResult}
 */
export function validateCheckoutForm(form, shippingSameAsBilling) {
    const errors = {};
    let isValid = true;

    // Email
    const emailResult = validateEmail(form.email);
    if (!emailResult.isValid) {
        errors.email = emailResult.error;
        isValid = false;
    }

    // Billing address
    const billingResult = validateAddress(form.billing, 'billing');
    if (!billingResult.isValid) {
        Object.assign(errors, billingResult.errors);
        isValid = false;
    }

    // Shipping address (only if different from billing)
    if (!shippingSameAsBilling) {
        const shippingResult = validateAddress(form.shipping, 'shipping');
        if (!shippingResult.isValid) {
            Object.assign(errors, shippingResult.errors);
            isValid = false;
        }
    }

    return { isValid, errors };
}

export default {
    validateEmail,
    validateAddress,
    validateField,
    validateCheckoutForm
};
