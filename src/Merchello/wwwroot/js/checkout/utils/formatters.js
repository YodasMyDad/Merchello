// @ts-check
/**
 * Merchello Checkout - Formatting Utilities
 */

/**
 * Format a number as currency
 * @param {number} value - The numeric value
 * @param {string} [symbol='£'] - Currency symbol
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string}
 */
export function formatCurrency(value, symbol = '£', decimals = 2) {
    const safeValue = typeof value !== 'number' || isNaN(value) ? 0 : value;
    return `${symbol}${formatNumber(safeValue, decimals)}`;
}

/**
 * Format a number with locale-aware formatting
 * @param {number} value
 * @param {string} [locale='en-GB']
 * @param {string} [currencyCode='GBP']
 * @returns {string}
 */
export function formatCurrencyLocale(value, locale = 'en-GB', currencyCode = 'GBP') {
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode
        }).format(value);
    } catch {
        // Fallback for unsupported currencies/locales
        return formatCurrency(value);
    }
}

/**
 * Format a number with thousands separators
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatNumber(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '0.00';
    }
    return value.toLocaleString('en-GB', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Create a currency formatter bound to specific currency settings
 * @param {string} symbol
 * @param {string} [currencyCode='GBP']
 * @returns {{format: (value: number) => string, symbol: string, code: string}}
 */
export function createCurrencyFormatter(symbol, currencyCode = 'GBP') {
    return {
        symbol,
        code: currencyCode,
        /**
         * Format a value
         * @param {number} value
         * @returns {string}
         */
        format(value) {
            return formatCurrency(value, symbol);
        }
    };
}

export default {
    formatCurrency,
    formatCurrencyLocale,
    formatNumber,
    createCurrencyFormatter
};
