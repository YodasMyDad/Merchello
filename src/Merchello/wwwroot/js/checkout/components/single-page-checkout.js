// @ts-check
/**
 * Merchello Checkout - Single Page Checkout Orchestrator
 *
 * Main component that coordinates all checkout sub-components.
 * Handles the overall checkout flow, validation, and submission.
 */

import { checkoutApi } from '../services/api.js';
import { validatePhone } from '../services/validation.js';
import { createDebouncer } from '../utils/debounce.js';
import { calculateShippingTotal } from '../utils/shipping-calculator.js';
import { safeRedirect } from '../utils/security.js';

/**
 * Read initial checkout data from the DOM
 * @returns {Object}
 */
function getInitialDataFromDOM() {
    const element = document.getElementById('checkout-initial-data');
    if (!element) return {};

    try {
        return JSON.parse(element.textContent || '{}');
    } catch (e) {
        console.warn('Failed to parse checkout initial data:', e);
        return {};
    }
}

/**
 * Initialize the single page checkout Alpine.data component
 */
export function initSinglePageCheckout() {
    // @ts-ignore - Alpine is global
    Alpine.data('singlePageCheckout', () => {
        console.log('[singlePageCheckout] Creating component...');
        try {
            const debouncer = createDebouncer();

            // Read initial data from DOM (set by server via JSON script block)
            const initialData = getInitialDataFromDOM();

            // Parse shipping groups from initial data
            const initialGroups = initialData.shippingGroups || [];
            const initialSelections = {};
            initialGroups.forEach(g => {
                if (g.selectedOptionId) {
                    initialSelections[g.groupId] = g.selectedOptionId;
                }
            });

            const componentData = {
            // ============================================
            // Form State (local - bound via x-model)
            // ============================================

            form: {
                email: initialData.email || '',
                billing: {
                    name: initialData.billing?.name || '',
                    company: initialData.billing?.company || '',
                    address1: initialData.billing?.address1 || '',
                    address2: initialData.billing?.address2 || '',
                    city: initialData.billing?.city || '',
                    state: initialData.billing?.state || '',
                    stateCode: initialData.billing?.stateCode || '',
                    country: initialData.billing?.country || '',
                    countryCode: initialData.billing?.countryCode || '',
                    postalCode: initialData.billing?.postalCode || '',
                    phone: initialData.billing?.phone || ''
                },
                shipping: {
                    name: initialData.shipping?.name || '',
                    company: initialData.shipping?.company || '',
                    address1: initialData.shipping?.address1 || '',
                    address2: initialData.shipping?.address2 || '',
                    city: initialData.shipping?.city || '',
                    state: initialData.shipping?.state || '',
                    stateCode: initialData.shipping?.stateCode || '',
                    country: initialData.shipping?.country || '',
                    countryCode: initialData.shipping?.countryCode || '',
                    postalCode: initialData.shipping?.postalCode || '',
                    phone: initialData.shipping?.phone || ''
                },
                acceptsMarketing: false,
                password: ''
            },

            // ============================================
            // Account State (local - UI specific)
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

            // ============================================
            // Address State (local - UI specific)
            // ============================================

            shippingSameAsBilling: true,
            billingRegions: [],
            shippingRegions: [],

            // ============================================
            // Shipping State (from store)
            // ============================================

            /** @returns {Array} */
            get shippingGroups() { return this.$store.checkout?.shippingGroups ?? []; },
            /** @returns {Object} */
            get shippingSelections() { return this.$store.checkout?.shippingSelections ?? {}; },
            /** @returns {boolean} */
            get shippingLoading() { return this.$store.checkout?.shippingLoading ?? false; },
            /** @returns {string|null} */
            get shippingError() { return this.$store.checkout?.shippingError ?? null; },
            /** @returns {Array} */
            get itemAvailabilityErrors() { return this.$store.checkout?.itemAvailabilityErrors ?? []; },
            /** @returns {boolean} */
            get allItemsShippable() { return this.$store.checkout?.allItemsShippable ?? true; },
            _shippingCalculated: initialGroups.length > 0,

            // ============================================
            // Payment State (from store)
            // ============================================

            /** @returns {boolean} */
            get paymentLoading() { return this.$store.checkout?.paymentLoading ?? true; },
            /** @returns {string|null} */
            get paymentError() { return this.$store.checkout?.paymentError ?? null; },
            /** @returns {Array} */
            get paymentMethods() { return this.$store.checkout?.paymentMethods ?? []; },
            cardPaymentMethods: [],
            redirectPaymentMethods: [],
            /** @returns {Object|null} */
            get selectedPaymentMethod() { return this.$store.checkout?.selectedPaymentMethod ?? null; },
            selectedPaymentMethodKey: '',
            /** @returns {Object|null} */
            get paymentSession() { return this.$store.checkout?.paymentSession ?? null; },
            /** @returns {string|null} */
            get invoiceId() { return this.$store.checkout?.invoiceId ?? null; },

            // ============================================
            // Validation State (from store)
            // ============================================

            /** @returns {Object} */
            get errors() { return this.$store.checkout?.errors ?? {}; },
            /** @returns {string} */
            get generalError() { return this.$store.checkout?.generalError ?? ''; },

            // ============================================
            // UI State
            // ============================================

            /** @returns {boolean} */
            get isSubmitting() { return this.$store.checkout?.isSubmitting ?? false; },
            announcement: '',
            _emailCaptured: '',
            _lastAddressHash: '',
            _shippingRequestId: 0,
            _paymentInitRequestId: 0,

            // Basket totals (from store)
            /** @returns {number} */
            get basketTotal() { return this.$store.checkout?.basket?.total ?? 0; },
            /** @returns {number} */
            get basketShipping() { return this.$store.checkout?.basket?.shipping ?? 0; },
            /** @returns {number} */
            get basketTax() { return this.$store.checkout?.basket?.tax ?? 0; },
            /** @returns {string} */
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
                    g.shippingOptions.length === 0 || this.shippingSelections[g.groupId]
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
                return this.currencySymbol + this.basketTotal.toFixed(2);
            },

            /**
             * Calculate total shipping from selected options.
             * Uses shared utility to avoid duplication - single source of truth.
             * Note: This is a display calculation only; backend validates actual totals.
             */
            get calculatedShipping() {
                return calculateShippingTotal(this.shippingGroups, this.shippingSelections);
            },

            // ============================================
            // Lifecycle
            // ============================================

            async init() {
                // Sync form data to store (store is initialized first in index.js)
                // @ts-ignore - Alpine store
                const store = this.$store.checkout;
                if (store) {
                    // Sync local form to store for other components
                    store.setEmail(this.form.email);
                    store.updateBillingAddress(this.form.billing);
                    store.updateShippingAddress(this.form.shipping);
                    store.form.sameAsBilling = this.shippingSameAsBilling;
                }

                // Load billing regions
                if (this.form.billing.countryCode) {
                    await this.loadRegions('billing', this.form.billing.countryCode);
                    if (this.shippingSameAsBilling) {
                        this.shippingRegions = [...this.billingRegions];
                    }
                }

                // Load shipping regions if different
                if (!this.shippingSameAsBilling && this.form.shipping.countryCode) {
                    await this.loadRegions('shipping', this.form.shipping.countryCode);
                }

                // Sort initial shipping options
                if (this.shippingGroups.length > 0) {
                    this.sortShippingOptions();
                }

                // Calculate shipping if needed
                const needsShippingCalc = !this._shippingCalculated ||
                    (this._shippingCalculated && this.basketShipping === 0 && this.allShippingSelected);
                if (this.form.shipping.countryCode && needsShippingCalc) {
                    await this.calculateShipping();
                }

                // Load payment methods
                await this.loadPaymentMethods();

                // Sync totals with order summary
                this.$nextTick(() => {
                    if (this.calculatedShipping > 0 || this._shippingCalculated) {
                        this.dispatchBasketUpdate();
                    }
                });

                // Track checkout begin
                if (window.MerchelloSinglePageAnalytics) {
                    window.MerchelloSinglePageAnalytics.trackBegin();
                }
            },

            // ============================================
            // Helper Methods
            // ============================================

            announce(message) {
                this.announcement = '';
                setTimeout(() => { this.announcement = message; }, 100);
                // @ts-ignore - Alpine store
                this.$store.checkout?.announce(message);
            },

            dispatchBasketUpdate() {
                document.dispatchEvent(new CustomEvent('merchello:basket-updated', {
                    detail: {
                        shipping: this.basketShipping,
                        tax: this.basketTax,
                        total: this.basketTotal,
                        subTotal: this.basketTotal - this.basketShipping - this.basketTax
                    }
                }));

                // Also update store
                // @ts-ignore - Alpine store
                this.$store.checkout?.updateBasket({
                    total: this.basketTotal,
                    shipping: this.basketShipping,
                    tax: this.basketTax
                });
            },

            sortShippingOptions() {
                this.shippingGroups.forEach(group => {
                    if (group.shippingOptions && group.shippingOptions.length > 1) {
                        group.shippingOptions.sort((a, b) => {
                            if (a.isNextDay && !b.isNextDay) return -1;
                            if (!a.isNextDay && b.isNextDay) return 1;
                            return a.cost - b.cost;
                        });
                    }
                });
            },

            getSelectedShippingName(group) {
                const selectedId = this.shippingSelections[group.groupId];
                if (selectedId && group.shippingOptions) {
                    const selected = group.shippingOptions.find(o => o.id === selectedId);
                    if (selected) return selected.name;
                }
                return 'Select shipping method';
            },

            // ============================================
            // Region Loading
            // ============================================

            async loadRegions(addressType, countryCode) {
                if (!countryCode) {
                    if (addressType === 'billing') this.billingRegions = [];
                    else this.shippingRegions = [];
                    return;
                }

                try {
                    const regions = await checkoutApi.getRegions(addressType, countryCode);
                    if (addressType === 'billing') this.billingRegions = regions;
                    else this.shippingRegions = regions;
                } catch (error) {
                    console.error('Failed to load regions:', error);
                }
            },

            // ============================================
            // Address Handlers
            // ============================================

            syncBillingToShipping() {
                Object.keys(this.form.billing).forEach(key => {
                    this.form.shipping[key] = this.form.billing[key];
                });
            },

            async onBillingCountryChange() {
                this.form.billing.state = '';
                this.form.billing.stateCode = '';
                await this.loadRegions('billing', this.form.billing.countryCode);

                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.shippingRegions = [...this.billingRegions];
                    this.debouncedCalculateShipping();
                }
                this.debouncedCaptureAddress();
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
            },

            async onShippingCountryChange() {
                this.form.shipping.state = '';
                this.form.shipping.stateCode = '';
                await this.loadRegions('shipping', this.form.shipping.countryCode);
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
            // Email Capture
            // ============================================

            async captureEmail() {
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

            // ============================================
            // Address Auto-Save
            // ============================================

            /**
             * Capture address data for persistence across sessions.
             * Called on address field blur via debounce.
             */
            async captureAddress() {
                // Build address hash to check if anything changed
                const addressHash = JSON.stringify({
                    email: this.form.email,
                    billing: this.form.billing,
                    shipping: this.shippingSameAsBilling ? this.form.billing : this.form.shipping,
                    shippingSameAsBilling: this.shippingSameAsBilling
                });

                // Skip if nothing changed
                if (this._lastAddressHash === addressHash) return;

                // Only capture if we have at least some data worth saving
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

            /**
             * Debounced address capture - called on field blur
             */
            debouncedCaptureAddress() {
                debouncer.debounce('captureAddress', () => this.captureAddress(), 500);
            },

            // ============================================
            // Shipping Calculation
            // ============================================

            /**
             * Debounced shipping calculation.
             * Note: Address capture is now handled separately in event handlers
             * to prevent race condition where shipping calc uses stale address data.
             * Call debouncedCaptureAddress() separately when needed.
             */
            debouncedCalculateShipping() {
                if (!this.canCalculateShipping) return;
                debouncer.debounce('shipping', () => this.calculateShipping(), 500);
            },

            async calculateShipping() {
                if (!this.canCalculateShipping) return;

                // Track request ID to ignore stale responses (race condition fix)
                const requestId = ++this._shippingRequestId;
                const store = this.$store.checkout;

                store?.setShippingLoading(true);
                store?.setShippingError(null);

                try {
                    const data = await checkoutApi.initialize({
                        countryCode: this.form.shipping.countryCode,
                        stateCode: this.form.shipping.stateCode,
                        autoSelectCheapestShipping: true,
                        email: this.form.email
                    });

                    // Ignore stale response if a newer request was made
                    if (requestId !== this._shippingRequestId) {
                        return;
                    }

                    if (data.success) {
                        const groups = data.shippingGroups || [];
                        // Sort options within groups
                        groups.forEach(group => {
                            if (group.shippingOptions && group.shippingOptions.length > 1) {
                                group.shippingOptions.sort((a, b) => {
                                    if (a.isNextDay && !b.isNextDay) return -1;
                                    if (!a.isNextDay && b.isNextDay) return 1;
                                    return a.cost - b.cost;
                                });
                            }
                        });

                        // Build selections from auto-selected options
                        const selections = { ...this.shippingSelections };
                        groups.forEach(g => {
                            if (g.selectedShippingOptionId) {
                                const optionExists = g.shippingOptions?.some(o => o.id === g.selectedShippingOptionId);
                                if (optionExists) {
                                    selections[g.groupId] = g.selectedShippingOptionId;
                                }
                            }
                        });

                        // Update store with shipping data
                        store?.updateShipping(groups, selections);

                        // Update basket totals - prefer display currency amounts
                        if (data.basket) {
                            store?.updateBasket({
                                total: data.basket.displayTotal ?? data.basket.total,
                                shipping: data.basket.displayShipping ?? data.basket.shipping ?? 0,
                                tax: data.basket.displayTax ?? data.basket.tax ?? 0
                            });
                            this.dispatchBasketUpdate();

                            // Check for item-level shipping errors
                            if (data.basket.errors && data.basket.errors.length > 0) {
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
                            // No specific errors but calculation failed - assume items may not be shippable
                            store.allItemsShippable = false;
                        }

                        if (window.MerchelloSinglePageAnalytics) {
                            window.MerchelloSinglePageAnalytics.trackError('shipping_unavailable', data.message || 'Unable to calculate shipping');
                        }
                    }
                } catch (error) {
                    // Ignore errors from stale requests
                    if (requestId !== this._shippingRequestId) {
                        return;
                    }
                    console.error('Failed to calculate shipping:', error);
                    store?.setShippingError('An error occurred while calculating shipping.');
                    store.allItemsShippable = false;
                    store?.updateShipping([], {});

                    if (window.MerchelloSinglePageAnalytics) {
                        window.MerchelloSinglePageAnalytics.trackError('shipping_calculation', error.message || 'Failed to calculate shipping');
                    }
                } finally {
                    // Only update loading state if this is the current request
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
                        // Use display currency amounts - update via store
                        this.$store.checkout?.updateBasket({
                            total: data.basket.displayTotal ?? data.basket.total,
                            shipping: data.basket.displayShipping ?? data.basket.shipping ?? 0,
                            tax: data.basket.displayTax ?? data.basket.tax ?? 0
                        });
                        this.dispatchBasketUpdate();
                    }
                } catch (error) {
                    console.error('Failed to update shipping totals:', error);
                }
            },

            // ============================================
            // Payment Methods
            // ============================================

            async loadPaymentMethods() {
                const store = this.$store.checkout;
                store?.setPaymentLoading(true);
                store?.setPaymentError(null);

                try {
                    const methods = await checkoutApi.getPaymentMethods();
                    store?.setPaymentMethods(methods || []);

                    // Use named constants from MerchelloPayment for integration types
                    const IntegrationType = window.MerchelloPayment?.IntegrationType ?? { HostedFields: 10, DirectForm: 30 };
                    const formBasedTypes = [IntegrationType.HostedFields, IntegrationType.DirectForm];
                    this.cardPaymentMethods = this.paymentMethods.filter(m => formBasedTypes.includes(m.integrationType));
                    this.redirectPaymentMethods = this.paymentMethods.filter(m => !formBasedTypes.includes(m.integrationType));
                } catch (error) {
                    console.error('Failed to load payment methods:', error);
                    store?.setPaymentError('Unable to load payment methods. Please refresh the page.');

                    if (window.MerchelloSinglePageAnalytics) {
                        window.MerchelloSinglePageAnalytics.trackError('payment_methods_load', error.message || 'Failed to load payment methods');
                    }
                } finally {
                    store?.setPaymentLoading(false);
                }
            },

            async onPaymentMethodChange(method) {
                const store = this.$store.checkout;
                const isSameMethod = this.selectedPaymentMethod?.providerAlias === method.providerAlias
                    && this.selectedPaymentMethod?.methodAlias === method.methodAlias;

                if (isSameMethod && this.paymentSession) {
                    return;
                }

                store?.setPaymentMethod(method);
                store?.setPaymentError(null);

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

            async initializePaymentForm(method) {
                if (!method) return;

                // Only initialize for form-based methods (HostedFields, DirectForm)
                const IntegrationType = window.MerchelloPayment?.IntegrationType ?? { HostedFields: 10, DirectForm: 30 };
                if (![IntegrationType.HostedFields, IntegrationType.DirectForm].includes(method.integrationType)) {
                    return;
                }

                // Track request ID to handle race conditions when user switches methods quickly
                const requestId = ++this._paymentInitRequestId;
                const store = this.$store.checkout;

                // Cancel any pending address capture to avoid duplicate requests
                debouncer.cancel('captureAddress');

                try {
                    // Save addresses first to ensure backend has billing info before creating payment session
                    // This prevents race condition where debounced captureAddress hasn't completed yet
                    if (this.form.billing.name && this.form.billing.address1 && this.form.billing.countryCode) {
                        await checkoutApi.saveAddresses({
                            email: this.form.email,
                            billingAddress: this.form.billing,
                            shippingAddress: this.form.shipping,
                            shippingSameAsBilling: this.shippingSameAsBilling,
                            acceptsMarketing: this.form.acceptsMarketing
                        });
                    }

                    // Check if user switched to a different payment method while we were saving addresses
                    if (requestId !== this._paymentInitRequestId) {
                        return;
                    }

                    const returnUrl = window.location.origin + '/checkout/return';
                    const cancelUrl = window.location.origin + '/checkout/cancel';

                    const payData = await checkoutApi.initiatePayment({
                        providerAlias: method.providerAlias,
                        methodAlias: method.methodAlias || null,
                        returnUrl,
                        cancelUrl
                    });

                    // Check again if user switched methods while payment was initializing
                    if (requestId !== this._paymentInitRequestId) {
                        return;
                    }

                    if (payData.success && window.MerchelloPayment) {
                        store?.setPaymentSession(payData);

                        let containerId = 'hosted-fields-container';
                        if (payData.integrationType === 30) {
                            containerId = 'direct-form-container';
                        } else if (payData.integrationType === 20) {
                            containerId = 'widget-container';
                        }

                        await window.MerchelloPayment.handlePaymentFlow(payData, {
                            containerId,
                            onReady: () => {
                                this.announce('Payment form ready');
                            },
                            onError: (err) => {
                                console.error('Payment form setup failed:', err);
                                store?.setPaymentError(err.message || 'Failed to load payment form');

                                if (window.MerchelloSinglePageAnalytics) {
                                    window.MerchelloSinglePageAnalytics.trackError('payment_form_setup', err.message || 'Payment form setup failed');
                                }
                            }
                        });
                    } else if (!payData.success) {
                        console.error('Payment session creation failed:', payData.errorMessage);
                        store?.setPaymentError(payData.errorMessage || 'Failed to initialize payment');

                        if (window.MerchelloSinglePageAnalytics) {
                            window.MerchelloSinglePageAnalytics.trackError('payment_session', payData.errorMessage || 'Payment session creation failed');
                        }
                    }
                } catch (error) {
                    // Ignore errors from stale requests
                    if (requestId !== this._paymentInitRequestId) {
                        return;
                    }
                    console.error('Failed to initialize payment form:', error);
                    store?.setPaymentError('Failed to load payment form. Please try again.');

                    if (window.MerchelloSinglePageAnalytics) {
                        window.MerchelloSinglePageAnalytics.trackError('payment_form', error.message || 'Failed to initialize payment form');
                    }
                }
            },

            getPaymentMethodIcon(method) {
                if (window.MerchelloPayment && typeof window.MerchelloPayment.getMethodIcon === 'function') {
                    return window.MerchelloPayment.getMethodIcon(method);
                }
                return '<svg class="w-6 h-5" viewBox="0 0 24 20" fill="currentColor"><rect x="1" y="1" width="22" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="22" height="4" fill="currentColor" opacity="0.3"/></svg>';
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
                window.open('/forgot-password?email=' + encodeURIComponent(this.form.email), '_blank');
            },

            // ============================================
            // Validation
            // ============================================

            async validateField(field) {
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
                        await this.captureEmail();
                        if (this.selectedPaymentMethod && !this.paymentSession) {
                            await this.initializePaymentForm(this.selectedPaymentMethod);
                        }
                    }
                } else if (field.startsWith('billing.')) {
                    const key = field.replace('billing.', '');
                    const requiredFields = ['name', 'address1', 'city', 'countryCode', 'postalCode'];
                    if (requiredFields.includes(key) && !this.form.billing[key]) {
                        store?.setError(field, 'This field is required.');
                    } else if (key === 'phone') {
                        const result = validatePhone(this.form.billing.phone);
                        if (!result.isValid) {
                            store?.setError(field, result.error);
                        }
                    }
                } else if (field.startsWith('shipping.')) {
                    const key = field.replace('shipping.', '');
                    const requiredFields = ['name', 'address1', 'city', 'countryCode', 'postalCode'];
                    if (requiredFields.includes(key) && !this.form.shipping[key]) {
                        store?.setError(field, 'This field is required.');
                    } else if (key === 'phone') {
                        const result = validatePhone(this.form.shipping.phone);
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

                ['name', 'address1', 'city', 'countryCode', 'postalCode'].forEach(field => {
                    this.validateField('billing.' + field);
                });
                this.validateField('billing.phone');

                if (!this.shippingSameAsBilling) {
                    ['name', 'address1', 'city', 'countryCode', 'postalCode'].forEach(field => {
                        if (!this.form.shipping[field]) {
                            store?.setError('shipping.' + field, 'This field is required.');
                        }
                    });
                    this.validateField('shipping.phone');
                }

                if (!this.allShippingSelected) {
                    store?.setGeneralError('Please select a shipping method.');
                }

                if (!this.selectedPaymentMethod) {
                    store?.setGeneralError(this.generalError || 'Please select a payment method.');
                }

                return Object.keys(this.errors).length === 0 && !this.generalError;
            },

            // ============================================
            // Order Submission
            // ============================================

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

                store?.setSubmitting(true);
                store?.setGeneralError('');
                this.announce('Processing your order...');

                try {
                    // 1. Save addresses
                    const addressData = await checkoutApi.saveAddresses({
                        email: this.form.email,
                        billingAddress: this.form.billing,
                        shippingAddress: this.form.shipping,
                        shippingSameAsBilling: this.shippingSameAsBilling,
                        acceptsMarketing: this.form.acceptsMarketing,
                        password: this.showAccountSection && !this.hasExistingAccount && this.form.password && this.passwordValid
                            ? this.form.password
                            : null
                    });

                    if (!addressData.success) {
                        throw new Error(addressData.message || 'Failed to save addresses');
                    }

                    // 2. Save shipping selections
                    const shippingData = await checkoutApi.saveShipping(this.shippingSelections);

                    if (!shippingData.success) {
                        throw new Error(shippingData.message || 'Failed to save shipping');
                    }

                    // 3. Handle payment
                    const sessionMatchesMethod = this.paymentSession &&
                        this.paymentSession.providerAlias === this.selectedPaymentMethod.providerAlias &&
                        this.paymentSession.methodAlias === (this.selectedPaymentMethod.methodAlias || null);

                    let payData;

                    if (sessionMatchesMethod) {
                        payData = this.paymentSession;
                    } else {
                        const returnUrl = window.location.origin + '/checkout/return';
                        const cancelUrl = window.location.origin + '/checkout/cancel';

                        payData = await checkoutApi.initiatePayment({
                            providerAlias: this.selectedPaymentMethod.providerAlias,
                            methodAlias: this.selectedPaymentMethod.methodAlias || null,
                            returnUrl,
                            cancelUrl
                        });

                        if (!payData.success) {
                            throw new Error(payData.errorMessage || 'Failed to initiate payment');
                        }

                        store?.setPaymentSession(payData);
                    }

                    // 4. Handle payment flow
                    if (payData.integrationType === 0 && payData.redirectUrl) {
                        // Validate server-provided redirect URL before navigating
                        safeRedirect(payData.redirectUrl);
                        return;
                    }

                    if (window.MerchelloPayment) {
                        if (!sessionMatchesMethod) {
                            let containerId = 'hosted-fields-container';
                            if (payData.integrationType === 30) {
                                containerId = 'direct-form-container';
                            } else if (payData.integrationType === 20) {
                                containerId = 'widget-container';
                            }

                            await window.MerchelloPayment.handlePaymentFlow(payData, {
                                containerId,
                                onReady: () => {
                                    this.announce('Payment form ready. Please complete your payment details.');
                                },
                                onError: (err) => {
                                    store?.setPaymentError(err.message || 'Payment setup failed');
                                    store?.setSubmitting(false);

                                    if (window.MerchelloSinglePageAnalytics) {
                                        window.MerchelloSinglePageAnalytics.trackError('payment_flow', err.message || 'Payment setup failed');
                                    }
                                }
                            });
                        }

                        if (payData.integrationType !== 0) {
                            const paymentResult = await window.MerchelloPayment.submitPayment(payData.invoiceId);
                            if (paymentResult.success) {
                                safeRedirect(`/checkout/confirmation/${payData.invoiceId}`);
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

                    if (window.MerchelloSinglePageAnalytics) {
                        window.MerchelloSinglePageAnalytics.trackError('order_submission', error.message || 'Order submission failed');
                    }
                } finally {
                    store?.setSubmitting(false);
                }
            }
            };

            console.log('[singlePageCheckout] Component created successfully');
            return componentData;
        } catch (e) {
            console.error('[singlePageCheckout] FATAL - Component initialization failed:', e);
            throw e;
        }
    });
}

export default { initSinglePageCheckout };
