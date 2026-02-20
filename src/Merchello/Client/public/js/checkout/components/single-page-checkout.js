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
import { validateEmail, validatePhone, MIN_POSTAL_CODE_LENGTH } from '../services/validation.js';
import { createDebouncer } from '../utils/debounce.js';
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
const RECOVERY_PATH_REGEX = /^\/checkout\/recover\/([^/?#]+)/i;

/**
 * Extract recovery token from /checkout/recover/{token} URL.
 * @returns {string|null}
 */
function getRecoveryTokenFromPath() {
    const match = window.location.pathname.match(RECOVERY_PATH_REGEX);
    if (!match?.[1]) return null;

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

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
            // Address Lookup State
            // ============================================

            addressLookup: {
                billing: {
                    query: '',
                    suggestions: [],
                    loading: false,
                    error: '',
                    isOpen: false,
                    requestId: 0
                },
                shipping: {
                    query: '',
                    suggestions: [],
                    loading: false,
                    error: '',
                    isOpen: false,
                    requestId: 0
                }
            },

            // ============================================
            // Payment Local State
            // ============================================

            cardPaymentMethods: [],
            redirectPaymentMethods: [],
            selectedPaymentMethodKey: '',

            // ============================================
            // Upsell Local State
            // ============================================

            /** @type {Object.<string, string>} Selected variant for upsell product by productRootId */
            selectedUpsellVariant: {},
            /** @type {string|null} Product ID currently being added from upsells */
            upsellAddingProductId: null,

            // ============================================
            // Order Terms State
            // ============================================

            showTermsModal: false,
            termsModalTitle: '',
            termsContent: '',
            termsLoading: false,
            /** @type {Object.<string, string>} Cached terms HTML by key */
            _termsCache: {},

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
            /** @type {string|null} Last country/region key used to fetch checkout upsells */
            _lastUpsellLoadLocationKey: null,
            /** @type {boolean} True while captureAddress request is in-flight */
            _captureAddressInFlight: false,
            /** @type {boolean} Set when address capture should run after shipping/capture completes */
            _captureAddressPending: false,
            /** @type {boolean} Whether shipping calculation is taking longer than expected */
            showSlowShippingMessage: false,
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
            get selectedSavedMethod() { return this.$store.checkout?.selectedSavedMethod ?? null; },
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
            get addressLookupConfig() { return this.$store.checkout?.addressLookup ?? { isEnabled: false }; },
            get addressLookupMinQueryLength() { return this.addressLookupConfig?.minQueryLength ?? 3; },
            get addressLookupMaxSuggestions() { return this.addressLookupConfig?.maxSuggestions ?? 6; },
            get isBillingPhoneRequired() { return this.$store.checkout?.billingPhoneRequired === true; },

            // Upsell store getters
            get upsellSuggestions() { return this.$store.checkout?.upsellSuggestions ?? []; },
            get upsellsLoading() { return this.$store.checkout?.upsellsLoading ?? false; },
            get interstitialDismissed() { return this.$store.checkout?.interstitialDismissed ?? false; },
            get inlineUpsellsCollapsed() { return this.$store.checkout?.inlineUpsellsCollapsed ?? false; },
            get upsellAddingToCart() { return this.$store.checkout?.upsellAddingToCart ?? false; },

            // ============================================
            // Computed Properties
            // ============================================

            get canCalculateShipping() {
                return this.form.shipping.countryCode &&
                       this.form.shipping.postalCode &&
                       this.form.shipping.postalCode.length >= MIN_POSTAL_CODE_LENGTH;
            },

            get allShippingSelected() {
                if (this.shippingGroups.length === 0) return false;
                return this.shippingGroups.every(g =>
                    g.shippingOptions?.length > 0 && this.shippingSelections[g.groupId]
                );
            },

            get hasUnavailableShippingGroups() {
                return this.shippingGroups.some(g => !g.shippingOptions?.length);
            },

            hasRequiredShippingAddress() {
                if (this.shippingSameAsBilling) {
                    return true;
                }

                return !!(
                    this.form.shipping.name &&
                    this.form.shipping.addressOne &&
                    this.form.shipping.townCity &&
                    this.form.shipping.countryCode &&
                    this.form.shipping.postalCode
                );
            },

            get canSubmit() {
                const billingValid = this.form.billing.name &&
                                    this.form.billing.addressOne &&
                                    this.form.billing.townCity &&
                                    this.form.billing.countryCode &&
                                    this.form.billing.postalCode;
                const billingPhoneValid = !this.isBillingPhoneRequired ||
                    !!(this.form.billing.phone && this.form.billing.phone.trim());

                const shippingValid = this.hasRequiredShippingAddress();

                // Digital products require account (signed in OR valid password for new account)
                const store = this.$store.checkout;
                if (store?.hasDigitalProducts && !store?.isLoggedIn) {
                    // Must either have signed in during checkout OR have valid password for new account
                    if (!this.isSignedIn && (!this.form.password || !this.passwordValid)) {
                        return false;
                    }
                }

                // Order terms checkbox validation
                const orderTerms = this.$store.checkout?.orderTerms;
                if (orderTerms?.showCheckbox && orderTerms?.checkboxRequired && !this.form.acceptedTerms) {
                    return false;
                }

                return this.allItemsShippable &&
                       this.allShippingSelected &&
                       !this.shippingLoading &&
                       !this.paymentLoading &&
                       (this.selectedPaymentMethod !== null || this.selectedSavedMethod !== null) &&
                       this.form.email &&
                       billingValid &&
                       billingPhoneValid &&
                       shippingValid;
            },

            get formattedTotal() {
                return formatCurrency(this.basketTotal, this.currencySymbol);
            },

            get calculatedShipping() {
                return this.$store.checkout?.basket?.shipping ?? 0;
            },

            get showInterstitial() {
                return this.$store.checkout?.shouldShowInterstitial() ?? false;
            },

            get inlineSuggestions() {
                return this.$store.checkout?.getSuggestionsByMode('Inline') ?? [];
            },

            get interstitialSuggestions() {
                return this.$store.checkout?.getSuggestionsByMode('Interstitial') ?? [];
            },

            get hasInlineUpsells() {
                return this.inlineSuggestions.length > 0 &&
                       this.inlineSuggestions.some(s => s.products.length > 0);
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
                await this.recoverBasketFromUrlIfNeeded();

                // Sync local state from store
                this.shippingSameAsBilling = this.$store.checkout?.form?.sameAsBilling ?? true;
                this._shippingCalculated = (this.$store.checkout?.shippingGroups?.length ?? 0) > 0;
                const hadPreCalculatedShipping = this._shippingCalculated;

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

                // Keep backend-provided shipping option order
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

                // Load upsell suggestions after shipping is calculated
                if (hadPreCalculatedShipping && this._shippingCalculated) {
                    void this.loadCheckoutUpsells();
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

            async recoverBasketFromUrlIfNeeded() {
                const token = getRecoveryTokenFromPath();
                if (!token) return;

                const store = this.$store.checkout;
                const canonicalPath = '/checkout/information';

                try {
                    const data = await checkoutApi.recoverBasket(token);
                    if (data.success && data.basket) {
                        store?.updateBasket(data.basket);
                        this.applyBasketAddressesToForm(data.basket);

                        if (data.hasUnavailableItems) {
                            const warning = data.message || 'Your basket was restored, but some items may no longer be available.';
                            store?.setShippingError(warning);
                        } else if (data.message) {
                            this.announce(data.message);
                        } else {
                            this.announce('Your basket has been restored.');
                        }
                    } else {
                        store?.setGeneralError(data.message || 'Unable to restore your basket from this recovery link.');
                    }
                } catch (error) {
                    console.error('Failed to recover basket from token URL:', error);
                    store?.setGeneralError('Unable to restore your basket from this recovery link.');
                } finally {
                    if (window.location.pathname.toLowerCase().startsWith('/checkout/recover/') &&
                        window.history?.replaceState) {
                        window.history.replaceState({}, document.title, canonicalPath);
                    }
                }
            },

            /**
             * Hydrate checkout form from recovered basket addresses.
             * @param {any} basket
             */
            applyBasketAddressesToForm(basket) {
                if (!basket) return;

                const billing = basket.billingAddress || {};
                const shipping = basket.shippingAddress || {};

                if (billing.email) {
                    this.form.email = billing.email;
                }

                Object.assign(this.form.billing, {
                    name: billing.name ?? this.form.billing.name,
                    company: billing.company ?? this.form.billing.company,
                    addressOne: billing.addressOne ?? this.form.billing.addressOne,
                    addressTwo: billing.addressTwo ?? this.form.billing.addressTwo,
                    townCity: billing.townCity ?? this.form.billing.townCity,
                    countyState: billing.countyState ?? this.form.billing.countyState,
                    regionCode: billing.regionCode ?? this.form.billing.regionCode,
                    country: billing.country ?? this.form.billing.country,
                    countryCode: billing.countryCode ?? this.form.billing.countryCode,
                    postalCode: billing.postalCode ?? this.form.billing.postalCode,
                    phone: billing.phone ?? this.form.billing.phone
                });

                Object.assign(this.form.shipping, {
                    name: shipping.name ?? this.form.shipping.name,
                    company: shipping.company ?? this.form.shipping.company,
                    addressOne: shipping.addressOne ?? this.form.shipping.addressOne,
                    addressTwo: shipping.addressTwo ?? this.form.shipping.addressTwo,
                    townCity: shipping.townCity ?? this.form.shipping.townCity,
                    countyState: shipping.countyState ?? this.form.shipping.countyState,
                    regionCode: shipping.regionCode ?? this.form.shipping.regionCode,
                    country: shipping.country ?? this.form.shipping.country,
                    countryCode: shipping.countryCode ?? this.form.shipping.countryCode,
                    postalCode: shipping.postalCode ?? this.form.shipping.postalCode,
                    phone: shipping.phone ?? this.form.shipping.phone
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

            /**
             * Get inline style object for a specific upsell element.
             * @param {any} suggestion
             * @param {string} surfaceKey
             * @param {string} elementKey
             * @returns {Record<string, string>}
             */
            getUpsellElementStyle(suggestion, surfaceKey, elementKey) {
                const surface = suggestion?.displayStyles?.[surfaceKey];
                if (!surface || !elementKey) {
                    return {};
                }

                return this._toUpsellInlineStyle(surface[elementKey]);
            },

            /**
             * Convert an upsell element style DTO into an Alpine inline style object.
             * @param {any} elementStyle
             * @returns {Record<string, string>}
             */
            _toUpsellInlineStyle(elementStyle) {
                if (!elementStyle || typeof elementStyle !== 'object') {
                    return {};
                }

                /** @type {Record<string, string>} */
                const inlineStyle = {};
                const hasTextColor = typeof elementStyle.textColor === 'string' && elementStyle.textColor.length > 0;
                const hasBackgroundColor = typeof elementStyle.backgroundColor === 'string' && elementStyle.backgroundColor.length > 0;
                const hasBorderColor = typeof elementStyle.borderColor === 'string' && elementStyle.borderColor.length > 0;
                const hasBorderStyle = typeof elementStyle.borderStyle === 'string' && elementStyle.borderStyle.length > 0;
                const hasBorderWidth = Number.isFinite(elementStyle.borderWidth);
                const hasBorderRadius = Number.isFinite(elementStyle.borderRadius);

                if (hasTextColor) {
                    inlineStyle.color = elementStyle.textColor;
                }

                if (hasBackgroundColor) {
                    inlineStyle.backgroundColor = elementStyle.backgroundColor;
                }

                if (hasBorderColor) {
                    inlineStyle.borderColor = elementStyle.borderColor;
                }

                if (hasBorderStyle) {
                    inlineStyle.borderStyle = elementStyle.borderStyle;
                } else if (hasBorderColor || hasBorderWidth) {
                    inlineStyle.borderStyle = 'solid';
                }

                if (hasBorderWidth) {
                    inlineStyle.borderWidth = `${Math.max(0, Number(elementStyle.borderWidth))}px`;
                }

                if (hasBorderRadius) {
                    inlineStyle.borderRadius = `${Math.max(0, Number(elementStyle.borderRadius))}px`;
                }

                return inlineStyle;
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
             * @param {Object} basketUpdate
             */
            async updateBasketAndReinitPayment(basketUpdate) {
                if (basketUpdate) {
                    this.$store.checkout?.updateBasket(basketUpdate);
                }

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

            /**
             * Refresh checkout basket state from backend and reinitialize payment if needed.
             */
            async refreshCheckoutBasketAndReinitPayment() {
                const basket = await checkoutApi.getBasket();
                if (basket?.isEmpty) {
                    this.$store.checkout?.updateBasket({ ...basket, lineItems: [] });
                    this.dispatchBasketUpdate();
                    return;
                }

                await this.updateBasketAndReinitPayment(basket);
            },

            // ============================================
            // Address Lookup
            // ============================================

            getAddressLookupState(prefix) {
                return this.addressLookup?.[prefix] ?? this.addressLookup.billing;
            },

            isAddressLookupEnabled(prefix) {
                const config = this.addressLookupConfig;
                if (!config?.isEnabled) return false;

                const countryCode = this.form?.[prefix]?.countryCode;
                if (!countryCode) return false;

                const supported = config.supportedCountries;
                if (!supported || supported.length === 0) return true;

                return supported.some(code => {
                    if (!code) return false;
                    if (code === '*') return true;
                    return code.toUpperCase() === countryCode.toUpperCase();
                });
            },

            openAddressLookup(prefix) {
                const state = this.getAddressLookupState(prefix);
                if (!state) return;
                if (state.loading || state.error || state.suggestions.length > 0) {
                    state.isOpen = true;
                }
            },

            closeAddressLookup(prefix) {
                const state = this.getAddressLookupState(prefix);
                if (!state) return;
                state.isOpen = false;
            },

            clearAddressLookup(prefix) {
                const state = this.getAddressLookupState(prefix);
                if (!state) return;
                state.query = '';
                state.suggestions = [];
                state.error = '';
                state.loading = false;
                state.isOpen = false;
                state.requestId += 1;
            },

            resetAddressLookup(prefix) {
                this.clearAddressLookup(prefix);
            },

            onAddressLookupInput(prefix) {
                const state = this.getAddressLookupState(prefix);
                if (!state) return;

                if (!this.isAddressLookupEnabled(prefix)) {
                    this.clearAddressLookup(prefix);
                    return;
                }

                const query = (state.query || '').trim();
                if (query.length < this.addressLookupMinQueryLength) {
                    state.suggestions = [];
                    state.error = '';
                    state.isOpen = false;
                    return;
                }

                state.isOpen = true;
                debouncer.debounce(`address-lookup-${prefix}`, () => this.searchAddressLookup(prefix), 250);
            },

            async searchAddressLookup(prefix) {
                const state = this.getAddressLookupState(prefix);
                if (!state) return;

                const query = (state.query || '').trim();
                if (!query || query.length < this.addressLookupMinQueryLength) {
                    state.suggestions = [];
                    state.error = '';
                    state.isOpen = false;
                    return;
                }

                state.loading = true;
                state.error = '';
                const requestId = ++state.requestId;

                try {
                    const response = await checkoutApi.addressLookupSuggestions({
                        query,
                        countryCode: this.form?.[prefix]?.countryCode,
                        limit: this.addressLookupMaxSuggestions
                    });

                    if (requestId !== state.requestId) return;

                    state.loading = false;

                    if (!response.success) {
                        state.error = response.errorMessage || 'Unable to find addresses. Please try again.';
                        state.suggestions = [];
                        state.isOpen = true;
                        return;
                    }

                    state.suggestions = response.suggestions || [];
                    state.error = state.suggestions.length === 0 ? 'No addresses found.' : '';
                    state.isOpen = true;
                } catch (error) {
                    if (requestId !== state.requestId) return;
                    state.loading = false;
                    state.error = error?.message || 'Unable to find addresses. Please try again.';
                    state.suggestions = [];
                    state.isOpen = true;
                }
            },

            async selectAddressSuggestion(prefix, suggestion) {
                const state = this.getAddressLookupState(prefix);
                if (!state || !suggestion?.id) return;

                state.loading = true;
                state.error = '';
                const requestId = ++state.requestId;

                try {
                    const response = await checkoutApi.addressLookupResolve({
                        id: suggestion.id,
                        countryCode: this.form?.[prefix]?.countryCode
                    });

                    if (requestId !== state.requestId) return;

                    state.loading = false;

                    if (!response.success || !response.address) {
                        state.error = response.errorMessage || 'Unable to resolve address. Please try again.';
                        return;
                    }

                    await this.applyLookupAddress(prefix, response.address);
                    state.query = suggestion.label || state.query;
                    state.suggestions = [];
                    state.isOpen = false;
                } catch (error) {
                    if (requestId !== state.requestId) return;
                    state.loading = false;
                    state.error = error?.message || 'Unable to resolve address. Please try again.';
                }
            },

            async applyLookupAddress(prefix, address) {
                const form = this.form?.[prefix];
                if (!form) return;

                // Apply address lookup result to form fields
                form.addressOne = address.addressOne || '';
                form.addressTwo = address.addressTwo || '';
                form.townCity = address.townCity || '';
                form.postalCode = address.postalCode || '';

                if (address.company) {
                    form.company = address.company;
                }

                if (address.countryCode) {
                    form.countryCode = address.countryCode;
                }
                if (address.country) {
                    form.country = address.country;
                }

                let regions = [];
                if (form.countryCode) {
                    regions = await loadRegions(prefix, form.countryCode);
                    if (prefix === 'billing') {
                        this.billingRegions = regions;
                    } else {
                        this.shippingRegions = regions;
                    }
                }

                if (address.regionCode) {
                    form.regionCode = address.regionCode;
                }
                if (address.countyState) {
                    form.countyState = address.countyState;
                }

                if (form.regionCode && regions.length > 0) {
                    const region = regions.find(r => r.regionCode === form.regionCode);
                    if (region) {
                        form.countyState = region.name;
                    }
                } else if (!form.regionCode && form.countyState && regions.length > 0) {
                    const region = regions.find(r => r.name?.toLowerCase() === form.countyState.toLowerCase());
                    if (region) {
                        form.regionCode = region.regionCode;
                    }
                }

                if (prefix === 'billing') {
                    if (this.shippingSameAsBilling) {
                        this.syncBillingToShipping();
                        this.shippingRegions = [...this.billingRegions];
                    }
                    this.debouncedCalculateShipping();
                    this.debouncedCaptureAddress();
                } else {
                    this.debouncedCalculateShipping();
                    this.debouncedCaptureAddress();
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
                this.form.billing.countyState = '';
                this.form.billing.regionCode = '';
                this.resetAddressLookup('billing');
                this.billingRegions = await loadRegions('billing', this.form.billing.countryCode);
                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.shippingRegions = [...this.billingRegions];
                    this.debouncedCalculateShipping();
                }
                this.debouncedCaptureAddress();

                // Clear payment error if billing info is now complete
                const hasBillingInfo = this.form.billing.name &&
                                       this.form.billing.addressOne &&
                                       this.form.billing.countryCode;
                if (hasBillingInfo && this.$store.checkout?.paymentError === 'Please complete your billing address first.') {
                    this.$store.checkout?.setPaymentError(null);
                }
            },

            onBillingStateChange() {
                const region = this.billingRegions.find(r => r.regionCode === this.form.billing.regionCode);
                if (region) this.form.billing.countyState = region.name;
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
                                       this.form.billing.addressOne &&
                                       this.form.billing.countryCode;
                if (hasBillingInfo && this.$store.checkout?.paymentError === 'Please complete your billing address first.') {
                    this.$store.checkout?.setPaymentError(null);
                }
            },

            async onShippingCountryChange() {
                this.form.shipping.countyState = '';
                this.form.shipping.regionCode = '';
                this.resetAddressLookup('shipping');
                this.shippingRegions = await loadRegions('shipping', this.form.shipping.countryCode);
                this.debouncedCalculateShipping();
                this.debouncedCaptureAddress();
            },

            onShippingStateChange() {
                const region = this.shippingRegions.find(r => r.regionCode === this.form.shipping.regionCode);
                if (region) this.form.shipping.countyState = region.name;
                this.debouncedCaptureAddress();
            },

            onShippingFieldChange() {
                this.debouncedCalculateShipping();
                this.debouncedCaptureAddress();
            },

            onShippingSameAsBillingChange() {
                this.$store.checkout?.setSameAsBilling(this.shippingSameAsBilling);

                if (this.shippingSameAsBilling) {
                    this.syncBillingToShipping();
                    this.shippingRegions = [...this.billingRegions];
                    this.debouncedCalculateShipping();
                    this.resetAddressLookup('shipping');
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
                // Avoid parallel writes with shipping initialization against SQLite.
                // If shipping is calculating, defer capture and retry once loading ends.
                if (this.shippingLoading) {
                    this._captureAddressPending = true;
                    this.debouncedCaptureAddress();
                    return;
                }

                // Coalesce multiple blur events while a capture request is already running.
                if (this._captureAddressInFlight) {
                    this._captureAddressPending = true;
                    return;
                }

                this._captureAddressInFlight = true;
                this._captureAddressPending = false;

                // DEDUPLICATION: Hash current address data and compare to last capture.
                // This prevents redundant API calls when address hasn't actually changed.
                // Important for abandoned cart recovery - we want to capture changes,
                // but not spam the server with identical data.
                try {
                    const addressHash = JSON.stringify({
                        email: this.form.email,
                        billing: this.form.billing,
                        shipping: this.shippingSameAsBilling ? this.form.billing : this.form.shipping,
                        shippingSameAsBilling: this.shippingSameAsBilling
                    });
                    if (this._lastAddressHash === addressHash) return;

                    const hasBillingData = this.form.billing.name ||
                        this.form.billing.addressOne ||
                        this.form.billing.townCity ||
                        this.form.billing.postalCode ||
                        this.form.billing.countryCode;
                    if (!this.form.email && !hasBillingData) return;

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
                } finally {
                    this._captureAddressInFlight = false;

                    // Run one trailing capture for any changes that happened while we were busy.
                    if (this._captureAddressPending && !this.shippingLoading) {
                        this._captureAddressPending = false;
                        this.debouncedCaptureAddress();
                    }
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
                this.showSlowShippingMessage = false;

                // TIMEOUT HANDLING: Show "taking longer" message after 8s,
                // and error with retry option after 15s.
                const slowTimeout = setTimeout(() => {
                    if (requestId === this._shippingRequestId) {
                        this.showSlowShippingMessage = true;
                    }
                }, 8000);

                const errorTimeout = setTimeout(() => {
                    if (requestId === this._shippingRequestId) {
                        this.showSlowShippingMessage = false;
                        store?.setShippingLoading(false);
                        store?.setShippingError('Shipping calculation timed out. Please try again.');
                    }
                }, 15000);

                try {
                    const data = await checkoutApi.initialize({
                        countryCode: this.form.shipping.countryCode,
                        regionCode: this.form.shipping.regionCode,
                        autoSelectShipping: true,
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
                            // Trust the API response - backend calculates totals and line items.
                            await this.updateBasketAndReinitPayment(data.basket);

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
                        await this.loadCheckoutUpsells();
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
                    clearTimeout(slowTimeout);
                    clearTimeout(errorTimeout);
                    if (requestId === this._shippingRequestId) {
                        store?.setShippingLoading(false);
                        this.showSlowShippingMessage = false;

                        // If address capture was deferred during shipping, flush it now.
                        if (this._captureAddressPending && !this._captureAddressInFlight) {
                            this.debouncedCaptureAddress();
                        }
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

            _buildQuotedCosts() {
                const quotedCosts = {};
                for (const group of this.shippingGroups) {
                    const selKey = this.shippingSelections[group.groupId];
                    if (selKey) {
                        const option = group.shippingOptions?.find(o => o.selectionKey === selKey);
                        if (option) {
                            quotedCosts[group.groupId] = option.cost;
                        }
                    }
                }
                return quotedCosts;
            },

            async updateShippingAndRecalculate() {
                try {
                    const data = await checkoutApi.saveShipping(this.shippingSelections, this._buildQuotedCosts());
                    if (data.success && data.basket) {
                        await this.updateBasketAndReinitPayment(data.basket);
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
                    const options = await checkoutApi.getPaymentOptions();
                    const methods = options?.providers ?? [];
                    store?.setPaymentMethods(methods);
                    store?.setSavedPaymentMethods(options?.savedPaymentMethods ?? []);
                    store?.setCanSavePaymentMethods(options?.canSavePaymentMethods ?? false);

                    const categorized = categorizePaymentMethods(methods);
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
                                       this.form.billing.addressOne &&
                                       this.form.billing.countryCode;

                if (!hasBillingInfo) {
                    store?.setPaymentMethod(null);
                    store?.setPaymentError('Please complete your billing address first.');
                    this.selectedPaymentMethodKey = '';
                    return;
                }

                if (!this.hasRequiredShippingAddress()) {
                    store?.setPaymentMethod(null);
                    store?.setPaymentError('Please complete your shipping address first.');
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
                    if (!this.hasRequiredShippingAddress()) {
                        store?.setPaymentFormInitializing(false);
                        this.setExpressReRenderSkip(false);
                        store?.setPaymentError('Please complete your shipping address first.');
                        return;
                    }

                    // PRE-SAVE ADDRESSES: Some payment providers (e.g., Braintree with
                    // fraud tools) need customer address data during session creation
                    // for risk assessment. We save here so the backend has current data.
                    // Note: submitOrder() also saves addresses (includes password for account creation)
                    if (this.form.billing.name && this.form.billing.addressOne && this.form.billing.countryCode) {
                        const saveAddressResult = await checkoutApi.saveAddresses({
                            email: this.form.email,
                            billingAddress: this.form.billing,
                            shippingAddress: this.form.shipping,
                            shippingSameAsBilling: this.shippingSameAsBilling,
                            acceptsMarketing: this.form.acceptsMarketing
                        });

                        if (!saveAddressResult?.success) {
                            if (saveAddressResult?.errors && typeof saveAddressResult.errors === 'object') {
                                Object.entries(saveAddressResult.errors).forEach(([field, message]) => {
                                    if (typeof message === 'string' && message.length > 0) {
                                        store?.setError(field, message);
                                    }
                                });
                            }

                            const firstValidationMessage = saveAddressResult?.errors &&
                                typeof saveAddressResult.errors === 'object'
                                ? Object.values(saveAddressResult.errors).find(v => typeof v === 'string' && v.length > 0)
                                : null;

                            store?.setPaymentFormInitializing(false);
                            this.setExpressReRenderSkip(false);
                            store?.setPaymentError(
                                typeof firstValidationMessage === 'string'
                                    ? firstValidationMessage
                                    : (saveAddressResult?.message || 'Please complete the checkout information step first.')
                            );
                            return;
                        }
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
                    const emailResult = validateEmail(this.form.email);
                    if (!emailResult.isValid) {
                        store?.setError('email', emailResult.error);
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
                    const requiredFields = ['name', 'addressOne', 'townCity', 'countryCode', 'postalCode'];
                    if (requiredFields.includes(key) && !this.form[prefix][key]) {
                        store?.setError(field, 'This field is required.');
                    } else if (key === 'phone') {
                        const phone = this.form[prefix].phone ?? '';
                        const phoneRequired = prefix === 'billing' && this.isBillingPhoneRequired;
                        if (phoneRequired && !phone.trim()) {
                            store?.setError(field, 'Phone number is required.');
                        } else if (phone.trim()) {
                            const result = validatePhone(phone);
                            if (!result.isValid) {
                                store?.setError(field, result.error);
                            }
                        }
                    }
                }
            },

            validate() {
                const store = this.$store.checkout;
                store?.clearAllErrors();
                store?.setGeneralError('');

                this.validateField('email');
                ['name', 'addressOne', 'townCity', 'countryCode', 'postalCode'].forEach(f => this.validateField('billing.' + f));
                this.validateField('billing.phone');

                if (!this.shippingSameAsBilling) {
                    ['name', 'addressOne', 'townCity', 'countryCode', 'postalCode'].forEach(f => {
                        if (!this.form.shipping[f]) store?.setError('shipping.' + f, 'This field is required.');
                    });
                    this.validateField('shipping.phone');
                }

                if (this.hasUnavailableShippingGroups) {
                    store?.setGeneralError('No shipping methods are available for one or more shipments. Please contact support.');
                } else if (!this.allShippingSelected) {
                    store?.setGeneralError('Please select a shipping method.');
                }
                if (!this.selectedPaymentMethod) store?.setGeneralError(this.generalError || 'Please select a payment method.');

                // Order terms checkbox validation
                const orderTerms = store?.orderTerms;
                if (orderTerms?.showCheckbox && orderTerms?.checkboxRequired && !this.form.acceptedTerms) {
                    store?.setError('acceptedTerms', 'You must agree to the terms and conditions to place your order.');
                }

                return Object.keys(this.errors).length === 0 && !this.generalError;
            },

            // ============================================
            // Upsell Methods
            // ============================================

            async loadCheckoutUpsells(forceReload = false) {
                const store = this.$store.checkout;
                if (!this.form.shipping.countryCode) return;
                const locationKey = `${this.form.shipping.countryCode}|${this.form.shipping.regionCode || ''}`;
                if (!forceReload && this._lastUpsellLoadLocationKey === locationKey) {
                    return;
                }

                store?.setUpsellsLoading(true);
                store?.setUpsellsError(null);

                try {
                    const params = new URLSearchParams({ location: 'Checkout' });
                    params.append('countryCode', this.form.shipping.countryCode);
                    if (this.form.shipping.regionCode) {
                        params.append('regionCode', this.form.shipping.regionCode);
                    }
                    const result = await checkoutApi.request(`/upsells?${params}`);

                    if (result.success) {
                        store?.setUpsellSuggestions(result.data || []);
                        this._lastUpsellLoadLocationKey = locationKey;
                        if (result.data?.length > 0) {
                            this.trackUpsellImpressions(result.data);
                        }
                    } else {
                        store?.setUpsellsError(result.error || 'Unable to load recommendations');
                    }
                } catch (error) {
                    console.error('Failed to load checkout upsells:', error);
                    store?.setUpsellsError('Unable to load recommendations');
                } finally {
                    store?.setUpsellsLoading(false);
                }
            },

            async trackUpsellImpressions(suggestions) {
                const events = suggestions.flatMap(s =>
                    s.products.map(p => ({
                        upsellRuleId: s.upsellRuleId,
                        productId: p.productId,
                        eventType: 'Impression',
                        displayLocation: 1 // Checkout
                    }))
                );

                if (events.length === 0) return;

                try {
                    const result = await checkoutApi.request('/upsells/events', {
                        method: 'POST',
                        body: JSON.stringify({ events })
                    });
                    if (!result.success) {
                        console.warn('Upsell impression tracking failed:', result.error);
                    }
                } catch (error) {
                    console.error('Failed to track upsell impressions:', error);
                }
            },

            async trackUpsellClick(upsellRuleId, productId) {
                try {
                    const result = await checkoutApi.request('/upsells/events', {
                        method: 'POST',
                        body: JSON.stringify({
                            events: [{
                                upsellRuleId,
                                productId,
                                eventType: 'Click',
                                displayLocation: 1 // Checkout
                            }]
                        })
                    });
                    if (!result.success) {
                        console.warn('Upsell click tracking failed:', result.error);
                    }
                } catch (error) {
                    console.error('Failed to track upsell click:', error);
                }
            },

            async addUpsellToCart(product, upsellRuleId) {
                const store = this.$store.checkout;
                if (store?.upsellAddingToCart) return;

                const selectedVariantId = this.selectedUpsellVariant[product.productRootId];
                const productIdToAdd = product.hasVariants
                    ? selectedVariantId
                    : product.productId;

                if (!productIdToAdd) {
                    this.announce('Please select a variant');
                    return;
                }

                store?.setUpsellAddingToCart(true);
                this.upsellAddingProductId = product.productId;

                try {
                    await this.trackUpsellClick(upsellRuleId, productIdToAdd);

                    const result = await checkoutApi.request('/basket/add', {
                        method: 'POST',
                        body: JSON.stringify({ productId: productIdToAdd, quantity: 1 })
                    });

                    if (!result.success) {
                        throw new Error(result.error || 'Failed to add item');
                    }

                    store?.markUpsellProductAdded(product.productRootId);

                    // Recalculate shipping when possible; otherwise refresh basket totals/items directly.
                    if (this.canCalculateShipping) {
                        await this.calculateShipping();
                    } else {
                        await this.refreshCheckoutBasketAndReinitPayment();
                    }

                    // Refresh upsells (added product should be suppressed if SuppressIfInCart)
                    await this.loadCheckoutUpsells(true);

                    this.announce(`${product.name} added to your order`);
                } catch (error) {
                    console.error('Failed to add upsell to cart:', error);
                    this.announce(error.message || 'Failed to add item to cart');
                } finally {
                    store?.setUpsellAddingToCart(false);
                    this.upsellAddingProductId = null;
                }
            },

            selectUpsellVariant(productRootId, variantProductId) {
                this.selectedUpsellVariant = {
                    ...this.selectedUpsellVariant,
                    [productRootId]: variantProductId
                };
            },

            getSelectedUpsellVariant(product) {
                if (!product?.hasVariants || !Array.isArray(product.variants)) {
                    return null;
                }

                const selectedVariantId = this.selectedUpsellVariant[product.productRootId];
                if (!selectedVariantId) {
                    return null;
                }

                return product.variants.find(v => String(v.productId) === String(selectedVariantId)) ?? null;
            },

            getUpsellDisplayPrice(product) {
                const selectedVariant = this.getSelectedUpsellVariant(product);
                return selectedVariant?.formattedPrice || product?.formattedPrice || '';
            },

            getUpsellVariantLabel(variant) {
                if (!variant) {
                    return '';
                }

                const baseLabel = variant.formattedPrice
                    ? `${variant.name} - ${variant.formattedPrice}`
                    : variant.name;

                return variant.availableForPurchase
                    ? baseLabel
                    : `${baseLabel} (Out of stock)`;
            },

            canAddUpsell(product) {
                if (!product?.availableForPurchase) {
                    return false;
                }

                if (!product.hasVariants) {
                    return true;
                }

                return !!this.selectedUpsellVariant[product.productRootId];
            },

            dismissInterstitial() {
                this.$store.checkout?.dismissInterstitial();
                this.announce('Continuing to checkout');
            },

            toggleInlineUpsells() {
                this.$store.checkout?.toggleInlineUpsells();
            },

            isAddingUpsellProduct(productId) {
                return this.upsellAddingProductId === productId;
            },

            wasUpsellAdded(productRootId) {
                return this.$store.checkout?.wasUpsellProductAdded(productRootId) ?? false;
            },

            // ============================================
            // Order Terms Methods
            // ============================================

            async openTermsModal(key) {
                // Derive title from key (capitalize first letter)
                this.termsModalTitle = key.charAt(0).toUpperCase() + key.slice(1);
                this.showTermsModal = true;
                document.body.style.overflow = 'hidden';

                // Use cached content if available
                if (this._termsCache[key]) {
                    this.termsContent = this._termsCache[key];
                    return;
                }

                this.termsLoading = true;
                this.termsContent = '';

                try {
                    const response = await fetch(`/api/merchello/checkout/terms/${encodeURIComponent(key)}`);
                    const data = await response.json();
                    if (data.success) {
                        this._termsCache[key] = data.html;
                        this.termsContent = data.html;
                    } else {
                        this.termsContent = `<p class="text-gray-500">${data.message || 'No content available.'}</p>`;
                    }
                } catch (error) {
                    console.error('Failed to load terms content:', error);
                    this.termsContent = '<p class="text-red-500">Failed to load content. Please try again.</p>';
                } finally {
                    this.termsLoading = false;
                }
            },

            closeTermsModal() {
                this.showTermsModal = false;
                document.body.style.overflow = '';
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

                if (!this.selectedPaymentMethod && !this.selectedSavedMethod) {
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

                    const shippingData = await checkoutApi.saveShipping(this.shippingSelections, this._buildQuotedCosts());
                    if (!shippingData.success) throw new Error(shippingData.message || 'Failed to save shipping');

                    // SAVED METHOD FLOW: process saved method without rendering a payment form
                    if (this.selectedSavedMethod) {
                        let invoiceId = this.invoiceId || this.paymentSession?.invoiceId;

                        if (!invoiceId) {
                            const payData = await checkoutApi.initiatePayment({
                                providerAlias: this.selectedSavedMethod.providerAlias,
                                methodAlias: null,
                                returnUrl: getCheckoutReturnUrl(),
                                cancelUrl: getCheckoutCancelUrl()
                            });
                            if (!payData.success) throw new Error(payData.errorMessage || 'Failed to initiate payment');
                            invoiceId = payData.invoiceId;
                            store?.setPaymentSession(payData);
                        }

                        const savedResult = await checkoutApi.processSavedPayment({
                            invoiceId,
                            savedPaymentMethodId: this.selectedSavedMethod.id
                        });

                        if (savedResult.success) {
                            safeRedirect(savedResult.redirectUrl || `/checkout/confirmation/${savedResult.invoiceId || invoiceId}`);
                            return;
                        }

                        throw new Error(savedResult.errorMessage || 'Payment failed');
                    }

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
