/**
 * Example: Merchello Checkout Analytics
 *
 * This file demonstrates how to listen to Merchello checkout events
 * and push them to your analytics provider (GTM/GA4, Facebook Pixel, etc.)
 *
 * To use this example:
 * 1. Copy this file to your site's wwwroot/js/ folder
 * 2. Configure CheckoutSettings.CustomScriptUrl in appsettings.json:
 *    {
 *      "Merchello": {
 *        "Checkout": {
 *          "CustomScriptUrl": "/js/checkout-analytics.js"
 *        }
 *      }
 *    }
 * 3. Customize the GTM and/or Facebook Pixel sections below
 *
 * Available events:
 * - checkout:begin           - Customer enters checkout
 * - checkout:contact_complete - Email/contact submitted
 * - checkout:coupon_applied  - Discount code applied
 * - checkout:coupon_removed  - Discount code removed
 * - checkout:shipping_selected - Shipping method selected
 * - checkout:payment_initiated - Customer reaches payment step
 * - checkout:purchase        - Order completed successfully
 * - checkout:error           - Payment or validation error
 *
 * Built-in helper methods (on window.MerchelloCheckout):
 * - mapToGA4Item(item)       - Transform item for GA4 format
 * - mapToMetaContents(items) - Transform items for Meta Pixel
 * - getContentIds(items)     - Get array of item IDs
 * - getTotalQuantity(items)  - Get total item quantity
 */
(function() {
    'use strict';

    // Wait for MerchelloCheckout to be available
    function init() {
        if (!window.MerchelloCheckout) {
            setTimeout(init, 100);
            return;
        }

        var mc = window.MerchelloCheckout;

        // ============================================
        // Google Tag Manager / GA4
        // ============================================
        // Ensure dataLayer exists (GTM should create this, but just in case)
        window.dataLayer = window.dataLayer || [];

        mc.on('checkout:begin', function(data) {
            dataLayer.push({ ecommerce: null }); // Clear previous ecommerce object
            dataLayer.push({
                event: 'begin_checkout',
                ecommerce: {
                    currency: data.currency,
                    value: data.value,
                    coupon: data.coupon || undefined,
                    items: data.items.map(mc.mapToGA4Item)
                }
            });
        });

        mc.on('checkout:shipping_selected', function(data) {
            dataLayer.push({ ecommerce: null });
            dataLayer.push({
                event: 'add_shipping_info',
                ecommerce: {
                    currency: data.currency,
                    value: data.value,
                    coupon: data.coupon || undefined,
                    shipping_tier: data.shipping_tier,
                    items: data.items.map(mc.mapToGA4Item)
                }
            });
        });

        mc.on('checkout:payment_initiated', function(data) {
            dataLayer.push({ ecommerce: null });
            dataLayer.push({
                event: 'add_payment_info',
                ecommerce: {
                    currency: data.currency,
                    value: data.value,
                    coupon: data.coupon || undefined,
                    payment_type: data.payment_type,
                    items: data.items.map(mc.mapToGA4Item)
                }
            });
        });

        mc.on('checkout:purchase', function(data) {
            dataLayer.push({ ecommerce: null });
            dataLayer.push({
                event: 'purchase',
                ecommerce: {
                    transaction_id: data.transaction_id,
                    currency: data.currency,
                    value: data.value,
                    tax: data.tax,
                    shipping: data.shipping,
                    coupon: data.coupon || undefined,
                    items: data.items.map(mc.mapToGA4Item)
                }
            });
        });

        // Optional: Track coupon usage
        mc.on('checkout:coupon_applied', function(data) {
            dataLayer.push({
                event: 'coupon_applied',
                coupon_code: data.coupon,
                discount_value: data.discount_value,
                currency: data.currency
            });
        });

        // Optional: Track errors for debugging
        mc.on('checkout:error', function(data) {
            dataLayer.push({
                event: 'checkout_error',
                error_type: data.error_type,
                error_message: data.error_message,
                checkout_step: data.step
            });
        });

        // ============================================
        // Facebook / Meta Pixel
        // ============================================
        // Only run if Facebook Pixel is loaded
        if (typeof fbq === 'function') {
            mc.on('checkout:begin', function(data) {
                fbq('track', 'InitiateCheckout', {
                    currency: data.currency,
                    value: data.value,
                    num_items: data.item_count,
                    content_ids: mc.getContentIds(data.items),
                    contents: mc.mapToMetaContents(data.items),
                    content_type: 'product'
                });
            });

            mc.on('checkout:payment_initiated', function(data) {
                fbq('track', 'AddPaymentInfo', {
                    currency: data.currency,
                    value: data.value,
                    content_ids: mc.getContentIds(data.items),
                    content_type: 'product'
                });
            });

            mc.on('checkout:purchase', function(data) {
                fbq('track', 'Purchase', {
                    currency: data.currency,
                    value: data.value,
                    content_ids: mc.getContentIds(data.items),
                    contents: mc.mapToMetaContents(data.items),
                    content_type: 'product',
                    num_items: mc.getTotalQuantity(data.items)
                });
            });
        }

        // ============================================
        // Debug logging (remove in production)
        // ============================================
        // Uncomment below to log all events to console:
        //
        // mc.onAny(function(eventName, data) {
        //     console.log('[Merchello Analytics]', eventName, data);
        // });

        console.log('[Merchello Analytics] Initialized');
    }

    init();
})();
