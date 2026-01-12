// @ts-check
/**
 * Merchello Checkout - Debounce Utility
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @template {(...args: any[]) => any} T
 * @param {T} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {(...args: Parameters<T>) => void}
 */
export function debounce(func, wait) {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timeoutId = null;

    return function debounced(...args) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func.apply(this, args);
            timeoutId = null;
        }, wait);
    };
}

/**
 * Creates a debouncer instance that can manage multiple named debounced calls.
 * Useful for Alpine.js components that need to debounce multiple different operations.
 *
 * @returns {{debounce: (key: string, fn: Function, delay?: number) => void, cancel: (key: string) => void, cancelAll: () => void}}
 */
export function createDebouncer() {
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    const timers = new Map();

    return {
        /**
         * Debounce a function call by key
         * @param {string} key - Unique key for this debounced operation
         * @param {Function} fn - Function to call
         * @param {number} [delay=300] - Delay in milliseconds
         */
        debounce(key, fn, delay = 300) {
            const existingTimer = timers.get(key);
            if (existingTimer !== undefined) {
                clearTimeout(existingTimer);
            }

            const timer = setTimeout(() => {
                fn();
                timers.delete(key);
            }, delay);

            timers.set(key, timer);
        },

        /**
         * Cancel a pending debounced call
         * @param {string} key
         */
        cancel(key) {
            const timer = timers.get(key);
            if (timer !== undefined) {
                clearTimeout(timer);
                timers.delete(key);
            }
        },

        /**
         * Cancel all pending debounced calls
         */
        cancelAll() {
            for (const timer of timers.values()) {
                clearTimeout(timer);
            }
            timers.clear();
        }
    };
}

export default { debounce, createDebouncer };
