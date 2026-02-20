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
 * NOTE: This example logs all events to the browser console so you can see
 * the data flowing through. Remove or disable the console logging section
 * before deploying to production.
 *
 * Available events:
 * - checkout:begin             - Customer enters checkout
 * - checkout:add_contact_info  - Valid email entered
 * - checkout:add_shipping_info - Shipping method selected
 * - checkout:add_payment_info  - Payment method selected
 * - checkout:coupon_applied    - Discount code applied
 * - checkout:coupon_removed    - Discount code removed
 * - checkout:purchase          - Order completed successfully
 * - checkout:error             - Payment or validation error
 * - checkout:post_purchase_view - Post-purchase upsell page shown
 * - checkout:post_purchase_add  - Post-purchase upsell item added
 * - checkout:post_purchase_skip - Post-purchase skipped/expired
 * - checkout:post_purchase_error- Post-purchase error
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
        var mapItems = function(items) {
            if (!items || !Array.isArray(items)) return [];
            return items.map(mc.mapToGA4Item);
        };

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

        mc.on('checkout:add_contact_info', function(data) {
            dataLayer.push({ ecommerce: null });
            dataLayer.push({
                event: 'add_contact_info',
                ecommerce: {
                    currency: data.currency,
                    value: data.value,
                    items: data.items.map(mc.mapToGA4Item)
                }
            });
        });

        mc.on('checkout:add_shipping_info', function(data) {
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

        mc.on('checkout:add_payment_info', function(data) {
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

        // Post-purchase upsell view
        mc.on('checkout:post_purchase_view', function(data) {
            dataLayer.push({
                event: 'post_purchase_view',
                invoice_id: data.invoice_id,
                suggestion_count: data.suggestion_count,
                product_count: data.product_count,
                time_remaining_seconds: data.time_remaining_seconds
            });
        });

        // Post-purchase upsell add (one-click charge)
        mc.on('checkout:post_purchase_add', function(data) {
            dataLayer.push({ ecommerce: null });
            dataLayer.push({
                event: 'post_purchase_add',
                ecommerce: {
                    currency: data.currency,
                    value: data.value,
                    tax: data.tax,
                    shipping: data.shipping,
                    items: mapItems(data.items)
                },
                invoice_id: data.invoice_id,
                upsell_rule_id: data.upsell_rule_id,
                transaction_id: data.transaction_id
            });
        });

        // Post-purchase skip/expiry
        mc.on('checkout:post_purchase_skip', function(data) {
            dataLayer.push({
                event: 'post_purchase_skip',
                invoice_id: data.invoice_id,
                reason: data.reason,
                time_remaining_seconds: data.time_remaining_seconds
            });
        });

        // Post-purchase errors
        mc.on('checkout:post_purchase_error', function(data) {
            dataLayer.push({
                event: 'post_purchase_error',
                invoice_id: data.invoice_id,
                error_type: data.error_type,
                error_message: data.message,
                product_id: data.product_id
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

            mc.on('checkout:add_payment_info', function(data) {
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

            mc.on('checkout:post_purchase_view', function(data) {
                fbq('trackCustom', 'PostPurchaseView', {
                    invoice_id: data.invoice_id,
                    suggestion_count: data.suggestion_count,
                    product_count: data.product_count
                });
            });

            mc.on('checkout:post_purchase_add', function(data) {
                fbq('track', 'AddToCart', {
                    currency: data.currency,
                    value: data.value,
                    content_ids: mc.getContentIds(data.items),
                    contents: mc.mapToMetaContents(data.items),
                    content_type: 'product',
                    num_items: mc.getTotalQuantity(data.items)
                });
            });

            mc.on('checkout:post_purchase_skip', function(data) {
                fbq('trackCustom', 'PostPurchaseSkip', {
                    invoice_id: data.invoice_id,
                    reason: data.reason
                });
            });

            mc.on('checkout:post_purchase_error', function(data) {
                fbq('trackCustom', 'PostPurchaseError', {
                    invoice_id: data.invoice_id,
                    error_type: data.error_type,
                    product_id: data.product_id
                });
            });
        }

        // ============================================
        // Console logging (remove in production)
        // ============================================
        // Logs every checkout event to the browser console so you can
        // verify events are firing and inspect the payload data.
        // Open DevTools → Console to see output.
        mc.onAny(function(eventName, data) {
            console.group('%c[Merchello] ' + eventName, 'color: #7c3aed; font-weight: bold;');
            console.log(data);
            console.groupEnd();
        });

        console.log('[Merchello Analytics] Initialized — listening for checkout events');
    }

    init();
})();
