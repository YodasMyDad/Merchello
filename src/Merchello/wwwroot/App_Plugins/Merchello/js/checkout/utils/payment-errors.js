// @ts-check
/**
 * Merchello Checkout - Payment Error Handling Utility
 *
 * Standardized error handling for payment operations.
 * Provides consistent error codes, user messages, and event dispatch.
 */

/**
 * Standard payment error codes
 * @readonly
 * @enum {string}
 */
export const PaymentErrorCodes = Object.freeze({
    NETWORK_ERROR: 'NETWORK_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    CANCELLED: 'CANCELLED',
    TIMEOUT: 'TIMEOUT',
    CARD_DECLINED: 'CARD_DECLINED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    EXPIRED_CARD: 'EXPIRED_CARD',
    INVALID_CARD: 'INVALID_CARD',
    UNKNOWN: 'UNKNOWN'
});

/**
 * User-friendly error messages for each error code
 * @type {Object.<string, string>}
 */
const USER_MESSAGES = {
    [PaymentErrorCodes.NETWORK_ERROR]: 'Unable to process payment. Please check your connection and try again.',
    [PaymentErrorCodes.VALIDATION_ERROR]: 'Please check your payment details and try again.',
    [PaymentErrorCodes.PROVIDER_ERROR]: 'Payment provider error. Please try again or use a different payment method.',
    [PaymentErrorCodes.CANCELLED]: 'Payment was cancelled.',
    [PaymentErrorCodes.TIMEOUT]: 'Payment timed out. Please try again.',
    [PaymentErrorCodes.CARD_DECLINED]: 'Your card was declined. Please try a different card or contact your bank.',
    [PaymentErrorCodes.INSUFFICIENT_FUNDS]: 'Insufficient funds. Please try a different payment method.',
    [PaymentErrorCodes.EXPIRED_CARD]: 'Your card has expired. Please use a different card.',
    [PaymentErrorCodes.INVALID_CARD]: 'Invalid card details. Please check and try again.',
    [PaymentErrorCodes.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

/**
 * Get a user-friendly message for an error code
 * @param {string} code - Error code from PaymentErrorCodes
 * @param {string} [fallbackMessage] - Optional fallback message if code not found
 * @returns {string} User-friendly error message
 */
export function getUserMessage(code, fallbackMessage) {
    return USER_MESSAGES[code] || fallbackMessage || USER_MESSAGES[PaymentErrorCodes.UNKNOWN];
}

/**
 * Handle a payment error consistently
 * Updates store, dispatches event, and returns user message
 *
 * @param {Error|Object} error - The error object
 * @param {Object} [context] - Optional context about the error
 * @param {string} [context.provider] - Payment provider name
 * @param {string} [context.method] - Payment method alias
 * @param {string} [context.action] - Action being performed (e.g., 'submit', 'tokenize')
 * @returns {string} User-friendly error message
 */
export function handlePaymentError(error, context = {}) {
    const code = error.code || detectErrorCode(error);
    const userMessage = getUserMessage(code, error.message);

    // Update Alpine store if available
    // @ts-ignore - Alpine is global
    const store = typeof Alpine !== 'undefined' ? Alpine.store?.('checkout') : null;
    if (store) {
        store.setPaymentError(userMessage);
    }

    // Dispatch event for analytics/logging
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('merchello:payment-error', {
            detail: {
                code,
                message: error.message || userMessage,
                userMessage,
                provider: context.provider,
                method: context.method,
                action: context.action,
                timestamp: new Date().toISOString()
            }
        }));
    }

    // Log for debugging
    console.error('[Payment Error]', {
        code,
        message: error.message,
        userMessage,
        context,
        originalError: error
    });

    return userMessage;
}

/**
 * Detect error code from error message or type
 * @param {Error|Object} error
 * @returns {string} Detected error code
 */
function detectErrorCode(error) {
    const message = (error.message || '').toLowerCase();

    if (error.name === 'AbortError' || message.includes('abort')) {
        return PaymentErrorCodes.CANCELLED;
    }
    if (error.name === 'TimeoutError' || message.includes('timeout')) {
        return PaymentErrorCodes.TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
        return PaymentErrorCodes.NETWORK_ERROR;
    }
    if (message.includes('declined')) {
        return PaymentErrorCodes.CARD_DECLINED;
    }
    if (message.includes('insufficient')) {
        return PaymentErrorCodes.INSUFFICIENT_FUNDS;
    }
    if (message.includes('expired')) {
        return PaymentErrorCodes.EXPIRED_CARD;
    }
    if (message.includes('invalid card') || message.includes('card number')) {
        return PaymentErrorCodes.INVALID_CARD;
    }
    if (message.includes('validation') || message.includes('required')) {
        return PaymentErrorCodes.VALIDATION_ERROR;
    }

    return PaymentErrorCodes.UNKNOWN;
}

/**
 * Clear the current payment error in the store
 */
export function clearPaymentError() {
    // @ts-ignore - Alpine is global
    const store = typeof Alpine !== 'undefined' ? Alpine.store?.('checkout') : null;
    if (store) {
        store.setPaymentError(null);
    }
}

export default {
    PaymentErrorCodes,
    getUserMessage,
    handlePaymentError,
    clearPaymentError
};
