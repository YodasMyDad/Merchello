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

            _emailCaptured: '',
            _lastAddressHash: '',
            _shippingRequestId: 0,
            _paymentInitRequestId: 0,
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

            // ============================================
            // Lifecycle
            // ============================================

            async init() {
                const store = this.$store.checkout;
                const initialData = this.getInitialDataFromStore();

                // Sync local state from store
                this.shippingSameAsBilling = store?.form?.sameAsBilling ?? true;
                this._shippingCalculated = (store?.shippingGroups?.length ?? 0) > 0;

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
            },

            getInitialDataFromStore() {
                return {
                    email: this.$store.checkout?.form?.email ?? '',
                    billing: this.$store.checkout?.form?.billing ?? {},
                    shipping: this.$store.checkout?.form?.shipping ?? {}
                };
            },

            // ============================================
            // Helper Methods (kept for template compatibility)
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
                    expressEl._x_dataStack[0]._skipReRender = skip;
                }
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

                    if (requestId !== this._shippingRequestId) return;

                    if (data.success) {
                        const groups = data.shippingGroups || [];
                        groups.forEach(group => {
                            if (group.shippingOptions?.length > 1) {
                                group.shippingOptions = sortShippingOptions(group.shippingOptions);
                            }
                        });

                        // Build selections, preserving user's previous choice if still valid
                        const selections = {};
                        groups.forEach(g => {
                            const previousSelection = this.shippingSelections[g.groupId];
                            const previousSelectionStillValid = previousSelection &&
                                g.shippingOptions?.some(o => o.id === previousSelection);

                            if (previousSelectionStillValid) {
                                selections[g.groupId] = previousSelection;
                            } else if (g.selectedShippingOptionId) {
                                const optionExists = g.shippingOptions?.some(o => o.id === g.selectedShippingOptionId);
                                if (optionExists) selections[g.groupId] = g.selectedShippingOptionId;
                            }
                        });

                        store?.updateShipping(groups, selections);

                        if (data.basket) {
                            store?.updateBasket({
                                total: data.basket.displayTotal ?? data.basket.total,
                                shipping: data.basket.displayShipping ?? data.basket.shipping ?? 0,
                                tax: data.basket.displayTax ?? data.basket.tax ?? 0
                            });
                            this.dispatchBasketUpdate();

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

            async initializePaymentForm(method) {
                if (!method) return;
                if (![IntegrationType.HostedFields, IntegrationType.DirectForm].includes(method.integrationType)) return;

                const requestId = ++this._paymentInitRequestId;
                const store = this.$store.checkout;
                debouncer.cancel('captureAddress');

                // Show skeleton loader while payment form initializes
                store?.setPaymentFormInitializing(true);
                // Prevent express buttons from re-rendering during payment init
                // (normal shipping/basket changes will still update when flag is reset)
                this.setExpressReRenderSkip(true);

                try {
                    // Pre-save addresses before payment session creation
                    // Some providers need address data for fraud checks during session setup
                    // Note: submitOrder() also saves addresses to include password for account creation
                    if (this.form.billing.name && this.form.billing.address1 && this.form.billing.countryCode) {
                        await checkoutApi.saveAddresses({
                            email: this.form.email,
                            billingAddress: this.form.billing,
                            shippingAddress: this.form.shipping,
                            shippingSameAsBilling: this.shippingSameAsBilling,
                            acceptsMarketing: this.form.acceptsMarketing
                        });
                    }

                    if (requestId !== this._paymentInitRequestId) {
                        store?.setPaymentFormInitializing(false);
                        this.setExpressReRenderSkip(false);
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
                        this.captureEmail();
                        if (this.selectedPaymentMethod && !this.paymentSession) {
                            this.initializePaymentForm(this.selectedPaymentMethod);
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
                        if (!payData.success) throw new Error(payData.errorMessage || 'Failed to initiate payment');
                        store?.setPaymentSession(payData);
                    }

                    if (payData.integrationType === 0 && payData.redirectUrl) {
                        safeRedirect(payData.redirectUrl);
                        return;
                    }

                    if (window.MerchelloPayment) {
                        if (!sessionMatchesMethod) {
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
