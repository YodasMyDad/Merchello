// @ts-check
/**
 * Merchello Checkout - Screen Reader Announcer
 *
 * Provides accessible announcements for dynamic content changes.
 * Uses ARIA live regions to announce changes to screen reader users.
 */

/** @type {HTMLElement|null} */
let liveRegion = null;

/**
 * Get or create the live region element
 * @returns {HTMLElement}
 */
function getLiveRegion() {
    if (liveRegion) return liveRegion;

    // Try to find existing live region
    liveRegion = document.querySelector('[aria-live="polite"][data-announcer]');

    if (!liveRegion) {
        // Create a new live region
        liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.setAttribute('data-announcer', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        document.body.appendChild(liveRegion);
    }

    return liveRegion;
}

/**
 * Announce a message to screen readers
 *
 * @param {string} message - The message to announce
 * @param {Object} [options]
 * @param {number} [options.delay=100] - Delay before announcing (helps ensure the announcement is picked up)
 * @param {'polite'|'assertive'} [options.priority='polite'] - Announcement priority
 */
export function announce(message, options = {}) {
    const { delay = 100, priority = 'polite' } = options;

    const region = getLiveRegion();

    // Set priority if different
    if (region.getAttribute('aria-live') !== priority) {
        region.setAttribute('aria-live', priority);
    }

    // Clear and re-set to trigger announcement
    region.textContent = '';

    setTimeout(() => {
        region.textContent = message;
    }, delay);
}

/**
 * Announce an error message (uses assertive priority)
 * @param {string} message
 */
export function announceError(message) {
    announce(message, { priority: 'assertive' });
}

/**
 * Announce form validation results
 * @param {number} errorCount
 */
export function announceValidationResult(errorCount) {
    if (errorCount === 0) {
        announce('Form is valid.');
    } else {
        announceError(`Form has ${errorCount} error${errorCount !== 1 ? 's' : ''}. Please correct and try again.`);
    }
}

/**
 * Create an announcer instance bound to a specific element
 * Useful for Alpine.js components
 *
 * @param {HTMLElement} [element] - Optional element to use as live region
 * @returns {{announce: (message: string) => void, announceError: (message: string) => void}}
 */
export function createAnnouncer(element) {
    return {
        /**
         * Announce a message
         * @param {string} message
         */
        announce(message) {
            if (element) {
                element.textContent = '';
                setTimeout(() => {
                    element.textContent = message;
                }, 100);
            } else {
                announce(message);
            }
        },

        /**
         * Announce an error
         * @param {string} message
         */
        announceError(message) {
            if (element) {
                element.setAttribute('aria-live', 'assertive');
                element.textContent = '';
                setTimeout(() => {
                    element.textContent = message;
                    element.setAttribute('aria-live', 'polite');
                }, 100);
            } else {
                announceError(message);
            }
        }
    };
}

export default {
    announce,
    announceError,
    announceValidationResult,
    createAnnouncer
};
