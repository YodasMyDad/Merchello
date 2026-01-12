// @ts-check
/**
 * Merchello Checkout - Single Page Checkout Orchestrator
 *
 * Main component that coordinates all checkout sub-components.
 * Handles the overall checkout flow, validation, and submission.
 */

import { checkoutApi } from '../services/api.js';
import { validateCheckoutForm } from '../services/validation.js';
import { createDebouncer } from '../utils/debounce.js';

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

        return {
            // ============================================
            // Form State
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
            // Account State
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
            // Address State
            // ============================================

            shippingSameAsBilling: true,
            billingRegions: [],
            shippingRegions: [],

            // ============================================
            // Shipping State
            // ============================================

            shippingGroups: initialGroups,
            shippingSelections: initialSelections,
            shippingLoading: false,
            shippingError: null,
            itemAvailabilityErrors: [],
            allItemsShippable: true,
            _shippingCalculated: initialGroups.length > 0,

            // ============================================
            // Payment State
            // ============================================

            paymentLoading: true,
            paymentError: null,
            paymentMethods: [],
            cardPaymentMethods: [],
            redirectPaymentMethods: [],
            selectedPaymentMethod: null,
            selectedPaymentMethodKey: '',
            paymentSession: null,
            invoiceId: null,

            // ============================================
            // Validation State
            // ============================================

            errors: {},
            generalError: '',

            // ============================================
            // UI State
            // ============================================

            isSubmitting: false,
            announcement: '',
            _emailCaptured: '',

            // Basket totals (from nested JSON structure)
            basketTotal: initialData.basket?.total || 0,
            basketShipping: initialData.basket?.shipping || 0,
            basketTax: initialData.basket?.tax || 0,
            currencySymbol: initialData.currency?.symbol || '£',

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

            get calculatedShipping() {
                let total = 0;
                for (const group of this.shippingGroups) {
                    const selectedId = this.shippingSelections[group.groupId];
                    if (selectedId && group.shippingOptions) {
                        const selected = group.shippingOptions.find(o => o.id === selectedId);
                        if (selected) {
                            total += selected.cost;
                        }
                    }
                }
                return total;
            },

            // ============================================
            // Lifecycle
            // ============================================

            async init() {
                // Initialize store with form data
                // @ts-ignore - Alpine store
                const store = this.$store.checkout;
                if (store) {
                    store.setEmail(this.form.email);
                    store.updateBillingAddress(this.form.billing);
                    store.updateShippingAddress(this.form.shipping);
                    store.shippingSameAsBilling = this.shippingSameAsBilling;
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
                    detail: { shipping: this.basketShipping, tax: this.basketTax, total: this.basketTotal }
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
            },

            onBillingStateChange() {
                const region = this.billingRegions.find(r => r.code === this.form.billing.stateCode);
                if (region) this.form.billing.state = region.name;

                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.debouncedCalculateShipping();
                }
            },

            onBillingFieldChange() {
                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.debouncedCalculateShipping();
                }
            },

            async onShippingCountryChange() {
                this.form.shipping.state = '';
                this.form.shipping.stateCode = '';
                await this.loadRegions('shipping', this.form.shipping.countryCode);
                this.debouncedCalculateShipping();
            },

            onShippingStateChange() {
                const region = this.shippingRegions.find(r => r.code === this.form.shipping.stateCode);
                if (region) this.form.shipping.state = region.name;
            },

            onShippingSameAsBillingChange() {
                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.shippingRegions = [...this.billingRegions];
                    this.debouncedCalculateShipping();
                }
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
            // Shipping Calculation
            // ============================================

            debouncedCalculateShipping() {
                if (!this.canCalculateShipping) return;
                debouncer.debounce('shipping', () => this.calculateShipping(), 500);
            },

            async calculateShipping() {
                if (!this.canCalculateShipping) return;

                this.shippingLoading = true;
                this.shippingError = null;

                try {
                    const data = await checkoutApi.initialize({
                        countryCode: this.form.shipping.countryCode,
                        stateCode: this.form.shipping.stateCode,
                        autoSelectCheapestShipping: true,
                        email: this.form.email
                    });

                    if (data.success) {
                        this.shippingGroups = data.shippingGroups || [];
                        this.sortShippingOptions();

                        // Apply auto-selected options
                        this.shippingGroups.forEach(g => {
                            if (g.selectedShippingOptionId) {
                                this.shippingSelections[g.groupId] = g.selectedShippingOptionId;
                            }
                        });

                        // Update basket totals
                        if (data.basket) {
                            this.basketTotal = data.basket.total;
                            this.basketShipping = data.basket.shipping ?? 0;
                            this.basketTax = data.basket.tax ?? 0;
                            this.dispatchBasketUpdate();

                            // Check for item-level shipping errors
                            if (data.basket.errors && data.basket.errors.length > 0) {
                                this.itemAvailabilityErrors = data.basket.errors.filter(e => e.isShippingError);
                                this.allItemsShippable = this.itemAvailabilityErrors.length === 0;
                            } else {
                                this.itemAvailabilityErrors = [];
                                this.allItemsShippable = true;
                            }
                        }

                        this._shippingCalculated = true;
                        this.announce(this.allItemsShippable ? 'Shipping options loaded' : 'Some items cannot be shipped to this location');
                    } else {
                        this.shippingError = data.message || 'Unable to calculate shipping.';

                        if (data.basket?.errors) {
                            this.itemAvailabilityErrors = data.basket.errors.filter(e => e.isShippingError);
                            this.allItemsShippable = this.itemAvailabilityErrors.length === 0;
                        }
                    }
                } catch (error) {
                    console.error('Failed to calculate shipping:', error);
                    this.shippingError = 'An error occurred while calculating shipping.';
                } finally {
                    this.shippingLoading = false;
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
                        this.basketTotal = data.basket.total;
                        this.basketShipping = data.basket.shipping ?? 0;
                        this.basketTax = data.basket.tax ?? 0;
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
                this.paymentLoading = true;
                this.paymentError = null;

                try {
                    const methods = await checkoutApi.getPaymentMethods();
                    this.paymentMethods = methods || [];

                    const formBasedTypes = [10, 30]; // HostedFields, DirectForm
                    this.cardPaymentMethods = this.paymentMethods.filter(m => formBasedTypes.includes(m.integrationType));
                    this.redirectPaymentMethods = this.paymentMethods.filter(m => !formBasedTypes.includes(m.integrationType));
                } catch (error) {
                    console.error('Failed to load payment methods:', error);
                    this.paymentError = 'Unable to load payment methods. Please refresh the page.';
                } finally {
                    this.paymentLoading = false;
                }
            },

            async onPaymentMethodChange(method) {
                const isSameMethod = this.selectedPaymentMethod?.providerAlias === method.providerAlias
                    && this.selectedPaymentMethod?.methodAlias === method.methodAlias;

                if (isSameMethod && this.paymentSession) {
                    return;
                }

                this.selectedPaymentMethod = method;
                this.paymentError = null;

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

                // Only initialize for form-based methods
                if (![10, 30].includes(method.integrationType)) {
                    return;
                }

                try {
                    const returnUrl = window.location.origin + '/checkout/return';
                    const cancelUrl = window.location.origin + '/checkout/cancel';

                    const payData = await checkoutApi.initiatePayment({
                        providerAlias: method.providerAlias,
                        methodAlias: method.methodAlias || null,
                        returnUrl,
                        cancelUrl
                    });

                    if (payData.success && window.MerchelloPayment) {
                        this.invoiceId = payData.invoiceId;
                        this.paymentSession = payData;

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
                                this.paymentError = err.message || 'Failed to load payment form';
                            }
                        });
                    } else if (!payData.success) {
                        console.error('Payment session creation failed:', payData.errorMessage);
                        this.paymentError = payData.errorMessage || 'Failed to initialize payment';
                    }
                } catch (error) {
                    console.error('Failed to initialize payment form:', error);
                    this.paymentError = 'Failed to load payment form. Please try again.';
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
                delete this.errors[field];

                if (field === 'email') {
                    if (!this.form.email) {
                        this.errors.email = 'Email is required.';
                    } else if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(this.form.email)) {
                        this.errors.email = 'Please enter a valid email address.';
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
                        this.errors[field] = 'This field is required.';
                    }
                } else if (field.startsWith('shipping.')) {
                    const key = field.replace('shipping.', '');
                    const requiredFields = ['name', 'address1', 'city', 'countryCode', 'postalCode'];
                    if (requiredFields.includes(key) && !this.form.shipping[key]) {
                        this.errors[field] = 'This field is required.';
                    }
                }
            },

            validate() {
                this.errors = {};
                this.generalError = '';

                this.validateField('email');

                ['name', 'address1', 'city', 'countryCode', 'postalCode'].forEach(field => {
                    this.validateField('billing.' + field);
                });

                if (!this.shippingSameAsBilling) {
                    ['name', 'address1', 'city', 'countryCode', 'postalCode'].forEach(field => {
                        if (!this.form.shipping[field]) {
                            this.errors['shipping.' + field] = 'This field is required.';
                        }
                    });
                }

                if (!this.allShippingSelected) {
                    this.generalError = 'Please select a shipping method.';
                }

                if (!this.selectedPaymentMethod) {
                    this.generalError = this.generalError || 'Please select a payment method.';
                }

                return Object.keys(this.errors).length === 0 && !this.generalError;
            },

            // ============================================
            // Order Submission
            // ============================================

            async submitOrder() {
                if (!this.validate()) {
                    const errorCount = Object.keys(this.errors).length;
                    this.announce(`Form has ${errorCount} error${errorCount !== 1 ? 's' : ''}. Please correct and try again.`);
                    return;
                }

                if (!this.selectedPaymentMethod) {
                    this.generalError = 'Please select a payment method.';
                    this.announce('Please select a payment method.');
                    return;
                }

                this.isSubmitting = true;
                this.generalError = '';
                this.announce('Processing your order...');

                // @ts-ignore - Alpine store
                this.$store.checkout?.setSubmitting(true);

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

                        this.invoiceId = payData.invoiceId;
                        this.paymentSession = payData;
                    }

                    // 4. Handle payment flow
                    if (payData.integrationType === 0 && payData.redirectUrl) {
                        window.location.href = payData.redirectUrl;
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
                                    this.paymentError = err.message || 'Payment setup failed';
                                    this.isSubmitting = false;
                                }
                            });
                        }

                        if (payData.integrationType !== 0) {
                            const paymentResult = await window.MerchelloPayment.submitPayment(payData.invoiceId);
                            if (paymentResult.success) {
                                window.location.href = `/checkout/confirmation/${payData.invoiceId}`;
                            } else {
                                throw new Error(paymentResult.errorMessage || 'Payment failed');
                            }
                        }
                    } else {
                        window.location.href = `/checkout/confirmation/${payData.invoiceId}`;
                    }

                } catch (error) {
                    console.error('Order submission failed:', error);
                    this.generalError = error.message || 'An error occurred. Please try again.';
                    this.announce(this.generalError);
                } finally {
                    this.isSubmitting = false;
                    // @ts-ignore - Alpine store
                    this.$store.checkout?.setSubmitting(false);
                }
            }
        };
    });
}

export default { initSinglePageCheckout };
