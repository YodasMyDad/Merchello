// @ts-check
/**
 * Merchello Checkout - Single Page Checkout Orchestrator
 *
 * Main component that coordinates all checkout sub-components.
 * Handles the overall checkout flow, validation, and submission.
 *
 * Sub-components handle their own concerns:
 * - checkoutAddressForm: Address field handling, region loading, validation
 * - checkoutShipping: Shipping method display and selection
 * - checkoutPayment: Payment method display and selection
 *
 * This orchestrator listens to events from sub-components and coordinates:
 * - Shipping calculation
 * - Payment initialization
 * - Order submission
 */

import { checkoutApi } from '../services/api.js';
import { validatePhone } from '../services/validation.js';
import { createDebouncer } from '../utils/debounce.js';
import { calculateShippingTotal } from '../utils/shipping-calculator.js';
import { safeRedirect } from '../utils/security.js';
import { loadRegions } from '../utils/regions.js';
import { formatCurrency } from '../utils/formatters.js';
import { getSelectedShippingName, sortShippingOptions } from './checkout-shipping.js';
import { getPaymentMethodIcon, getPaymentMethodStyle, categorizePaymentMethods, IntegrationType } from './checkout-payment.js';

// Payment form container IDs by integration type
const PAYMENT_CONTAINER_IDS = {
    [IntegrationType.HostedFields]: 'hosted-fields-container',
    [IntegrationType.Widget]: 'widget-container',
    [IntegrationType.DirectForm]: 'direct-form-container'
};

// Checkout callback URLs
const getCheckoutReturnUrl = () => `${window.location.origin}/checkout/return`;
const getCheckoutCancelUrl = () => `${window.location.origin}/checkout/cancel`;

/**
 * Initialize the single page checkout Alpine.data component
 */
export function initSinglePageCheckout() {
    // @ts-ignore - Alpine is global
    Alpine.data('singlePageCheckout', () => {
        const debouncer = createDebouncer();

        return {
            // ============================================
            // Account State (UI-specific)
            // ============================================

            showAccountSection: false,
            hasExistingAccount: false,
            checkingEmail: false,
            passwordValid: false,
            passwordErrors: [],
            validatingPassword: false,
            signInError: '',
            showForgotPassword: false,
            signingIn: false,
            isSignedIn: false,

            // Forgot password modal state
            showForgotPasswordModal: false,
            forgotPasswordLoading: false,
            forgotPasswordSuccess: false,
            forgotPasswordError: '',

            // ============================================
            // Local Address State (for template compatibility)
            // ============================================

            billingRegions: [],
            shippingRegions: [],
            shippingSameAsBilling: true,

            // ============================================
            // Payment Local State
            // ============================================

            cardPaymentMethods: [],
            redirectPaymentMethods: [],
            selectedPaymentMethodKey: '',

            // ============================================
            // Private State
            // ============================================
            //
            // CONCURRENCY & STATE MANAGEMENT
            // ------------------------------
            // This checkout has several patterns to prevent race conditions,
            // duplicate requests, and stale data issues:
            //
            // 1. REQUEST ID PATTERN (_shippingRequestId, _paymentInitRequestId)
            //    Async operations increment a request ID before starting.
            //    When the response arrives, we check if our ID still matches
            //    the current ID. If not, a newer request was made and we
            //    discard this stale response. This prevents:
            //    - Old shipping calculations overwriting newer ones
            //    - Old payment sessions replacing current ones
            //
            // 2. DEDUPLICATION PATTERN (_emailCaptured, _lastAddressHash)
            //    Before making API calls, we check if the data has changed.
            //    This prevents redundant server calls when:
            //    - User tabs through fields without changing values
            //    - Same address is submitted multiple times
            //
            // 3. PHANTOM ORDER PREVENTION (isSubmitting guard)
            //    During order submission, we skip payment form re-initialization.
            //    Without this, basket updates during submit would clear the
            //    payment session, triggering new invoice creation. See
            //    reinitializePaymentFormIfActive() for the guard.
            //
            // 4. EXPRESS CHECKOUT RE-RENDER SKIP (_skipReRender flag)
            //    When initializing hosted payment forms (Braintree, etc.),
            //    we temporarily prevent express checkout buttons (PayPal)
            //    from re-rendering. This prevents UI flicker where buttons
            //    disappear and reappear during payment form setup.
            //
            // 5. DEBOUNCED RE-INITIALIZATION (_paymentReinitTimeout)
            //    When basket totals change (shipping, discounts), we need to
            //    re-init the payment form with the new amount. We debounce
            //    this at 300ms to match express checkout timing and prevent
            //    rapid flickering during fast changes.
            //

            /** @type {string} Last email successfully captured - prevents duplicate capture calls */
            _emailCaptured: '',
            /** @type {string} Hash of last captured address data - prevents duplicate capture calls */
            _lastAddressHash: '',
            /** @type {number} Incrementing ID for shipping requests - used to discard stale responses */
            _shippingRequestId: 0,
            /** @type {number} Incrementing ID for payment init requests - used to discard stale responses */
            _paymentInitRequestId: 0,
            /** @type {number|null} Timeout handle for debounced payment re-init */
            _paymentReinitTimeout: null,
            /** @type {boolean} Whether shipping has been calculated at least once */
            _shippingCalculated: false,
            announcement: '',

            // ============================================
            // Store Getters (form state from store)
            // ============================================

            get form() { return this.$store.checkout?.form ?? { email: '', billing: {}, shipping: {} }; },
            get shippingGroups() { return this.$store.checkout?.shippingGroups ?? []; },
            get shippingSelections() { return this.$store.checkout?.shippingSelections ?? {}; },
            get shippingLoading() { return this.$store.checkout?.shippingLoading ?? false; },
            get shippingError() { return this.$store.checkout?.shippingError ?? null; },
            get itemAvailabilityErrors() { return this.$store.checkout?.itemAvailabilityErrors ?? []; },
            get allItemsShippable() { return this.$store.checkout?.allItemsShippable ?? true; },
            get paymentLoading() { return this.$store.checkout?.paymentLoading ?? true; },
            get paymentError() { return this.$store.checkout?.paymentError ?? null; },
            get paymentMethods() { return this.$store.checkout?.paymentMethods ?? []; },
            get selectedPaymentMethod() { return this.$store.checkout?.selectedPaymentMethod ?? null; },
            get paymentSession() { return this.$store.checkout?.paymentSession ?? null; },
            get paymentFormInitializing() { return this.$store.checkout?.paymentFormInitializing ?? false; },
            get invoiceId() { return this.$store.checkout?.invoiceId ?? null; },
            get errors() { return this.$store.checkout?.errors ?? {}; },
            get generalError() { return this.$store.checkout?.generalError ?? ''; },
            get isSubmitting() { return this.$store.checkout?.isSubmitting ?? false; },
            get basketTotal() { return this.$store.checkout?.basket?.total ?? 0; },
            get basketShipping() { return this.$store.checkout?.basket?.shipping ?? 0; },
            get basketTax() { return this.$store.checkout?.basket?.tax ?? 0; },
            get basketSubtotal() { return this.$store.checkout?.basket?.subtotal ?? 0; },
            get currencySymbol() { return this.$store.checkout?.currency?.symbol ?? '£'; },

            // ============================================
            // Computed Properties
            // ============================================

            get canCalculateShipping() {
                return this.form.shipping.countryCode &&
                       this.form.shipping.postalCode &&
                       this.form.shipping.postalCode.length >= 3;
            },

            get allShippingSelected() {
                if (this.shippingGroups.length === 0) return false;
                return this.shippingGroups.every(g =>
                    !g.shippingOptions?.length || this.shippingSelections[g.groupId]
                );
            },

            get canSubmit() {
                const billingValid = this.form.billing.name &&
                                    this.form.billing.address1 &&
                                    this.form.billing.city &&
                                    this.form.billing.countryCode &&
                                    this.form.billing.postalCode;

                const shippingValid = this.shippingSameAsBilling || (
                    this.form.shipping.name &&
                    this.form.shipping.address1 &&
                    this.form.shipping.city &&
                    this.form.shipping.countryCode &&
                    this.form.shipping.postalCode
                );

                // Digital products require account (signed in OR valid password for new account)
                const store = this.$store.checkout;
                if (store?.hasDigitalProducts && !store?.isLoggedIn) {
                    // Must either have signed in during checkout OR have valid password for new account
                    if (!this.isSignedIn && (!this.form.password || !this.passwordValid)) {
                        return false;
                    }
                }

                return this.allItemsShippable &&
                       this.allShippingSelected &&
                       !this.shippingLoading &&
                       !this.paymentLoading &&
                       this.selectedPaymentMethod !== null &&
                       this.form.email &&
                       billingValid &&
                       shippingValid;
            },

            get formattedTotal() {
                return formatCurrency(this.basketTotal, this.currencySymbol);
            },

            get calculatedShipping() {
                return calculateShippingTotal(this.shippingGroups, this.shippingSelections);
            },

            /**
             * Whether to show the "Create an account" button.
             * Hidden when:
             * - User is already logged in
             * - Email belongs to an existing account (set after email blur check)
             * - User has already expanded the account section
             */
            get showCreateAccountButton() {
                const store = this.$store.checkout;
                return !store?.isLoggedIn && !store?.emailHasAccount && !this.showAccountSection;
            },

            // ============================================
            // Lifecycle
            // ============================================

            async init() {
                // Sync local state from store
                this.shippingSameAsBilling = this.$store.checkout?.form?.sameAsBilling ?? true;
                this._shippingCalculated = (this.$store.checkout?.shippingGroups?.length ?? 0) > 0;

                // Force account creation section open for digital products
                const store = this.$store.checkout;
                if (store?.hasDigitalProducts && !store?.isLoggedIn) {
                    this.showAccountSection = true;
                }

                // Load regions for initial countries
                if (this.form.billing.countryCode) {
                    this.billingRegions = await loadRegions('billing', this.form.billing.countryCode);
                    if (this.shippingSameAsBilling) {
                        this.shippingRegions = [...this.billingRegions];
                    }
                }
                if (!this.shippingSameAsBilling && this.form.shipping.countryCode) {
                    this.shippingRegions = await loadRegions('shipping', this.form.shipping.countryCode);
                }

                // Sort initial shipping options
                if (this.shippingGroups.length > 0) {
                    this.sortShippingOptions();
                }

                // Calculate shipping if needed
                if (this.form.shipping.countryCode && !this._shippingCalculated) {
                    await this.calculateShipping();
                }

                // Load payment methods
                await this.loadPaymentMethods();

                // Sync totals
                this.$nextTick(() => {
                    if (this.calculatedShipping > 0 || this._shippingCalculated) {
                        this.dispatchBasketUpdate();
                    }
                });

                // Track checkout begin
                if (window.MerchelloSinglePageAnalytics) {
                    window.MerchelloSinglePageAnalytics.trackBegin();
                }

                // CROSS-COMPONENT COORDINATION: Other components (e.g., discount code input,
                // basket quantity changes) fire this event when basket totals change.
                // We must re-initialize the payment form so the session has the correct amount.
                // Note: reinitializePaymentFormIfActive() has the isSubmitting guard
                // to prevent phantom orders during submission.
                document.addEventListener('merchello:payment-reinit-needed', () => {
                    this.reinitializePaymentFormIfActive();
                });
            },

            // ============================================
            // Helper Methods
            // ============================================

            announce(message) {
                this.announcement = '';
                setTimeout(() => { this.announcement = message; }, 100);
                this.$store.checkout?.announce(message);
            },

            /**
             * Set the express checkout re-render skip flag
             * Prevents express buttons from disappearing during payment form initialization
             * @param {boolean} skip
             */
            setExpressReRenderSkip(skip) {
                const expressEl = document.querySelector('[x-data="expressCheckout"]');
                if (expressEl && expressEl._x_dataStack?.[0]) {
                    const expressComponent = expressEl._x_dataStack[0];
                    // Use the component's method if available (handles pending re-renders)
                    if (typeof expressComponent.setSkipReRender === 'function') {
                        expressComponent.setSkipReRender(skip);
                    } else {
                        expressComponent._skipReRender = skip;
                    }
                }
            },

            dispatchBasketUpdate() {
                document.dispatchEvent(new CustomEvent('merchello:basket-updated', {
                    detail: {
                        shipping: this.basketShipping,
                        tax: this.basketTax,
                        total: this.basketTotal,
                        subTotal: this.basketSubtotal
                    }
                }));
                this.$store.checkout?.updateBasket({
                    total: this.basketTotal,
                    shipping: this.basketShipping,
                    tax: this.basketTax
                });
            },

            // Delegate to helper - kept for template compatibility
            sortShippingOptions() {
                this.shippingGroups.forEach(group => {
                    if (group.shippingOptions?.length > 1) {
                        group.shippingOptions = sortShippingOptions(group.shippingOptions);
                    }
                });
            },

            // Delegate to helper - kept for template compatibility
            getSelectedShippingName(group) {
                return getSelectedShippingName(group, this.shippingSelections);
            },

            // Delegate to helper - kept for template compatibility
            getPaymentMethodIcon(method) {
                return getPaymentMethodIcon(method);
            },

            // Get inline style for payment method based on checkoutStyle
            getPaymentMethodStyle(method, isSelected = false) {
                return getPaymentMethodStyle(method, isSelected);
            },

            // Check if a payment method is selected
            isPaymentMethodSelected(method) {
                return this.selectedPaymentMethod?.providerAlias === method.providerAlias &&
                       this.selectedPaymentMethod?.methodAlias === method.methodAlias;
            },

            /**
             * Check if the integration type requires a payment form (HostedFields or DirectForm)
             * @param {number} integrationType
             * @returns {boolean}
             */
            requiresPaymentForm(integrationType) {
                return [IntegrationType.HostedFields, IntegrationType.DirectForm].includes(integrationType);
            },

            /**
             * Check if current payment session matches the selected payment method
             * @returns {boolean}
             */
            get paymentSessionMatchesMethod() {
                return this.paymentSession &&
                    this.paymentSession.providerAlias === this.selectedPaymentMethod?.providerAlias &&
                    this.paymentSession.methodAlias === (this.selectedPaymentMethod?.methodAlias || null);
            },

            /**
             * Check if express checkout re-render should be skipped
             * (when we have an active payment form that will be re-initialized)
             * @returns {boolean}
             */
            shouldSkipExpressReRender() {
                // Skip re-renders while payment form is being initialized
                // (paymentSession is temporarily null during reinit)
                if (this.paymentFormInitializing) return true;

                return this.paymentSession &&
                    this.requiresPaymentForm(this.paymentSession.integrationType) &&
                    this.selectedPaymentMethod;
            },

            /**
             * Update basket in store and dispatch event, then reinitialize payment form if active.
             * Handles the express checkout re-render skip flag to prevent UI flickering.
             * @param {{ total?: number, shipping?: number, tax?: number, subtotal?: number }} basketUpdate
             */
            async updateBasketAndReinitPayment(basketUpdate) {
                this.$store.checkout?.updateBasket(basketUpdate);

                const willReinitPayment = this.shouldSkipExpressReRender();
                if (willReinitPayment) {
                    this.setExpressReRenderSkip(true);
                }

                this.dispatchBasketUpdate();

                if (willReinitPayment) {
                    await this.reinitializePaymentFormIfActive();
                } else {
                    this.setExpressReRenderSkip(false);
                }
            },

            // ============================================
            // Address Handlers (for template compatibility)
            // ============================================

            syncBillingToShipping() {
                Object.keys(this.form.billing).forEach(key => {
                    this.form.shipping[key] = this.form.billing[key];
                });
            },

            async onBillingCountryChange() {
                this.form.billing.state = '';
                this.form.billing.stateCode = '';
                this.billingRegions = await loadRegions('billing', this.form.billing.countryCode);
                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.shippingRegions = [...this.billingRegions];
                    this.debouncedCalculateShipping();
                }
                this.debouncedCaptureAddress();

                // Clear payment error if billing info is now complete
                const hasBillingInfo = this.form.billing.name &&
                                       this.form.billing.address1 &&
                                       this.form.billing.countryCode;
                if (hasBillingInfo && this.$store.checkout?.paymentError === 'Please complete your billing address first.') {
                    this.$store.checkout?.setPaymentError(null);
                }
            },

            onBillingStateChange() {
                const region = this.billingRegions.find(r => r.code === this.form.billing.stateCode);
                if (region) this.form.billing.state = region.name;
                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.debouncedCalculateShipping();
                }
                this.debouncedCaptureAddress();
            },

            onBillingFieldChange() {
                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.debouncedCalculateShipping();
                }
                this.debouncedCaptureAddress();

                // Clear payment error if billing info is now complete
                const hasBillingInfo = this.form.billing.name &&
                                       this.form.billing.address1 &&
                                       this.form.billing.countryCode;
                if (hasBillingInfo && this.$store.checkout?.paymentError === 'Please complete your billing address first.') {
                    this.$store.checkout?.setPaymentError(null);
                }
            },

            async onShippingCountryChange() {
                this.form.shipping.state = '';
                this.form.shipping.stateCode = '';
                this.shippingRegions = await loadRegions('shipping', this.form.shipping.countryCode);
                this.debouncedCalculateShipping();
                this.debouncedCaptureAddress();
            },

            onShippingStateChange() {
                const region = this.shippingRegions.find(r => r.code === this.form.shipping.stateCode);
                if (region) this.form.shipping.state = region.name;
                this.debouncedCaptureAddress();
            },

            onShippingSameAsBillingChange() {
                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.shippingRegions = [...this.billingRegions];
                    this.debouncedCalculateShipping();
                }
                this.debouncedCaptureAddress();
            },

            // ============================================
            // Email & Address Capture
            // ============================================

            async captureEmail() {
                // DEDUPLICATION: Skip if email unchanged since last capture.
                // Prevents redundant API calls when user tabs through fields.
                if (!this.form.email || this._emailCaptured === this.form.email) return;
                try {
                    const response = await checkoutApi.captureEmail(this.form.email);
                    if (response.success !== false) {
                        this._emailCaptured = this.form.email;
                    }
                } catch (error) {
                    console.error('Failed to capture email:', error);
                }
            },

            debouncedCaptureAddress() {
                debouncer.debounce('captureAddress', () => this.captureAddress(), 500);
            },

            async captureAddress() {
                // DEDUPLICATION: Hash current address data and compare to last capture.
                // This prevents redundant API calls when address hasn't actually changed.
                // Important for abandoned cart recovery - we want to capture changes,
                // but not spam the server with identical data.
                const addressHash = JSON.stringify({
                    email: this.form.email,
                    billing: this.form.billing,
                    shipping: this.shippingSameAsBilling ? this.form.billing : this.form.shipping,
                    shippingSameAsBilling: this.shippingSameAsBilling
                });
                if (this._lastAddressHash === addressHash) return;

                const hasBillingData = this.form.billing.name ||
                    this.form.billing.address1 ||
                    this.form.billing.city ||
                    this.form.billing.postalCode ||
                    this.form.billing.countryCode;
                if (!this.form.email && !hasBillingData) return;

                try {
                    const data = {
                        email: this.form.email || undefined,
                        billingAddress: this.form.billing,
                        shippingAddress: this.shippingSameAsBilling ? undefined : this.form.shipping,
                        shippingSameAsBilling: this.shippingSameAsBilling
                    };
                    const response = await checkoutApi.captureAddress(data);
                    if (response.success !== false) {
                        this._lastAddressHash = addressHash;
                    }
                } catch (error) {
                    console.error('Failed to capture address:', error);
                }
            },

            // ============================================
            // Shipping Calculation
            // ============================================

            debouncedCalculateShipping() {
                if (!this.canCalculateShipping) return;
                debouncer.debounce('shipping', () => this.calculateShipping(), 500);
            },

            async calculateShipping() {
                if (!this.canCalculateShipping) return;

                // REQUEST ID PATTERN: Increment before async call, check after.
                // If user changes address quickly, multiple requests fire.
                // Only the latest request (matching current ID) updates state.
                const requestId = ++this._shippingRequestId;
                const store = this.$store.checkout;
                store?.setShippingLoading(true);
                store?.setShippingError(null);

                try {
                    const data = await checkoutApi.initialize({
                        countryCode: this.form.shipping.countryCode,
                        stateCode: this.form.shipping.stateCode,
                        autoSelectCheapestShipping: true,
                        email: this.form.email,
                        previousShippingSelections: this.shippingSelections
                    });

                    // STALE RESPONSE CHECK: A newer request was made while we waited.
                    // Discard this response to avoid overwriting fresher data.
                    if (requestId !== this._shippingRequestId) return;

                    if (data.success) {
                        const groups = data.shippingGroups || [];
                        groups.forEach(group => {
                            if (group.shippingOptions?.length > 1) {
                                group.shippingOptions = sortShippingOptions(group.shippingOptions);
                            }
                        });

                        // Build selections from API response - backend has already validated and applied
                        // previous selections or auto-selected cheapest as appropriate
                        const selections = {};
                        groups.forEach(g => {
                            if (g.selectedShippingOptionId) {
                                selections[g.groupId] = g.selectedShippingOptionId;
                                // Also store by warehouseId for future lookups
                                if (g.warehouseId) {
                                    selections[g.warehouseId] = g.selectedShippingOptionId;
                                }
                            }
                        });

                        store?.updateShipping(groups, selections);

                        if (data.basket) {
                            // Trust the API response - backend calculates totals with correct shipping selections
                            await this.updateBasketAndReinitPayment({
                                total: data.basket.displayTotal ?? data.basket.total,
                                shipping: data.basket.displayShipping ?? data.basket.shipping ?? 0,
                                tax: data.basket.displayTax ?? data.basket.tax ?? 0,
                                subtotal: data.basket.displaySubTotal ?? data.basket.subtotal ?? 0
                            });

                            if (data.basket.errors?.length > 0) {
                                const shippingErrors = data.basket.errors.filter(e => e.isShippingError);
                                store.itemAvailabilityErrors = shippingErrors;
                                store.allItemsShippable = shippingErrors.length === 0;
                            } else {
                                store.itemAvailabilityErrors = [];
                                store.allItemsShippable = true;
                            }
                        }

                        this._shippingCalculated = true;
                        this.announce(this.allItemsShippable ? 'Shipping options loaded' : 'Some items cannot be shipped to this location');
                    } else {
                        store?.setShippingError(data.message || 'Unable to calculate shipping.');
                        if (data.basket?.errors) {
                            const shippingErrors = data.basket.errors.filter(e => e.isShippingError);
                            store.itemAvailabilityErrors = shippingErrors;
                            store.allItemsShippable = shippingErrors.length === 0;
                        } else {
                            store.allItemsShippable = false;
                        }
                    }
                } catch (error) {
                    if (requestId !== this._shippingRequestId) return;
                    console.error('Failed to calculate shipping:', error);
                    store?.setShippingError('An error occurred while calculating shipping.');
                    store.itemAvailabilityErrors = [];
                    store.allItemsShippable = false;
                    store?.updateShipping([], {});
                } finally {
                    if (requestId === this._shippingRequestId) {
                        store?.setShippingLoading(false);
                    }
                }
            },

            async onShippingOptionChange(groupId, option) {
                this.announce(`Selected ${option.name} shipping`);
                if (window.MerchelloSinglePageAnalytics) {
                    window.MerchelloSinglePageAnalytics.trackShippingSelected(groupId, option.name, option.cost);
                }
                await this.updateShippingAndRecalculate();
            },

            async updateShippingAndRecalculate() {
                try {
                    const data = await checkoutApi.saveShipping(this.shippingSelections);
                    if (data.success && data.basket) {
                        await this.updateBasketAndReinitPayment({
                            total: data.basket.displayTotal ?? data.basket.total,
                            shipping: data.basket.displayShipping ?? data.basket.shipping ?? 0,
                            tax: data.basket.displayTax ?? data.basket.tax ?? 0
                        });
                    }
                } catch (error) {
                    this.setExpressReRenderSkip(false);
                    console.error('Failed to update shipping totals:', error);
                }
            },

            // ============================================
            // Payment Methods
            // ============================================

            /**
             * Re-initialize payment form if one is currently active.
             *
             * WHEN THIS IS CALLED:
             * - Shipping option changes (different cost)
             * - Discount code applied/removed
             * - Basket quantity changes
             * - Any event that fires 'merchello:payment-reinit-needed'
             *
             * WHY RE-INIT IS NEEDED:
             * Payment sessions (especially for hosted fields like Braintree) are
             * created with a specific amount. If the basket total changes after
             * session creation, the payment would be for the wrong amount.
             * Re-initializing creates a new session with the correct total.
             *
             * DEBOUNCE (300ms):
             * Matches the express checkout button re-render timing. This prevents
             * UI flicker when multiple rapid changes occur (e.g., user quickly
             * clicking through shipping options).
             */
            async reinitializePaymentFormIfActive() {
                const store = this.$store.checkout;

                // PHANTOM ORDER PREVENTION: During order submission, basket updates
                // (from backend recalculations) can trigger this function. If we
                // re-init the payment form during submit, it would:
                // 1. Clear the current payment session
                // 2. Create a new invoice on backend (initiate-payment creates invoices)
                // 3. Result in duplicate/phantom orders
                // The isSubmitting flag blocks this dangerous path.
                if (store?.isSubmitting) return;

                // Only re-init for HostedFields/DirectForm types that have an active session
                // PayPal/Widget types handle amount updates differently (via express checkout re-render)
                if (!this.paymentSession) return;
                if (!this.requiresPaymentForm(this.paymentSession.integrationType)) return;
                if (!this.selectedPaymentMethod) return;

                // Clear any pending re-init to debounce rapid changes
                if (this._paymentReinitTimeout) {
                    clearTimeout(this._paymentReinitTimeout);
                }

                // DEBOUNCE: Wait 300ms before re-initializing. This value is intentionally
                // matched to the express checkout button re-render delay. Benefits:
                // 1. Prevents multiple rapid re-inits when user clicks through options
                // 2. Allows final basket state to settle before creating new session
                // 3. Reduces API calls and improves perceived performance
                this._paymentReinitTimeout = setTimeout(async () => {
                    this._paymentReinitTimeout = null;

                    // Re-check conditions after debounce - state may have changed during wait.
                    // User might have selected a different payment method or cleared session.
                    if (!this.paymentSession) return;
                    if (!this.selectedPaymentMethod) return;

                    // Clear current session (shows skeleton loader) and create fresh one
                    // with the updated basket total.
                    store?.setPaymentSession(null);
                    await this.initializePaymentForm(this.selectedPaymentMethod);
                }, 300);
            },

            async loadPaymentMethods() {
                const store = this.$store.checkout;
                store?.setPaymentLoading(true);
                store?.setPaymentError(null);

                try {
                    const methods = await checkoutApi.getPaymentMethods();
                    store?.setPaymentMethods(methods || []);

                    const categorized = categorizePaymentMethods(methods || []);
                    this.cardPaymentMethods = categorized.card;
                    this.redirectPaymentMethods = categorized.redirect;
                } catch (error) {
                    console.error('Failed to load payment methods:', error);
                    store?.setPaymentError('Unable to load payment methods. Please refresh the page.');
                } finally {
                    store?.setPaymentLoading(false);
                }
            },

            async onPaymentMethodChange(method) {
                const store = this.$store.checkout;
                const isSameMethod = this.selectedPaymentMethod?.providerAlias === method.providerAlias
                    && this.selectedPaymentMethod?.methodAlias === method.methodAlias;

                if (isSameMethod && this.paymentSession) return;

                // Check billing info before selecting payment method
                const hasBillingInfo = this.form.billing.name &&
                                       this.form.billing.address1 &&
                                       this.form.billing.countryCode;

                if (!hasBillingInfo) {
                    store?.setPaymentMethod(null);
                    store?.setPaymentError('Please complete your billing address first.');
                    this.selectedPaymentMethodKey = '';
                    return;
                }

                store?.setPaymentMethod(method);
                store?.setPaymentError(null);
                store?.setPaymentSession(null);

                if (!isSameMethod && window.MerchelloSinglePageAnalytics) {
                    window.MerchelloSinglePageAnalytics.trackPaymentSelected(method.displayName);
                }
                if (!isSameMethod) {
                    this.announce(`Selected ${method.displayName} payment`);
                }

                if (this.form.email && this._emailCaptured !== this.form.email) {
                    await this.captureEmail();
                }

                if (!this.paymentSession && this.form.email) {
                    await this.initializePaymentForm(method);
                }
            },

            /**
             * Initialize the payment form for hosted fields or direct form integrations.
             *
             * CRITICAL FLOW:
             * 1. Cancel pending address captures (we'll save fresh data)
             * 2. Set express re-render skip to prevent PayPal button flicker
             * 3. Pre-save addresses (some providers need this for fraud checks)
             * 4. Create payment session (this may create an invoice on backend)
             * 5. Render the payment form in the appropriate container
             * 6. Clear the re-render skip flag when done
             *
             * REQUEST ID PATTERN is used here too - if user rapidly clicks
             * different payment methods, only the latest one takes effect.
             *
             * @param {object} method - The payment method to initialize
             */
            async initializePaymentForm(method) {
                if (!method) return;
                if (!this.requiresPaymentForm(method.integrationType)) return;

                // REQUEST ID PATTERN: Track this request to handle rapid method switching.
                const requestId = ++this._paymentInitRequestId;
                const store = this.$store.checkout;

                // Cancel pending address capture - we'll save fresh data below
                debouncer.cancel('captureAddress');

                // Show skeleton loader while payment form initializes
                store?.setPaymentFormInitializing(true);

                // EXPRESS RE-RENDER SKIP: Temporarily prevent PayPal/express buttons
                // from disappearing while we set up the hosted payment form.
                // The flag is cleared in onReady/onError callbacks below.
                this.setExpressReRenderSkip(true);

                try {
                    // PRE-SAVE ADDRESSES: Some payment providers (e.g., Braintree with
                    // fraud tools) need customer address data during session creation
                    // for risk assessment. We save here so the backend has current data.
                    // Note: submitOrder() also saves addresses (includes password for account creation)
                    if (this.form.billing.name && this.form.billing.address1 && this.form.billing.countryCode) {
                        await checkoutApi.saveAddresses({
                            email: this.form.email,
                            billingAddress: this.form.billing,
                            shippingAddress: this.form.shipping,
                            shippingSameAsBilling: this.shippingSameAsBilling,
                            acceptsMarketing: this.form.acceptsMarketing
                        });
                    }

                    // STALE RESPONSE CHECK: User may have clicked a different payment
                    // method while addresses were saving. Abort if this request is stale.
                    if (requestId !== this._paymentInitRequestId) {
                        store?.setPaymentFormInitializing(false);
                        this.setExpressReRenderSkip(false);
                        return;
                    }

                    // Create the payment session. This may create an invoice on the backend
                    // with current basket totals. The invoice ID is returned in payData.
                    const payData = await checkoutApi.initiatePayment({
                        providerAlias: method.providerAlias,
                        methodAlias: method.methodAlias || null,
                        returnUrl: getCheckoutReturnUrl(),
                        cancelUrl: getCheckoutCancelUrl()
                    });

                    if (requestId !== this._paymentInitRequestId) {
                        store?.setPaymentFormInitializing(false);
                        this.setExpressReRenderSkip(false);
                        return;
                    }

                    if (payData.success && window.MerchelloPayment) {
                        store?.setPaymentSession(payData);

                        const containerId = PAYMENT_CONTAINER_IDS[payData.integrationType] || 'hosted-fields-container';

                        await window.MerchelloPayment.handlePaymentFlow(payData, {
                            containerId,
                            onReady: () => {
                                store?.setPaymentFormInitializing(false);
                                this.setExpressReRenderSkip(false);
                                this.announce('Payment form ready');
                            },
                            onError: (err) => {
                                store?.setPaymentFormInitializing(false);
                                this.setExpressReRenderSkip(false);
                                console.error('Payment form setup failed:', err);
                                store?.setPaymentError(err.message || 'Failed to load payment form');
                            }
                        });
                    } else if (!payData.success) {
                        store?.setPaymentFormInitializing(false);
                        this.setExpressReRenderSkip(false);
                        console.error('Payment session creation failed:', payData.errorMessage);
                        store?.setPaymentMethod(null);
                        store?.setPaymentError(payData.errorMessage || 'Failed to initialize payment');
                    } else {
                        // Edge case: payData.success is true but MerchelloPayment handler not available
                        store?.setPaymentFormInitializing(false);
                        this.setExpressReRenderSkip(false);
                        console.error('Payment handler not available');
                        store?.setPaymentError('Payment system not available. Please refresh the page.');
                    }
                } catch (error) {
                    if (requestId !== this._paymentInitRequestId) {
                        store?.setPaymentFormInitializing(false);
                        this.setExpressReRenderSkip(false);
                        return;
                    }
                    store?.setPaymentFormInitializing(false);
                    this.setExpressReRenderSkip(false);
                    console.error('Failed to initialize payment form:', error);
                    store?.setPaymentMethod(null);
                    store?.setPaymentError('Failed to load payment form. Please try again.');
                }
            },

            // ============================================
            // Account Methods
            // ============================================

            async checkEmailForAccount() {
                if (!this.form.email) return;
                this.checkingEmail = true;
                try {
                    const data = await checkoutApi.checkEmail(this.form.email);
                    this.hasExistingAccount = data.hasExistingAccount;
                } catch {
                    this.hasExistingAccount = false;
                } finally {
                    this.checkingEmail = false;
                }
            },

            /**
             * Check if email belongs to an existing account (for hiding create account button).
             * This is a silent check that only updates store state - it does NOT trigger sign-in flow.
             * Used on email blur to hide the "Create an account" button for existing customers.
             */
            async checkEmailForAccountVisibility() {
                if (!this.form.email) return;
                const store = this.$store.checkout;

                try {
                    const data = await checkoutApi.checkEmail(this.form.email);
                    store?.setEmailHasAccount(data.hasExistingAccount === true);
                } catch {
                    // Silently fail - don't disrupt checkout flow
                    // Keep button visible if check fails
                    store?.setEmailHasAccount(false);
                }
            },

            async validatePassword() {
                if (!this.form.password) {
                    this.passwordErrors = [];
                    this.passwordValid = false;
                    return;
                }
                this.validatingPassword = true;
                try {
                    const data = await checkoutApi.validatePassword(this.form.password);
                    this.passwordErrors = data.errors || [];
                    this.passwordValid = data.isValid;
                } catch {
                    this.passwordErrors = ['Unable to validate password'];
                    this.passwordValid = false;
                } finally {
                    this.validatingPassword = false;
                }
            },

            async attemptSignIn() {
                this.signingIn = true;
                this.signInError = '';
                try {
                    const data = await checkoutApi.signIn(this.form.email, this.form.password);
                    if (data.success) {
                        this.isSignedIn = true;
                        this.signInError = '';
                        this.showForgotPassword = false;
                    } else {
                        this.signInError = data.errorMessage || 'Sign in failed';
                        this.showForgotPassword = data.showForgotPassword || false;
                    }
                } catch {
                    this.signInError = 'Unable to sign in. Please try again.';
                } finally {
                    this.signingIn = false;
                }
            },

            cancelAccountSection() {
                // Don't allow canceling if digital products require account
                const store = this.$store.checkout;
                if (store?.hasDigitalProducts && !store?.isLoggedIn) {
                    return; // Can't cancel - account required for digital products
                }

                this.showAccountSection = false;
                this.form.password = '';
                this.passwordErrors = [];
                this.passwordValid = false;
                this.signInError = '';
                this.showForgotPassword = false;
                this.isSignedIn = false;
                this.hasExistingAccount = false;
            },

            openForgotPassword() {
                // Show inline modal instead of opening new tab
                this.forgotPasswordError = '';
                this.forgotPasswordSuccess = false;
                this.forgotPasswordLoading = false;
                this.showForgotPasswordModal = true;
            },

            closeForgotPasswordModal() {
                this.showForgotPasswordModal = false;
                // Reset state after close
                setTimeout(() => {
                    this.forgotPasswordError = '';
                    this.forgotPasswordSuccess = false;
                    this.forgotPasswordLoading = false;
                }, 300);
            },

            async sendForgotPasswordEmail() {
                if (!this.form.email || this.forgotPasswordLoading) return;

                this.forgotPasswordLoading = true;
                this.forgotPasswordError = '';

                try {
                    const result = await checkoutApi.forgotPassword(this.form.email);
                    // Always show success (API returns success to prevent email enumeration)
                    this.forgotPasswordSuccess = true;
                } catch (err) {
                    this.forgotPasswordError = 'Unable to send reset email. Please try again.';
                } finally {
                    this.forgotPasswordLoading = false;
                }
            },

            // ============================================
            // Validation
            // ============================================

            validateField(field) {
                const store = this.$store.checkout;
                store?.clearError(field);

                if (field === 'email') {
                    if (!this.form.email) {
                        store?.setError('email', 'Email is required.');
                    } else if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(this.form.email)) {
                        store?.setError('email', 'Please enter a valid email address.');
                    } else {
                        if (window.MerchelloSinglePageAnalytics) {
                            window.MerchelloSinglePageAnalytics.trackContactInfo(this.form.email);
                        }
                        this.captureEmail().catch(err => console.error('Email capture failed:', err));

                        // Check if email belongs to an existing account (for hiding create account button)
                        // Only check if user is not already logged in
                        if (!store?.isLoggedIn) {
                            this.checkEmailForAccountVisibility()
                                .catch(err => console.error('Email account check failed:', err));
                        }

                        if (this.selectedPaymentMethod && !this.paymentSession) {
                            this.initializePaymentForm(this.selectedPaymentMethod)
                                .catch(err => console.error('Payment form init failed:', err));
                        }
                    }
                } else if (field.startsWith('billing.') || field.startsWith('shipping.')) {
                    const [prefix, key] = field.split('.');
                    const requiredFields = ['name', 'address1', 'city', 'countryCode', 'postalCode'];
                    if (requiredFields.includes(key) && !this.form[prefix][key]) {
                        store?.setError(field, 'This field is required.');
                    } else if (key === 'phone') {
                        const result = validatePhone(this.form[prefix].phone);
                        if (!result.isValid) {
                            store?.setError(field, result.error);
                        }
                    }
                }
            },

            validate() {
                const store = this.$store.checkout;
                store?.clearAllErrors();
                store?.setGeneralError('');

                this.validateField('email');
                ['name', 'address1', 'city', 'countryCode', 'postalCode'].forEach(f => this.validateField('billing.' + f));
                this.validateField('billing.phone');

                if (!this.shippingSameAsBilling) {
                    ['name', 'address1', 'city', 'countryCode', 'postalCode'].forEach(f => {
                        if (!this.form.shipping[f]) store?.setError('shipping.' + f, 'This field is required.');
                    });
                    this.validateField('shipping.phone');
                }

                if (!this.allShippingSelected) store?.setGeneralError('Please select a shipping method.');
                if (!this.selectedPaymentMethod) store?.setGeneralError(this.generalError || 'Please select a payment method.');

                return Object.keys(this.errors).length === 0 && !this.generalError;
            },

            // ============================================
            // Order Submission
            // ============================================

            /**
             * Submit the order for payment processing.
             *
             * CRITICAL FLOW:
             * 1. Validate all form fields
             * 2. Set isSubmitting = true (blocks payment form re-init, see PHANTOM ORDER PREVENTION)
             * 3. Save addresses to backend (with optional password for account creation)
             * 4. Save shipping selections to backend
             * 5. Get or create payment session
             * 6. For redirect payments: redirect to provider
             * 7. For hosted fields: submit payment via MerchelloPayment handler
             * 8. On success: redirect to confirmation page
             *
             * IMPORTANT: The isSubmitting flag MUST be set before any async operations
             * that might trigger basket updates. This prevents the reinitializePaymentFormIfActive()
             * function from creating new invoices during the submission process.
             */
            async submitOrder() {
                const store = this.$store.checkout;

                if (!this.validate()) {
                    const errorCount = Object.keys(this.errors).length;
                    this.announce(`Form has ${errorCount} error${errorCount !== 1 ? 's' : ''}. Please correct and try again.`);
                    return;
                }

                if (!this.selectedPaymentMethod) {
                    store?.setGeneralError('Please select a payment method.');
                    this.announce('Please select a payment method.');
                    return;
                }

                // CRITICAL: Set isSubmitting BEFORE any async calls.
                // This flag prevents reinitializePaymentFormIfActive() from running
                // during submission, which would create phantom orders.
                store?.setSubmitting(true);
                store?.setGeneralError('');
                this.announce('Processing your order...');

                try {
                    // Save addresses first - backend needs this for invoice creation.
                    // Also includes password if user is creating an account.
                    const addressData = await checkoutApi.saveAddresses({
                        email: this.form.email,
                        billingAddress: this.form.billing,
                        shippingAddress: this.form.shipping,
                        shippingSameAsBilling: this.shippingSameAsBilling,
                        acceptsMarketing: this.form.acceptsMarketing,
                        password: this.showAccountSection && !this.hasExistingAccount && this.form.password && this.passwordValid
                            ? this.form.password : null
                    });
                    if (!addressData.success) throw new Error(addressData.message || 'Failed to save addresses');

                    const shippingData = await checkoutApi.saveShipping(this.shippingSelections);
                    if (!shippingData.success) throw new Error(shippingData.message || 'Failed to save shipping');

                    // PAYMENT SESSION REUSE: If we already have a valid payment session
                    // for the selected method (created when user selected the payment method),
                    // reuse it. This prevents creating duplicate invoices.
                    // If session doesn't match (e.g., user changed method), create new one.
                    let payData;
                    if (this.paymentSessionMatchesMethod) {
                        payData = this.paymentSession;
                    } else {
                        payData = await checkoutApi.initiatePayment({
                            providerAlias: this.selectedPaymentMethod.providerAlias,
                            methodAlias: this.selectedPaymentMethod.methodAlias || null,
                            returnUrl: getCheckoutReturnUrl(),
                            cancelUrl: getCheckoutCancelUrl()
                        });
                        if (!payData.success) throw new Error(payData.errorMessage || 'Failed to initiate payment');
                        store?.setPaymentSession(payData);
                    }

                    if (payData.integrationType === 0 && payData.redirectUrl) {
                        safeRedirect(payData.redirectUrl, '/checkout', true);
                        return;
                    }

                    if (window.MerchelloPayment) {
                        if (!this.paymentSessionMatchesMethod) {
                            const containerId = PAYMENT_CONTAINER_IDS[payData.integrationType] || 'hosted-fields-container';

                            await window.MerchelloPayment.handlePaymentFlow(payData, {
                                containerId,
                                onReady: () => this.announce('Payment form ready. Please complete your payment details.'),
                                onError: (err) => {
                                    store?.setPaymentError(err.message || 'Payment setup failed');
                                    store?.setSubmitting(false);
                                }
                            });
                        }

                        if (payData.integrationType !== 0) {
                            const paymentResult = await window.MerchelloPayment.submitPayment(payData.invoiceId);
                            if (paymentResult.success) {
                                // Use redirectUrl from payment result (includes invoice ID from backend)
                                // This handles DirectForm where invoiceId is created during payment
                                safeRedirect(paymentResult.redirectUrl || `/checkout/confirmation/${paymentResult.invoiceId || payData.invoiceId}`);
                            } else {
                                throw new Error(paymentResult.errorMessage || 'Payment failed');
                            }
                        }
                    } else {
                        safeRedirect(`/checkout/confirmation/${payData.invoiceId}`);
                    }
                } catch (error) {
                    console.error('Order submission failed:', error);
                    store?.setGeneralError(error.message || 'An error occurred. Please try again.');
                    this.announce(this.generalError);
                } finally {
                    store?.setSubmitting(false);
                }
            }
        };
    });
}

export default { initSinglePageCheckout };
