/**
 * Merchello Checkout Analytics
 *
 * Analytics-agnostic event emitter for checkout tracking.
 * Emits standardized events that can be mapped to any analytics provider
 * (GTM/GA4, Facebook Pixel, Segment, Plausible, etc.)
 *
 * Usage:
 * 1. Configure CustomScriptUrl in appsettings.json to load your analytics script
 * 2. In your script, listen to events via window.MerchelloCheckout.on('event', callback)
 * 3. Use built-in helper methods to transform data for GA4 or Meta Pixel
 *
 * @example
 * window.MerchelloCheckout.on('checkout:purchase', function(data) {
 *     dataLayer.push({
 *         event: 'purchase',
 *         ecommerce: {
 *             transaction_id: data.transaction_id,
 *             currency: data.currency,
 *             value: data.value,
 *             items: data.items.map(window.MerchelloCheckout.mapToGA4Item)
 *         }
 *     });
 * });
 *
 * ============================================
 * EMITTED EVENTS
 * ============================================
 *
 * checkout:begin
 *   Emitted when checkout starts (Information step loads)
 *   Payload: {
 *     currency: string,          // e.g., "GBP"
 *     value: number,             // basket total
 *     coupon: string|null,       // applied discount code
 *     items: Item[]              // basket line items
 *   }
 *
 * checkout:add_shipping_info
 *   Emitted when shipping method is selected
 *   Payload: {
 *     currency: string,
 *     value: number,
 *     shipping_tier: string,     // shipping method name
 *     items: Item[]
 *   }
 *
 * checkout:add_payment_info
 *   Emitted when payment method is selected
 *   Payload: {
 *     currency: string,
 *     value: number,
 *     payment_type: string,      // e.g., "Credit Card", "PayPal"
 *     items: Item[]
 *   }
 *
 * checkout:purchase
 *   Emitted on successful payment completion
 *   Payload: {
 *     transaction_id: string,    // invoice ID or payment transaction ID
 *     currency: string,
 *     value: number,             // total paid
 *     tax: number,
 *     shipping: number,
 *     coupon: string|null,
 *     items: Item[]
 *   }
 *
 * checkout:error
 *   Emitted on checkout errors
 *   Payload: {
 *     error_type: string,        // e.g., "payment_failed", "validation_error"
 *     error_message: string,
 *     step: string               // current checkout step
 *   }
 *
 * Item Object Schema:
 *   {
 *     item_id: string,           // product SKU
 *     item_name: string,         // product name
 *     item_brand: string|null,   // brand/manufacturer
 *     item_category: string|null,// product category
 *     item_variant: string|null, // variant name if applicable
 *     price: number,             // unit price
 *     quantity: number,
 *     discount: number|null      // line item discount
 *   }
 */
(function() {
    'use strict';

    var listeners = {};
    var anyListeners = [];

    /**
     * Subscribe to a specific checkout event.
     * @param {string} eventName - Event name (e.g., 'checkout:begin', 'checkout:purchase')
     * @param {function} callback - Function called with event data
     */
    function on(eventName, callback) {
        if (typeof callback !== 'function') return;
        if (!listeners[eventName]) {
            listeners[eventName] = [];
        }
        listeners[eventName].push(callback);
    }

    /**
     * Subscribe to all checkout events.
     * @param {function} callback - Function called with (eventName, data)
     */
    function onAny(callback) {
        if (typeof callback !== 'function') return;
        anyListeners.push(callback);
    }

    /**
     * Unsubscribe from a specific event.
     * @param {string} eventName - Event name
     * @param {function} callback - The original callback function
     */
    function off(eventName, callback) {
        if (!listeners[eventName]) return;
        listeners[eventName] = listeners[eventName].filter(function(cb) {
            return cb !== callback;
        });
    }

    /**
     * Emit an event to all subscribers.
     * @param {string} eventName - Event name
     * @param {object} data - Event data
     */
    function emit(eventName, data) {
        // Call specific listeners
        if (listeners[eventName]) {
            listeners[eventName].forEach(function(callback) {
                try {
                    callback(data);
                } catch (e) {
                    console.error('[MerchelloCheckout] Error in event handler for ' + eventName + ':', e);
                }
            });
        }

        // Call "any" listeners
        anyListeners.forEach(function(callback) {
            try {
                callback(eventName, data);
            } catch (e) {
                console.error('[MerchelloCheckout] Error in onAny handler:', e);
            }
        });
    }

    // ============================================
    // Built-in Helper Methods
    // ============================================

    /**
     * Map a Merchello item to GA4 item format.
     * Use with Array.map() when pushing to dataLayer.
     *
     * @param {object} item - Merchello item from event data
     * @returns {object} GA4-formatted item
     *
     * @example
     * items: data.items.map(window.MerchelloCheckout.mapToGA4Item)
     */
    function mapToGA4Item(item) {
        return {
            item_id: item.item_id,
            item_name: item.item_name,
            item_brand: item.item_brand || undefined,
            item_category: item.item_category || undefined,
            item_variant: item.item_variant || undefined,
            price: item.price,
            quantity: item.quantity,
            discount: item.discount || undefined
        };
    }

    /**
     * Map Merchello items to Meta Pixel contents format.
     * Required for Facebook dynamic remarketing ads.
     *
     * @param {array} items - Array of Merchello items from event data
     * @returns {array} Meta Pixel contents array
     *
     * @example
     * fbq('track', 'Purchase', {
     *     contents: window.MerchelloCheckout.mapToMetaContents(data.items),
     *     content_type: 'product'
     * });
     */
    function mapToMetaContents(items) {
        if (!items || !Array.isArray(items)) return [];
        return items.map(function(item) {
            return {
                id: item.item_id,
                quantity: item.quantity,
                item_price: item.price
            };
        });
    }

    /**
     * Extract content_ids array for Meta Pixel.
     * Convenience method for getting just the IDs.
     *
     * @param {array} items - Array of Merchello items
     * @returns {array} Array of item IDs
     *
     * @example
     * fbq('track', 'InitiateCheckout', {
     *     content_ids: window.MerchelloCheckout.getContentIds(data.items)
     * });
     */
    function getContentIds(items) {
        if (!items || !Array.isArray(items)) return [];
        return items.map(function(item) {
            return item.item_id;
        });
    }

    /**
     * Calculate total quantity from items array.
     * Useful for Meta Pixel num_items parameter.
     *
     * @param {array} items - Array of Merchello items
     * @returns {number} Total quantity
     */
    function getTotalQuantity(items) {
        if (!items || !Array.isArray(items)) return 0;
        return items.reduce(function(sum, item) {
            return sum + (item.quantity || 0);
        }, 0);
    }

    // ============================================
    // Public API
    // ============================================

    window.MerchelloCheckout = {
        // Event subscription
        on: on,
        onAny: onAny,
        off: off,

        // Internal emit (used by checkout views)
        emit: emit,

        // Helper methods for analytics providers
        mapToGA4Item: mapToGA4Item,
        mapToMetaContents: mapToMetaContents,
        getContentIds: getContentIds,
        getTotalQuantity: getTotalQuantity
    };

})();
