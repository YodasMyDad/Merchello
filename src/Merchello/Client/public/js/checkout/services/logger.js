// @ts-check
/**
 * Merchello Checkout - Client-Side Logger
 *
 * Lightweight logging service that batches client-side errors and POSTs
 * them to the backend for persistence in Umbraco structured logs.
 *
 * Design principles:
 * - Fire-and-forget: logging failures never break checkout
 * - PII-safe: strips sensitive keys, sends pathname only (no query params)
 * - Batched: buffers entries, flushes on threshold/timer/page-hide
 * - Transport: sendBeacon for unload, fetch+keepalive otherwise
 */

/** @readonly @enum {string} */
export const LogLevel = Object.freeze({
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
});

const ENDPOINT = '/api/merchello/checkout/log';
const FLUSH_THRESHOLD = 10;
const MAX_BUFFER = 50;
const FLUSH_INTERVAL_MS = 5000;
const MAX_MESSAGE_LENGTH = 500;

const VALID_CATEGORIES = new Set([
    'payment', 'shipping', 'address', 'validation',
    'api', 'adapter', 'init', 'general'
]);

/** Keys to strip from data objects before buffering (PII safety net). */
const PII_KEYS = new Set([
    'email', 'name', 'phone', 'address', 'card',
    'password', 'cardNumber', 'cvv', 'cvc', 'expiry',
    'firstName', 'lastName', 'fullName', 'billingName'
]);

/**
 * Generate a random session ID for correlating log batches.
 * Not a tracking ID - regenerated every page load.
 * @returns {string}
 */
function generateSessionId() {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
}

/**
 * Strip PII keys from an object (shallow).
 * @param {Record<string, any>|undefined} data
 * @returns {Record<string, any>|undefined}
 */
function stripPII(data) {
    if (!data || typeof data !== 'object') return undefined;
    /** @type {Record<string, any>} */
    const clean = {};
    for (const [key, value] of Object.entries(data)) {
        if (!PII_KEYS.has(key)) {
            clean[key] = typeof value === 'string' ? value.slice(0, 200) : value;
        }
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
}

/**
 * Truncate a string to maxLen.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
    return str && str.length > maxLen ? str.slice(0, maxLen) : str;
}

/** @type {Array<Object>} */
let buffer = [];
let checkoutStep = 'unknown';
let flushTimer = 0;
const sessionId = generateSessionId();

/**
 * Send buffered entries to the backend.
 * @param {boolean} [useBeacon=false] - Use sendBeacon (for page unload)
 */
function flushBuffer(useBeacon = false) {
    try {
        if (buffer.length === 0) return;

        const entries = buffer.splice(0, buffer.length);
        const payload = JSON.stringify({ entries });

        if (useBeacon && navigator.sendBeacon) {
            navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
        } else {
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(() => { /* silently discard */ });
        }
    } catch {
        // Logging must never break checkout
        buffer = [];
    }
}

/**
 * Add a log entry to the buffer.
 * @param {string} level
 * @param {string} message
 * @param {string} [category]
 * @param {Record<string, any>} [data]
 */
function addEntry(level, message, category, data) {
    try {
        const safeCategory = category && VALID_CATEGORIES.has(category) ? category : 'general';
        const safeData = stripPII(data);

        /** @type {any} */
        const entry = {
            level,
            message: truncate(message || '', MAX_MESSAGE_LENGTH),
            category: safeCategory,
            checkoutStep,
            url: window.location.pathname,
            sessionId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };

        if (safeData?.code) entry.errorCode = String(safeData.code);

        // Overflow: drop oldest entries
        if (buffer.length >= MAX_BUFFER) {
            buffer.shift();
        }
        buffer.push(entry);

        if (buffer.length >= FLUSH_THRESHOLD) {
            flushBuffer();
        }
    } catch {
        // Logging must never break checkout
    }
}

// Set up periodic flush
try {
    flushTimer = window.setInterval(() => flushBuffer(), FLUSH_INTERVAL_MS);

    // Flush on page hide (covers tab close, navigation, mobile app switch)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushBuffer(true);
        }
    });

    window.addEventListener('pagehide', () => flushBuffer(true));
} catch {
    // Non-critical: flushes will still happen on threshold
}

/**
 * Checkout logger - all methods are no-throw.
 */
export const checkoutLogger = {
    /**
     * Log a debug message.
     * @param {string} message
     * @param {string} [category]
     * @param {Record<string, any>} [data]
     */
    debug(message, category, data) {
        addEntry(LogLevel.DEBUG, message, category, data);
    },

    /**
     * Log an informational message.
     * @param {string} message
     * @param {string} [category]
     * @param {Record<string, any>} [data]
     */
    info(message, category, data) {
        addEntry(LogLevel.INFO, message, category, data);
    },

    /**
     * Log a warning.
     * @param {string} message
     * @param {string} [category]
     * @param {Record<string, any>} [data]
     */
    warn(message, category, data) {
        addEntry(LogLevel.WARNING, message, category, data);
    },

    /**
     * Log an error.
     * @param {string} message
     * @param {string} [category]
     * @param {Record<string, any>} [data]
     */
    error(message, category, data) {
        addEntry(LogLevel.ERROR, message, category, data);
    },

    /**
     * Log a critical error (e.g., order submission failure).
     * @param {string} message
     * @param {string} [category]
     * @param {Record<string, any>} [data]
     */
    critical(message, category, data) {
        addEntry(LogLevel.CRITICAL, message, category, data);
    },

    /**
     * Immediately flush all buffered entries.
     * @param {boolean} [useBeacon=false]
     */
    flush(useBeacon = false) {
        flushBuffer(useBeacon);
    },

    /**
     * Set the current checkout step for all subsequent log entries.
     * @param {string} step
     */
    setCheckoutStep(step) {
        checkoutStep = step || 'unknown';
    }
};

export default checkoutLogger;
