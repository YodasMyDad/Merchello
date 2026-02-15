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
 * Phone regex pattern - allows +, digits, spaces, dashes, parentheses (requires at least one digit)
 * @type {RegExp}
 */
const PHONE_PATTERN = /^\+?[\d\s\-()]*\d[\d\s\-()]*$/;

/**
 * Minimum postal code length to trigger shipping calculation (UX-only gate).
 * The backend CheckoutValidator performs full postal code validation on submission.
 * @type {number}
 */
export const MIN_POSTAL_CODE_LENGTH = 3;

/**
 * Required address fields
 * @type {string[]}
 */
const REQUIRED_ADDRESS_FIELDS = ['name', 'addressOne', 'townCity', 'countryCode', 'postalCode'];

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {Object.<string, string>} errors - Field name to error message map
 */

/**
 * @typedef {Object} AddressFields
 * @property {string} [name]
 * @property {string} [company]
 * @property {string} [addressOne]
 * @property {string} [addressTwo]
 * @property {string} [townCity]
 * @property {string} [countyState]
 * @property {string} [regionCode]
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
 * Validate a phone number (optional field - only validates if value is provided)
 * @param {string} phone
 * @returns {{isValid: boolean, error?: string}}
 */
export function validatePhone(phone) {
    // Phone is optional - only validate if provided
    if (!phone || !phone.trim()) {
        return { isValid: true };
    }

    if (!PHONE_PATTERN.test(phone)) {
        return { isValid: false, error: 'Please enter a valid phone number.' };
    }

    return { isValid: true };
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

    // Phone validation (optional field)
    if (baseName === 'phone') {
        return validatePhone(value);
    }

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
    MIN_POSTAL_CODE_LENGTH,
    validateEmail,
    validatePhone,
    validateAddress,
    validateField,
    validateCheckoutForm
};
