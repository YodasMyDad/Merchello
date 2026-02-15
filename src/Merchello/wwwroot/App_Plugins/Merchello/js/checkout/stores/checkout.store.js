// @ts-check
/**
 * Merchello Checkout Store
 *
 * SINGLE SOURCE OF TRUTH for checkout state.
 * All checkout components access state via this.$store.checkout.
 * Components dispatch events for changes; the main orchestrator handles flow.
 */

import { createAnnouncer } from '../utils/announcer.js';
import { formatCurrencyLocale } from '../utils/formatters.js';
import { MIN_POSTAL_CODE_LENGTH } from '../services/validation.js';

const INTERSTITIAL_SEEN_STORAGE_PREFIX = 'merchello:checkout:upsells:interstitial-seen:';

/**
 * Get persisted interstitial "seen" flag for a basket.
 * @param {string|null|undefined} basketId
 * @returns {boolean}
 */
function getInterstitialSeenForBasket(basketId) {
    if (!basketId) return false;

    try {
        return window.sessionStorage.getItem(`${INTERSTITIAL_SEEN_STORAGE_PREFIX}${basketId}`) === '1';
    } catch {
        return false;
    }
}

/**
 * Persist interstitial "seen" flag for a basket.
 * @param {string|null|undefined} basketId
 * @param {boolean} seen
 */
function setInterstitialSeenForBasket(basketId, seen) {
    if (!basketId) return;

    try {
        const key = `${INTERSTITIAL_SEEN_STORAGE_PREFIX}${basketId}`;
        if (seen) {
            window.sessionStorage.setItem(key, '1');
        } else {
            window.sessionStorage.removeItem(key);
        }
    } catch {
        // Storage failures should never break checkout flow.
    }
}

/**
 * @typedef {Object} BasketState
 * @property {number} total
 * @property {number} shipping
 * @property {number} tax
 * @property {number} subtotal
 * @property {number} discount
 */

/**
 * @typedef {Object} CurrencyState
 * @property {string} code - ISO currency code (e.g., 'GBP')
 * @property {string} symbol - Currency symbol (e.g., '£')
 */

/**
 * @typedef {Object} AddressState
 * @property {string} name
 * @property {string} company
 * @property {string} addressOne
 * @property {string} addressTwo
 * @property {string} townCity
 * @property {string} countyState
 * @property {string} regionCode
 * @property {string} country
 * @property {string} countryCode
 * @property {string} postalCode
 * @property {string} phone
 */

/**
 * @typedef {Object} AddressLookupConfig
 * @property {boolean} isEnabled
 * @property {string} [providerAlias]
 * @property {string} [providerName]
 * @property {string} [providerDescription]
 * @property {string[]} [supportedCountries]
 * @property {number} [minQueryLength]
 * @property {number} [maxSuggestions]
 */

/**
 * @typedef {Object} AppliedDiscount
 * @property {string} id - Discount ID
 * @property {string} name - Display name
 * @property {string|null} code - Discount code (null for automatic discounts)
 * @property {number} amount - Discount amount
 * @property {string} formattedAmount - Formatted display amount
 * @property {boolean} isAutomatic - Whether discount was auto-applied
 */

/**
 * @typedef {Object} ShippingOption
 * @property {string} id - The ShippingOption GUID (empty for dynamic providers)
 * @property {string} name
 * @property {number} cost
 * @property {string} formattedCost
 * @property {number} daysFrom
 * @property {number} daysTo
 * @property {boolean} isNextDay
 * @property {string} deliveryDescription
 * @property {string} providerKey - Provider key (e.g., "flat-rate", "fedex", "ups")
 * @property {string} selectionKey - Unified selection ID ("so:{guid}" or "dyn:{provider}:{serviceCode}")
 * @property {string|null} serviceCode - Carrier service code for dynamic providers (e.g., "FEDEX_GROUND")
 * @property {string|null} estimatedDeliveryDate - ISO date string for estimated delivery
 * @property {boolean} isFallbackRate - True if rate is from cache due to carrier API failure
 * @property {string|null} fallbackReason - Reason for using fallback rate
 */

/**
 * @typedef {Object} ShippingGroup
 * @property {string} groupId
 * @property {string} groupName
 * @property {string} warehouseId
 * @property {Array} lineItems
 * @property {ShippingOption[]} shippingOptions
 * @property {string|null} selectedShippingOptionId - SelectionKey of selected option
 * @property {string|null} rateError - Error message if rate fetching failed
 * @property {boolean} hasFallbackRates - True if any options are fallback rates
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} providerAlias
 * @property {string} methodAlias
 * @property {string} displayName
 * @property {number} integrationType
 * @property {string} iconUrl
 * @property {boolean} [supportsVaulting] - Whether this provider supports saving payment methods
 */

/**
 * @typedef {Object} SavedPaymentMethod
 * @property {string} id - Unique identifier
 * @property {string} providerAlias - Payment provider alias
 * @property {string} methodType - Card, PayPal, BankAccount, etc.
 * @property {string} [cardBrand] - Card brand (visa, mastercard, etc.)
 * @property {string} [last4] - Last 4 digits
 * @property {string} [expiryFormatted] - Formatted expiry (e.g., "12/26")
 * @property {boolean} isExpired - Whether the card is expired
 * @property {string} displayLabel - Human-readable label
 * @property {boolean} isDefault - Whether this is the default method
 * @property {string} [iconHtml] - Icon HTML
 */

/**
 * @typedef {Object} FieldErrors
 * @type {Object.<string, string>}
 */

/**
 * Initialize the checkout store
 *
 * @param {Object} [initialData] - Optional initial data from server
 * @param {Partial<BasketState>} [initialData.basket]
 * @param {Partial<CurrencyState>} [initialData.currency]
 * @param {string} [initialData.email]
 * @param {Partial<AddressState>} [initialData.billing]
 * @param {Partial<AddressState>} [initialData.shipping]
 * @param {boolean} [initialData.shippingSameAsBilling]
 * @param {AppliedDiscount[]} [initialData.appliedDiscounts]
 * @param {ShippingGroup[]} [initialData.shippingGroups]
 * @param {Object.<string, string>} [initialData.shippingSelections]
 * @param {PaymentMethod[]} [initialData.paymentMethods]
 * @param {AddressLookupConfig} [initialData.addressLookup]
 */
export function initCheckoutStore(initialData = {}) {
    const announcer = createAnnouncer();
    const initialBasketId = initialData.basketId ?? initialData.basket?.id ?? null;
    const initialInterstitialSeen = getInterstitialSeenForBasket(initialBasketId);

    // Parse initial shipping selections from groups
    // Note: JSON from Razor uses 'selectedOptionId', not 'selectedShippingOptionId'
    const initialSelections = {};
    if (initialData.shippingGroups) {
        initialData.shippingGroups.forEach(g => {
            if (g.selectedOptionId) {
                initialSelections[g.groupId] = g.selectedOptionId;
            }
        });
    }

    // @ts-ignore - Alpine is global
    Alpine.store('checkout', {
        // ============================================
        // FORM STATE (moved from component)
        // ============================================

        /** @type {Object} */
        form: {
            email: initialData.email ?? '',
            billing: {
                name: '',
                company: '',
                addressOne: '',
                addressTwo: '',
                townCity: '',
                countyState: '',
                regionCode: '',
                country: '',
                countryCode: initialData.billing?.countryCode ?? '',
                postalCode: '',
                phone: '',
                ...initialData.billing
            },
            shipping: {
                name: '',
                company: '',
                addressOne: '',
                addressTwo: '',
                townCity: '',
                countyState: '',
                regionCode: '',
                country: '',
                countryCode: initialData.shipping?.countryCode ?? '',
                postalCode: '',
                phone: '',
                ...initialData.shipping
            },
            sameAsBilling: initialData.shippingSameAsBilling ?? true,
            acceptsMarketing: false,
            password: '',
            acceptedTerms: false
        },

        // ============================================
        // ADDRESS LOOKUP CONFIG
        // ============================================

        /** @type {AddressLookupConfig|null} */
        addressLookup: initialData.addressLookup ?? { isEnabled: false },

        // ============================================
        // ACCOUNT STATE
        // ============================================

        /** @type {boolean} Whether the current user is logged in as a member (from server) */
        isLoggedIn: initialData.isLoggedIn ?? false,

        /** @type {boolean} Whether the entered email belongs to an existing account */
        emailHasAccount: false,

        /** @type {boolean} Whether basket contains digital products (requires account) */
        hasDigitalProducts: initialData.hasDigitalProducts ?? false,

        // ============================================
        // BASKET STATE
        // ============================================

        /** @type {BasketState} */
        basket: {
            total: initialData.basket?.total ?? 0,
            shipping: initialData.basket?.shipping ?? 0,
            tax: initialData.basket?.tax ?? 0,
            subtotal: initialData.basket?.subtotal ?? 0,
            discount: initialData.basket?.discount ?? 0
        },

        /** @type {string|null} */
        basketId: initialBasketId,

        /** @type {Array} */
        basketLineItems: initialData.basketLineItems ?? initialData.basket?.lineItems ?? [],

        // Tax-inclusive display state
        /** @type {boolean} */
        displayPricesIncTax: initialData.displayPricesIncTax ?? false,
        /** @type {number} */
        taxInclusiveDisplaySubTotal: initialData.taxInclusiveDisplaySubTotal ?? 0,
        /** @type {string} */
        formattedTaxInclusiveDisplaySubTotal: initialData.formattedTaxInclusiveDisplaySubTotal ?? '',
        /** @type {string|null} */
        taxIncludedMessage: initialData.taxIncludedMessage ?? null,

        /** @type {CurrencyState} */
        currency: {
            code: initialData.currency?.code ?? 'GBP',
            symbol: initialData.currency?.symbol ?? '£'
        },

        /** @type {number} Number of decimal places for display currency */
        currencyDecimalPlaces: initialData.currencyDecimalPlaces ?? 2,

        /** @type {AppliedDiscount[]} */
        appliedDiscounts: initialData.appliedDiscounts ?? [],

        // ============================================
        // SHIPPING STATE
        // ============================================

        /** @type {ShippingGroup[]} */
        shippingGroups: initialData.shippingGroups ?? [],

        /** @type {Object.<string, string>} */
        shippingSelections: { ...initialSelections, ...initialData.shippingSelections },

        /** @type {boolean} */
        shippingLoading: false,

        /** @type {string|null} */
        shippingError: null,

        /** @type {boolean} */
        shippingCalculated: (initialData.shippingGroups?.length ?? 0) > 0,

        /** @type {Array} */
        itemAvailabilityErrors: [],

        /** @type {boolean} */
        allItemsShippable: true,

        // ============================================
        // PAYMENT STATE
        // ============================================

        /** @type {PaymentMethod[]} */
        paymentMethods: initialData.paymentMethods ?? [],

        /** @type {PaymentMethod|null} */
        selectedPaymentMethod: null,

        /** @type {Object|null} */
        paymentSession: null,

        /** @type {boolean} */
        paymentLoading: true,

        /** @type {string|null} */
        paymentError: null,

        /** @type {string|null} */
        invoiceId: null,

        /** @type {boolean} */
        paymentFormInitializing: false,

        // ============================================
        // SAVED PAYMENT METHODS STATE
        // ============================================

        /** @type {SavedPaymentMethod[]} */
        savedPaymentMethods: initialData.savedPaymentMethods ?? [],

        /** @type {SavedPaymentMethod|null} */
        selectedSavedMethod: null,

        /** @type {boolean} Whether to save the payment method during checkout */
        savePaymentMethod: false,

        /** @type {boolean} Whether to set saved method as default */
        setAsDefaultMethod: false,

        /** @type {boolean} Whether any provider supports vaulting */
        canSavePaymentMethods: initialData.canSavePaymentMethods ?? false,

        // ============================================
        // UPSELL STATE
        // ============================================

        /** @type {Array} Upsell suggestions from API */
        upsellSuggestions: [],

        /** @type {boolean} */
        upsellsLoading: false,

        /** @type {string|null} */
        upsellsError: null,

        /** @type {boolean} Whether interstitial upsells have been shown for this basket session */
        interstitialSeen: initialInterstitialSeen,

        /** @type {boolean} Whether interstitial upsells have been dismissed */
        interstitialDismissed: initialInterstitialSeen,

        /** @type {boolean} Whether inline upsells section is collapsed */
        inlineUpsellsCollapsed: false,

        /** @type {Set<string>} Product IDs that have been added from upsells this session */
        addedUpsellProductIds: new Set(),

        /** @type {boolean} Whether an upsell add-to-cart is in progress */
        upsellAddingToCart: false,

        // ============================================
        // ORDER TERMS STATE
        // ============================================

        /** @type {Object|null} Order terms configuration from settings */
        orderTerms: initialData.orderTerms ?? null,

        // ============================================
        // UI STATE
        // ============================================

        /** @type {boolean} */
        isSubmitting: false,

        /** @type {FieldErrors} */
        errors: {},

        /** @type {string} */
        generalError: '',

        // ============================================
        // COMPUTED GETTERS (as methods)
        // ============================================

        /**
         * Check if shipping can be calculated (has required address fields)
         * @returns {boolean}
         */
        canCalculateShipping() {
            const addr = this.form.sameAsBilling ? this.form.billing : this.form.shipping;
            return !!(addr.countryCode && addr.postalCode && addr.postalCode.length >= MIN_POSTAL_CODE_LENGTH);
        },

        /**
         * Check if all shipping groups have a selection
         * @returns {boolean}
         */
        allShippingSelected() {
            if (this.shippingGroups.length === 0) return false;
            return this.shippingGroups.every(g =>
                g.shippingOptions?.length > 0 && this.shippingSelections[g.groupId]
            );
        },

        /**
         * Get the effective shipping address (billing if same, otherwise shipping)
         * @returns {AddressState}
         */
        getEffectiveShippingAddress() {
            return this.form.sameAsBilling ? this.form.billing : this.form.shipping;
        },

        // ============================================
        // FORM METHODS
        // ============================================

        /**
         * Set a form field using dot notation path
         * @param {string} path - Field path (e.g., 'email', 'billing.name')
         * @param {*} value - The value to set
         */
        setFormField(path, value) {
            const parts = path.split('.');
            if (parts.length === 1) {
                this.form[path] = value;
            } else if (parts.length === 2) {
                const [group, field] = parts;
                if (this.form[group]) {
                    this.form[group][field] = value;
                }
            }

            // Auto-sync shipping from billing if sameAsBilling
            if (path.startsWith('billing.') && this.form.sameAsBilling) {
                const field = path.replace('billing.', '');
                this.form.shipping[field] = value;
            }
        },

        /**
         * Set email address
         * @param {string} email
         */
        setEmail(email) {
            this.form.email = email;
        },

        /**
         * Update billing address
         * @param {Partial<AddressState>} data
         */
        updateBillingAddress(data) {
            Object.assign(this.form.billing, data);

            // Sync to shipping if same as billing
            if (this.form.sameAsBilling) {
                this.syncShippingFromBilling();
            }
        },

        /**
         * Update shipping address
         * @param {Partial<AddressState>} data
         */
        updateShippingAddress(data) {
            Object.assign(this.form.shipping, data);
        },

        /**
         * Sync shipping address from billing
         */
        syncShippingFromBilling() {
            Object.assign(this.form.shipping, this.form.billing);
        },

        /**
         * Set same as billing toggle
         * @param {boolean} value
         */
        setSameAsBilling(value) {
            this.form.sameAsBilling = value;
            if (value) {
                this.syncShippingFromBilling();
            }
        },

        /**
         * Set whether the email has an existing account.
         * Used to hide the "Create an account" button for existing customers.
         * @param {boolean} hasAccount
         */
        setEmailHasAccount(hasAccount) {
            this.emailHasAccount = hasAccount;
        },

        // ============================================
        // BASKET METHODS
        // ============================================

        /**
         * Update basket totals
         * Prefers display currency amounts (displayTotal, etc.) over store currency amounts
         * @param {Object} data - Basket data from API
         */
        updateBasket(data) {
            if (!data) return;

            // Keep basket identity in sync for session-scoped interstitial persistence.
            if (data.id) {
                const nextBasketId = String(data.id);
                if (this.basketId !== nextBasketId) {
                    this.basketId = nextBasketId;
                    const seenForBasket = getInterstitialSeenForBasket(nextBasketId);
                    this.interstitialSeen = seenForBasket;
                    this.interstitialDismissed = seenForBasket;
                }
            }

            // Create a new basket object to ensure Alpine's reactivity detects the change
            // Use display currency amounts if available, otherwise fall back to store currency
            this.basket = {
                total: data.displayTotal ?? data.total ?? this.basket.total,
                shipping: data.displayShipping ?? data.shipping ?? this.basket.shipping,
                tax: data.displayTax ?? data.tax ?? this.basket.tax,
                subtotal: data.displaySubTotal ?? data.subtotal ?? this.basket.subtotal,
                discount: data.displayDiscount ?? data.discount ?? this.basket.discount
            };

            if (Array.isArray(data.lineItems)) {
                this.basketLineItems = data.lineItems;
            } else if (data.isEmpty === true) {
                this.basketLineItems = [];
            }

            // Update applied discounts list (for reactive UI updates)
            if (data.appliedDiscounts !== undefined) {
                this.appliedDiscounts = data.appliedDiscounts ?? [];
            }

            // Update currency if provided
            if (data.displayCurrencyCode || data.displayCurrencySymbol) {
                this.currency = {
                    code: data.displayCurrencyCode ?? this.currency.code,
                    symbol: data.displayCurrencySymbol ?? this.currency.symbol
                };
            }

            // Update tax-inclusive display properties
            if (data.displayPricesIncTax !== undefined) {
                this.displayPricesIncTax = data.displayPricesIncTax;
            }
            if (data.taxInclusiveDisplaySubTotal !== undefined) {
                this.taxInclusiveDisplaySubTotal = data.taxInclusiveDisplaySubTotal;
                this.formattedTaxInclusiveDisplaySubTotal = data.formattedTaxInclusiveDisplaySubTotal ?? '';
            }
            if (data.taxIncludedMessage !== undefined) {
                this.taxIncludedMessage = data.taxIncludedMessage;
            }
        },

        /**
         * Update currency settings
         * @param {Partial<CurrencyState>} data
         */
        updateCurrency(data) {
            if (data.code) this.currency.code = data.code;
            if (data.symbol) this.currency.symbol = data.symbol;
        },

        /**
         * Format a value as currency
         * @param {number} value
         * @returns {string}
         */
        formatCurrency(value) {
            return formatCurrencyLocale(
                typeof value === 'number' && !isNaN(value) ? value : 0,
                undefined,
                this.currency.code
            );
        },

        // ============================================
        // SHIPPING METHODS
        // ============================================

        /**
         * Update shipping groups and selections
         * @param {ShippingGroup[]} groups
         * @param {Object.<string, string>} [selections]
         */
        updateShipping(groups, selections) {
            this.shippingGroups = groups;
            if (selections) {
                this.shippingSelections = selections;
            }
            this.shippingCalculated = groups.length > 0;
        },

        /**
         * Set shipping selection for a group
         * Also stores by warehouseId for fallback when groupId changes
         * @param {string} groupId
         * @param {string} selectionKey - SelectionKey ("so:{guid}" or "dyn:{provider}:{serviceCode}")
         */
        setShippingSelection(groupId, selectionKey) {
            // Find the warehouseId for this group (for fallback when groupId changes)
            const group = this.shippingGroups?.find(g => g.groupId === groupId);
            const warehouseId = group?.warehouseId;

            this.shippingSelections = {
                ...this.shippingSelections,
                [groupId]: selectionKey,
                ...(warehouseId ? { [warehouseId]: selectionKey } : {})
            };
        },

        /**
         * Set shipping loading state
         * @param {boolean} loading
         */
        setShippingLoading(loading) {
            this.shippingLoading = loading;
        },

        /**
         * Set shipping error
         * @param {string|null} error
         */
        setShippingError(error) {
            this.shippingError = error;
            if (error) {
                announcer.announceError(error);
            }
        },

        // ============================================
        // PAYMENT METHODS
        // ============================================

        /**
         * Set available payment methods
         * @param {PaymentMethod[]} methods
         */
        setPaymentMethods(methods) {
            this.paymentMethods = methods;
        },

        /**
         * Set the selected payment method
         * @param {PaymentMethod|null} method
         */
        setPaymentMethod(method) {
            this.selectedPaymentMethod = method;
        },

        /**
         * Set payment session
         * @param {Object|null} session
         */
        setPaymentSession(session) {
            this.paymentSession = session;
            if (session?.invoiceId) {
                this.invoiceId = session.invoiceId;
            }
        },

        /**
         * Set payment loading state
         * @param {boolean} loading
         */
        setPaymentLoading(loading) {
            this.paymentLoading = loading;
        },

        /**
         * Set payment error
         * @param {string|null} error
         */
        setPaymentError(error) {
            this.paymentError = error;
            if (error) {
                announcer.announceError(error);
            }
        },

        /**
         * Set payment form initializing state (for skeleton loader)
         * @param {boolean} initializing
         */
        setPaymentFormInitializing(initializing) {
            this.paymentFormInitializing = initializing;
        },

        // ============================================
        // SAVED PAYMENT METHODS
        // ============================================

        /**
         * Set saved payment methods
         * @param {SavedPaymentMethod[]} methods
         */
        setSavedPaymentMethods(methods) {
            this.savedPaymentMethods = methods;
        },

        /**
         * Set whether any provider supports saving payment methods
         * @param {boolean} canSave
         */
        setCanSavePaymentMethods(canSave) {
            this.canSavePaymentMethods = canSave === true;
        },

        /**
         * Select a saved payment method for use
         * @param {SavedPaymentMethod|null} method
         */
        selectSavedMethod(method) {
            this.selectedSavedMethod = method;
            // Clear the regular payment method selection when using saved
            if (method) {
                this.selectedPaymentMethod = null;
            }
        },

        /**
         * Check if using a saved payment method
         * @returns {boolean}
         */
        isUsingSavedMethod() {
            return this.selectedSavedMethod !== null;
        },

        /**
         * Set whether to save the payment method during checkout
         * @param {boolean} save
         */
        setSavePaymentMethod(save) {
            this.savePaymentMethod = save;
        },

        /**
         * Set whether to set saved method as default
         * @param {boolean} setDefault
         */
        setAsDefault(setDefault) {
            this.setAsDefaultMethod = setDefault;
        },

        /**
         * Check if the selected provider supports saving payment methods
         * @returns {boolean}
         */
        canSaveSelectedMethod() {
            if (!this.selectedPaymentMethod) return false;
            return this.canSavePaymentMethods &&
                   this.selectedPaymentMethod.supportsVaulting === true;
        },

        /**
         * Get the saved method ID if using saved method, otherwise null
         * @returns {string|null}
         */
        getSavedMethodId() {
            return this.selectedSavedMethod?.id ?? null;
        },

        // ============================================
        // ERROR METHODS
        // ============================================

        /**
         * Set an error for a specific field
         * @param {string} field - Field path (e.g., 'email', 'billing.name')
         * @param {string} message - Error message
         */
        setError(field, message) {
            this.errors = { ...this.errors, [field]: message };
        },

        /**
         * Clear error for a specific field
         * @param {string} field
         */
        clearError(field) {
            const { [field]: _, ...rest } = this.errors;
            this.errors = rest;
        },

        /**
         * Clear all field errors
         */
        clearAllErrors() {
            this.errors = {};
            this.generalError = '';
        },

        /**
         * Set a general error message
         * @param {string} message
         */
        setGeneralError(message) {
            this.generalError = message;
            if (message) {
                announcer.announceError(message);
            }
        },

        /**
         * Clear the general error
         */
        clearGeneralError() {
            this.generalError = '';
        },

        // ============================================
        // UI STATE METHODS
        // ============================================

        /**
         * Set the submitting state
         * @param {boolean} value
         */
        setSubmitting(value) {
            this.isSubmitting = value;
        },

        /**
         * Announce a message to screen readers
         * @param {string} message
         */
        announce(message) {
            announcer.announce(message);
        },

        // ============================================
        // UPSELL METHODS
        // ============================================

        /**
         * Set upsell suggestions from API
         * @param {Array} suggestions
         */
        setUpsellSuggestions(suggestions) {
            const normalizedSuggestions = Array.isArray(suggestions) ? suggestions : [];
            this.upsellSuggestions = normalizedSuggestions;

            // Mark as seen on first interstitial exposure so refresh does not show it again
            // during the same checkout basket session.
            if (!this.interstitialSeen && normalizedSuggestions.some(s => s.checkoutMode === 'Interstitial')) {
                this.markInterstitialSeen();
            }
        },

        /**
         * Set upsells loading state
         * @param {boolean} loading
         */
        setUpsellsLoading(loading) {
            this.upsellsLoading = loading;
        },

        /**
         * Set upsells error
         * @param {string|null} error
         */
        setUpsellsError(error) {
            this.upsellsError = error;
        },

        /**
         * Dismiss interstitial upsells and show checkout form
         */
        dismissInterstitial() {
            this.interstitialDismissed = true;
            this.markInterstitialSeen();
        },

        /**
         * Persist that this basket's interstitial upsells have been seen.
         */
        markInterstitialSeen() {
            this.interstitialSeen = true;
            setInterstitialSeenForBasket(this.basketId, true);
        },

        /**
         * Toggle inline upsells collapsed state
         */
        toggleInlineUpsells() {
            this.inlineUpsellsCollapsed = !this.inlineUpsellsCollapsed;
        },

        /**
         * Mark a product as added from upsells
         * @param {string} productId
         */
        markUpsellProductAdded(productId) {
            this.addedUpsellProductIds = new Set([...this.addedUpsellProductIds, productId]);
        },

        /**
         * Check if upsell product was already added this session
         * @param {string} productId
         * @returns {boolean}
         */
        wasUpsellProductAdded(productId) {
            return this.addedUpsellProductIds.has(productId);
        },

        /**
         * Set upsell add-to-cart loading state
         * @param {boolean} adding
         */
        setUpsellAddingToCart(adding) {
            this.upsellAddingToCart = adding;
        },

        /**
         * Clear all upsell state
         */
        clearUpsells() {
            this.upsellSuggestions = [];
            this.upsellsLoading = false;
            this.upsellsError = null;
            this.interstitialSeen = false;
            this.interstitialDismissed = false;
            setInterstitialSeenForBasket(this.basketId, false);
            this.inlineUpsellsCollapsed = false;
            this.addedUpsellProductIds = new Set();
            this.upsellAddingToCart = false;
        },

        /**
         * Check if checkout should show interstitial
         * @returns {boolean}
         */
        shouldShowInterstitial() {
            if (this.interstitialDismissed) return false;
            return this.upsellSuggestions.some(s => s.checkoutMode === 'Interstitial');
        },

        /**
         * Get suggestions for a specific checkout mode
         * @param {string} mode - 'Inline' or 'Interstitial'
         * @returns {Array}
         */
        getSuggestionsByMode(mode) {
            return this.upsellSuggestions.filter(s => s.checkoutMode === mode);
        }
    });
}

/**
 * Get the checkout store
 * @returns {ReturnType<typeof initCheckoutStore> extends void ? any : never}
 */
export function getCheckoutStore() {
    // @ts-ignore - Alpine is global
    return Alpine.store('checkout');
}

export default { initCheckoutStore, getCheckoutStore };
