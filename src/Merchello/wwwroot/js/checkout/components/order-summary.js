// @ts-check
/**
 * Merchello Checkout - Order Summary Component
 *
 * Displays order totals and handles discount code operations.
 * Uses Alpine.store for reactive updates from other components.
 */

import { checkoutApi } from '../services/api.js';

/**
 * Initialize the order summary Alpine.data component
 */
export function initOrderSummary() {
    // @ts-ignore - Alpine is global
    Alpine.data('orderSummary', () => {
        console.log('[orderSummary] Creating component...');
        try {
            const componentData = {
        // UI state
        expanded: false,
        discountCode: '',
        applyingDiscount: false,
        removingDiscount: null,
        discountError: '',
        discountSuccess: '',

        /**
         * Initialize the component
         */
        init() {
            // The component reads totals from the store, which are updated
            // by other components (shipping selector, discount operations, etc.)
        },

        /**
         * Format a value as currency using store settings
         * @param {number} value
         * @returns {string}
         */
        formatCurrency(value) {
            // @ts-ignore - Alpine store
            const symbol = this.$store.checkout?.currency?.symbol ?? '£';
            const numValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
            return `${symbol}${numValue.toFixed(2)}`;
        },

        /**
         * Get the shipping total
         * @returns {number}
         */
        get shipping() {
            // @ts-ignore - Alpine store
            return this.$store.checkout?.basket?.shipping ?? 0;
        },

        /**
         * Get the tax total
         * @returns {number}
         */
        get tax() {
            // @ts-ignore - Alpine store
            return this.$store.checkout?.basket?.tax ?? 0;
        },

        /**
         * Get the order total
         * @returns {number}
         */
        get total() {
            // @ts-ignore - Alpine store
            return this.$store.checkout?.basket?.total ?? 0;
        },

        /**
         * Get the subtotal
         * @returns {number}
         */
        get subtotal() {
            // @ts-ignore - Alpine store
            return this.$store.checkout?.basket?.subtotal ?? 0;
        },

        /**
         * Get the discount total
         * @returns {number}
         */
        get discount() {
            // @ts-ignore - Alpine store
            return this.$store.checkout?.basket?.discount ?? 0;
        },

        /**
         * Check if any discount operation is in progress
         * @returns {boolean}
         */
        get isDiscountOperationInProgress() {
            return this.applyingDiscount || this.removingDiscount !== null;
        },

        /**
         * Apply a discount code
         */
        async applyDiscount() {
            if (!this.discountCode.trim()) return;

            // Prevent concurrent operations (mutex)
            if (this.isDiscountOperationInProgress) return;

            // Save the code before clearing for analytics
            const appliedCode = this.discountCode.trim();

            this.applyingDiscount = true;
            this.discountError = '';
            this.discountSuccess = '';

            try {
                const data = await checkoutApi.applyDiscount(appliedCode);

                if (data.success) {
                    this.discountSuccess = 'Discount applied successfully!';
                    this.discountCode = '';

                    // Track analytics with the saved code
                    if (window.MerchelloCheckout) {
                        window.MerchelloCheckout.emit('checkout:coupon_applied', {
                            coupon: appliedCode,
                            discount_amount: data.discountAmount || 0
                        });
                    }

                    // Update store with new basket data (reactive - no page reload needed)
                    // @ts-ignore - Alpine store
                    if (this.$store.checkout && data.basket) {
                        this.$store.checkout.updateBasket(data.basket);
                    }

                    // Notify parent components
                    this.$dispatch('discount-applied', { basket: data.basket });
                } else {
                    this.discountError = data.message || 'Failed to apply discount code.';
                }
            } catch (error) {
                console.error('Failed to apply discount:', error);
                this.discountError = 'An unexpected error occurred.';
            } finally {
                this.applyingDiscount = false;
            }
        },

        /**
         * Remove a discount
         * @param {string} discountId
         */
        async removeDiscount(discountId) {
            // Prevent concurrent operations (mutex)
            if (this.isDiscountOperationInProgress) return;

            this.removingDiscount = discountId;
            this.discountError = '';
            this.discountSuccess = '';

            try {
                const data = await checkoutApi.removeDiscount(discountId);

                if (data.success) {
                    this.discountSuccess = 'Discount removed.';

                    // Track analytics
                    if (window.MerchelloCheckout) {
                        window.MerchelloCheckout.emit('checkout:coupon_removed', {
                            discount_id: discountId
                        });
                    }

                    // Update store with new basket data (reactive - no page reload needed)
                    // @ts-ignore - Alpine store
                    if (this.$store.checkout && data.basket) {
                        this.$store.checkout.updateBasket(data.basket);
                    }

                    // Notify parent components
                    this.$dispatch('discount-removed', { basket: data.basket });
                } else {
                    this.discountError = data.message || 'Failed to remove discount.';
                }
            } catch (error) {
                console.error('Failed to remove discount:', error);
                this.discountError = 'An unexpected error occurred.';
            } finally {
                this.removingDiscount = null;
            }
        }
            };

            console.log('[orderSummary] Component created successfully');
            return componentData;
        } catch (e) {
            console.error('[orderSummary] FATAL - Component initialization failed:', e);
            throw e;
        }
    });
}

export default { initOrderSummary };
