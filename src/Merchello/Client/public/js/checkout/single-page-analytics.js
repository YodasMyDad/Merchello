/**
 * Merchello Single-Page Checkout Analytics
 *
 * Extends the base analytics emitter with deduplication and single-page-specific
 * event handling. In single-page checkout, multiple events can fire as users
 * interact with the form - this module ensures events fire appropriately without
 * spamming analytics providers.
 *
 * Usage:
 * Include after analytics.js in single-page checkout views.
 * Call methods directly on window.MerchelloSinglePageAnalytics
 *
 * @example
 * // In Alpine.js component:
 * MerchelloSinglePageAnalytics.trackShippingSelected(groupId, optionName, cost);
 * MerchelloSinglePageAnalytics.trackPaymentSelected(paymentMethod);
 */
(function() {
    'use strict';

    // Track what events have been fired to prevent duplicates
    var eventState = {
        beginFired: false,
        contactInfoFired: false,
        shippingInfoFired: false,
        paymentInfoFired: {},          // Keyed by payment method
        shippingSelections: {}         // Keyed by groupId -> optionId
    };

    /**
     * Get the current checkout data from the window object.
     * Falls back to empty defaults if not available.
     */
    function getCheckoutData() {
        return window.merchelloCheckoutData || {
            currency: 'USD',
            value: 0,
            items: []
        };
    }

    /**
     * Track checkout begin event (fires once per session).
     * Called automatically when single-page checkout initializes.
     */
    function trackBegin() {
        if (eventState.beginFired) return;
        eventState.beginFired = true;

        var data = getCheckoutData();
        if (window.MerchelloCheckout) {
            window.MerchelloCheckout.emit('checkout:begin', data);
        }
    }

    /**
     * Track contact info added (fires once when valid email is entered).
     * @param {string} email - The customer's email address
     */
    function trackContactInfo(email) {
        if (eventState.contactInfoFired) return;
        if (!email || !email.includes('@')) return;

        eventState.contactInfoFired = true;

        var data = getCheckoutData();
        if (window.MerchelloCheckout) {
            window.MerchelloCheckout.emit('checkout:add_contact_info', {
                currency: data.currency,
                value: data.value,
                items: data.items
            });
        }
    }

    /**
     * Track shipping option selected.
     * Fires when selection changes (not on every click of the same option).
     *
     * @param {string} groupId - The shipping group ID
     * @param {string} optionName - Display name of the shipping option
     * @param {number} cost - Shipping cost
     */
    function trackShippingSelected(groupId, optionName, cost) {
        // Check if this is actually a change
        var currentSelection = eventState.shippingSelections[groupId];
        if (currentSelection === optionName) return;

        eventState.shippingSelections[groupId] = optionName;
        eventState.shippingInfoFired = true;

        var data = getCheckoutData();
        if (window.MerchelloCheckout) {
            window.MerchelloCheckout.emit('checkout:add_shipping_info', {
                currency: data.currency,
                value: data.value,
                shipping_tier: optionName,
                shipping_cost: cost,
                group_id: groupId,
                items: data.items
            });
        }
    }

    /**
     * Track payment method selected.
     * Fires once per payment method (allows tracking method switches).
     *
     * @param {string} paymentType - The payment method type (e.g., "Credit Card", "PayPal")
     */
    function trackPaymentSelected(paymentType) {
        if (!paymentType) return;
        if (eventState.paymentInfoFired[paymentType]) return;

        eventState.paymentInfoFired[paymentType] = true;

        var data = getCheckoutData();
        if (window.MerchelloCheckout) {
            window.MerchelloCheckout.emit('checkout:add_payment_info', {
                currency: data.currency,
                value: data.value,
                payment_type: paymentType,
                items: data.items
            });
        }
    }

    /**
     * Track checkout error.
     * No deduplication - all errors should be tracked.
     *
     * @param {string} errorType - Type of error (e.g., "validation", "payment_failed")
     * @param {string} errorMessage - Human-readable error message
     */
    function trackError(errorType, errorMessage) {
        if (window.MerchelloCheckout) {
            window.MerchelloCheckout.emit('checkout:error', {
                error_type: errorType,
                error_message: errorMessage,
                step: 'single_page'
            });
        }
    }

    /**
     * Update checkout data with new values.
     * Call this when basket totals change (e.g., after shipping selection).
     *
     * @param {object} updates - Object with properties to update
     */
    function updateCheckoutData(updates) {
        if (window.merchelloCheckoutData && updates) {
            Object.assign(window.merchelloCheckoutData, updates);
        }
    }

    /**
     * Reset event state (e.g., if user starts over).
     * Typically not needed in normal flow.
     */
    function reset() {
        eventState = {
            beginFired: false,
            contactInfoFired: false,
            shippingInfoFired: false,
            paymentInfoFired: {},
            shippingSelections: {}
        };
    }

    /**
     * Check if shipping info has been tracked.
     * Useful for determining if checkout can proceed.
     */
    function hasShippingInfo() {
        return eventState.shippingInfoFired;
    }

    // ============================================
    // Public API
    // ============================================

    window.MerchelloSinglePageAnalytics = {
        trackBegin: trackBegin,
        trackContactInfo: trackContactInfo,
        trackShippingSelected: trackShippingSelected,
        trackPaymentSelected: trackPaymentSelected,
        trackError: trackError,
        updateCheckoutData: updateCheckoutData,
        reset: reset,
        hasShippingInfo: hasShippingInfo
    };

})();
