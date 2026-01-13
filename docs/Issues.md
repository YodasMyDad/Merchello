# Checkout Architecture Issues & Remediation Plan

## Executive Summary

A comprehensive audit of the Merchello checkout system has identified significant architectural debt that impacts maintainability, reliability, and debugging. This document details all confirmed issues with specific code locations and provides a phased remediation plan.

**Key Findings:**
- 6 major architectural issues confirmed
- 8 critical files affected
- 1,025+ lines in a single monolithic component
- State duplicated across 3 different mechanisms
- Payment logic fragmented across 3 files with incompatible interfaces

---

## Table of Contents

1. [Issue 1: Monolithic Single-Page Checkout Component](#issue-1-monolithic-single-page-checkout-component)
2. [Issue 2: Triple State Management](#issue-2-triple-state-management)
3. [Issue 3: Payment Flow Fragmentation](#issue-3-payment-flow-fragmentation)
4. [Issue 4: Code Duplication](#issue-4-code-duplication)
5. [Issue 5: Race Conditions](#issue-5-race-conditions)
6. [Issue 6: Confirmation Page Problems](#issue-6-confirmation-page-problems)
7. [Remediation Plan](#remediation-plan)

---

## Issue 1: Monolithic Single-Page Checkout Component

**Severity:** HIGH
**File:** `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js`
**Size:** 1,025 lines

### Problem Description

The single-page checkout component violates the Single Responsibility Principle by handling 18+ distinct concerns in one file. This creates:
- Difficult debugging due to interconnected state
- High cognitive load for developers
- Risk of unintended side effects when making changes
- Testing complexity

### Responsibility Breakdown

| Responsibility | Line Range | Lines |
|----------------|------------|-------|
| Form State Management | 56-86 | ~30 |
| Account/Auth State | 92-101 | ~10 |
| Address State | 107-109 | ~3 |
| Shipping State | 115-121 | ~7 |
| Payment State | 127-135 | ~9 |
| Validation State | 141-152 | ~12 |
| Computed Properties | 165-214 | ~50 |
| Lifecycle/Initialization | 220-270 | ~50 |
| Helper Methods | 276-312 | ~37 |
| Region Loading | 327-341 | ~15 |
| Address Handlers | 347-406 | ~60 |
| Email Capture | 412-423 | ~12 |
| Address Auto-Save | 429-476 | ~48 |
| Shipping Calculation | 482-597 | ~115 |
| Payment Methods | 603-740 | ~138 |
| Account Methods | 746-815 | ~70 |
| Validation | 821-892 | ~72 |
| Order Submission | 898-1019 | ~122 |

### Code Example

```javascript
// Lines 51-159: Massive data() function with all state
data() {
    return {
        // Form state
        form: { email: '', billing: {/*...*/}, shipping: {/*...*/} },

        // Account state
        checkingEmail: false,
        existingAccount: false,
        passwordValid: false,
        // ... 10 more properties

        // Shipping state
        shippingGroups: [],
        shippingSelections: {},
        shippingLoading: false,
        // ... 7 more properties

        // Payment state
        paymentMethods: [],
        selectedPaymentMethod: null,
        // ... 9 more properties

        // Validation state
        errors: {},
        generalError: null,
        // ... 12 more properties

        // Meta state
        _emailCaptured: false,
        _lastAddressHash: null,
        _shippingRequestId: 0,
        _paymentInitRequestId: 0
    };
}
```

### Impact

- **Maintainability:** Any change requires understanding the entire file
- **Testing:** Unit testing individual features is nearly impossible
- **Onboarding:** New developers struggle to understand the flow
- **Bug Risk:** Changes in one area can affect unrelated features

---

## Issue 2: Triple State Management

**Severity:** HIGH
**Files Affected:**
- `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js`
- `src/Merchello/wwwroot/js/checkout/stores/checkout.store.js`
- Window globals

### Problem Description

Checkout state is duplicated across three different mechanisms with no clear ownership, leading to synchronization issues and confusion about the source of truth.

### State Locations

#### Location 1: Component Local Data (single-page-checkout.js:51-159)
```javascript
data() {
    return {
        form: {
            email: '',
            billing: { name: '', address1: '', /*...*/ },
            shipping: { /*...*/ }
        },
        shippingGroups: [],
        shippingSelections: {},
        paymentMethods: [],
        selectedPaymentMethod: null,
        // ... many more
    };
}
```

#### Location 2: Alpine Store (checkout.store.js)
```javascript
Alpine.store('checkout', {
    email: '',
    billingAddress: {},
    shippingAddress: {},
    basket: { items: [], total: 0 },
    currency: { code: 'GBP', symbol: '£' },
    // ...

    setEmail(email) { this.email = email; },
    updateBillingAddress(addr) { this.billingAddress = addr; },
    // ...
});
```

#### Location 3: Window Globals
```javascript
// Used throughout single-page-checkout.js
window.MerchelloSinglePageAnalytics  // Lines 267, 576, 635, 830
window.MerchelloPayment              // Lines 612, 636, 700, 711, 736, 977, 986, 999
```

### Synchronization Code (Evidence of Problem)

```javascript
// single-page-checkout.js lines 223-228
const store = this.$store.checkout;
store.setEmail(this.form.email);           // Sync email
store.updateBillingAddress(this.form.billing);   // Sync billing
store.updateShippingAddress(this.form.shipping); // Sync shipping
```

This manual synchronization is required because:
1. Component owns the form data
2. Store is expected to have it for other components
3. No automatic binding between them

### Specific Duplications

| Data | Component Location | Store Location | Window Location |
|------|-------------------|----------------|-----------------|
| Email | `form.email` (line 57) | `store.email` | - |
| Email captured flag | `_emailCaptured` (line 150) | - | - |
| Billing address | `form.billing` (line 58) | `store.billingAddress` | - |
| Shipping address | `form.shipping` (line 64) | `store.shippingAddress` | - |
| Basket total | `basketTotal` (line 156) | `store.basket.total` | - |
| Payment session | `paymentSession` (line 134) | - | `MerchelloPayment.currentSession` |

### Impact

- **Data Inconsistency:** Changes to one location may not propagate to others
- **Debugging Difficulty:** Unclear where state actually lives
- **Memory Overhead:** Same data stored multiple times
- **Race Conditions:** Updates can overwrite each other

---

## Issue 3: Payment Flow Fragmentation

**Severity:** HIGH
**Files Affected:**
- `src/Merchello/wwwroot/js/checkout/payment.js`
- `src/Merchello/wwwroot/js/checkout/components/express-checkout.js`
- `src/Merchello/wwwroot/js/checkout/adapters/paypal-express-adapter.js`
- `src/Merchello/wwwroot/js/checkout/adapters/paypal-payment-adapter.js`

### Problem Description

Payment processing is split across multiple files with incompatible interfaces, creating maintenance burden and inconsistent behavior.

### Fragmentation Analysis

#### Issue 3.1: Dual Adapter Registries

Two completely separate adapter systems exist:

**Standard Payment Adapters (payment.js:9-10):**
```javascript
window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};

// Interface: render(container, session, checkout)
```

**Express Payment Adapters (express-checkout.js:33):**
```javascript
window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};

// Interface: render(wrapper, method, config, component)
```

**Impact:** Payment providers must implement two separate adapters with different interfaces.

#### Issue 3.2: Three Payment Initiation Endpoints

| Flow | File | Line | Endpoint |
|------|------|------|----------|
| Form-based | single-page-checkout.js | 688 | `/api/merchello/checkout/pay` |
| Express | express-checkout.js | 323 | `/api/merchello/checkout/express` |
| PayPal Express | paypal-express-adapter.js | 70 | `/api/merchello/checkout/express-payment-intent` |

**Impact:** Backend has multiple payment initiation paths with different parameters.

#### Issue 3.3: Duplicated PayPal Logic

PayPal has two separate adapters that duplicate functionality:

**PayPal Payment Adapter (paypal-payment-adapter.js:56-86):**
```javascript
createOrder: async function(data, actions) {
    if (config.orderId) return config.orderId;
    const response = await MerchelloPayment.fetchWithTimeout(
        `/api/merchello/checkout/paypal/create-order`, {
        method: 'POST',
        body: JSON.stringify({
            sessionId: session.sessionId,
            methodAlias: session.methodAlias
        })
    });
    return result.orderId;
}
```

**PayPal Express Adapter (paypal-express-adapter.js:68-96):**
```javascript
createOrder: async function() {
    const response = await fetch(
        '/api/merchello/checkout/express-payment-intent', {
        method: 'POST',
        body: JSON.stringify({
            providerAlias: method.providerAlias || 'paypal',
            methodAlias: method.methodAlias,
            amount: config.amount,
            currency: config.currency,
            subTotal: config.subTotal,
            shipping: config.shipping,
            tax: config.tax
        })
    });
    return data.orderId;
}
```

**Impact:** Changes to PayPal integration require updates in two places.

#### Issue 3.4: Inconsistent Error Handling

Each adapter handles errors differently:

**PayPal Express (lines 128-132):**
```javascript
catch (error) {
    console.error('PayPal express checkout error:', error);
    checkout.error = error.message || 'Payment failed. Please try again.';
    checkout.isProcessing = false;
}
```

**PayPal Payment (lines 121-130):**
```javascript
catch (error) {
    console.error('Error capturing PayPal order:', error);
    const errorContainer = currentContainer?.querySelector('#paypal-errors');
    if (errorContainer) {
        errorContainer.textContent = error.message || 'Payment failed';
        errorContainer.classList.remove('hidden');
    }
    throw error;
}
```

**Impact:** Inconsistent user experience across payment methods.

### Payment Flow Diagram

```
STANDARD PAYMENT FLOW:
single-page-checkout.js
  │
  ├─ loadPaymentMethods() → GET /api/payment-methods
  │
  ├─ onPaymentMethodChange(method)
  │
  ├─ initializePaymentForm()
  │   └─ POST /api/merchello/checkout/pay
  │
  └─ window.MerchelloPayment.handlePaymentFlow()
      │
      ├─ Redirect: safeRedirect() → external provider
      │
      ├─ HostedFields/Widget: loads adapter script
      │   ├─ adapter.render() → renders form
      │   ├─ (user fills form, clicks submit)
      │   ├─ window.MerchelloPayment.submitPayment()
      │   ├─ adapter.submit() → POST /api/checkout/process-direct-payment
      │   └─ safeRedirect() → confirmation
      │
      └─ DirectForm: pseudo-adapter created
          ├─ createFormFields() → renders custom form
          └─ submitDirectForm() → POST /api/checkout/process-direct-payment

EXPRESS CHECKOUT FLOW:
express-checkout.js
  │
  ├─ init() → GET /api/checkout/express-config
  │
  ├─ initializeExpressCheckout()
  │   ├─ loads SDK (method.sdkUrl)
  │   ├─ loads adapter (method.adapterUrl)
  │   └─ adapter.render() → renders button
  │
  └─ (user clicks button)
      ├─ adapter calls createOrder → POST /api/checkout/express-payment-intent
      ├─ adapter calls onApprove
      ├─ checkout.processExpressCheckout() → POST /api/checkout/express
      └─ safeRedirect() to confirmation
```

---

## Issue 4: Code Duplication

**Severity:** MODERATE
**Files Affected:** Multiple checkout JavaScript files

### Problem Description

Several utility functions and patterns are duplicated across the checkout codebase, violating DRY principles.

### Duplication 4.1: Region Loading

**File 1: single-page-checkout.js (lines 327-341)**
```javascript
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
}
```

**File 2: address-form.js (lines 105-117)**
```javascript
async loadRegions() {
    if (!this.fields.countryCode) {
        this.regions = [];
        return;
    }

    try {
        this.regions = await checkoutApi.getRegions(this.prefix, this.fields.countryCode);
    } catch (error) {
        console.error('Failed to load regions:', error);
        this.regions = [];
    }
}
```

**Impact:** Logic changes require updates in multiple places.

### Duplication 4.2: Currency Formatting

Three separate implementations exist:

**File 1: order-summary.js (lines 38-42)**
```javascript
formatCurrency(value) {
    const symbol = this.$store.checkout?.currency?.symbol ?? '£';
    return `${symbol}${value.toFixed(2)}`;
}
```

**File 2: checkout.store.js (lines 237-239)**
```javascript
formatCurrency(value) {
    return `${this.currency.symbol}${value.toFixed(2)}`;
}
```

**File 3: single-page-checkout.js (lines 203-205)**
```javascript
get formattedTotal() {
    return this.currencySymbol + this.basketTotal.toFixed(2);
}
```

**Note:** A `formatters.js` utility exists but is not used consistently.

### Duplication 4.3: Address Validation

**single-page-checkout.js (lines 838-860)** - Billing and shipping validation are nearly identical:

```javascript
// Billing validation (lines 838-848)
} else if (field.startsWith('billing.')) {
    const key = field.replace('billing.', '');
    const requiredFields = ['name', 'address1', 'city', 'countryCode', 'postalCode'];
    if (requiredFields.includes(key) && !this.form.billing[key]) {
        this.errors[field] = 'This field is required.';
    } else if (key === 'phone') {
        const result = validatePhone(this.form.billing.phone);
        if (!result.isValid) {
            this.errors[field] = result.error;
        }
    }
}

// Shipping validation (lines 849-860) - IDENTICAL PATTERN
} else if (field.startsWith('shipping.')) {
    const key = field.replace('shipping.', '');
    const requiredFields = ['name', 'address1', 'city', 'countryCode', 'postalCode'];
    if (requiredFields.includes(key) && !this.form.shipping[key]) {
        this.errors[field] = 'This field is required.';
    } else if (key === 'phone') {
        const result = validatePhone(this.form.shipping.phone);
        if (!result.isValid) {
            this.errors[field] = result.error;
        }
    }
}
```

### Duplication 4.4: Address Display in Confirmation

**Confirmation.cshtml (lines 169-238)** - 60+ lines of identical address rendering:

```razor
<!-- Shipping Address (lines 169-200) -->
@if (!string.IsNullOrEmpty(confirmation.ShippingAddress.Name))
{
    @confirmation.ShippingAddress.Name<br />
}
@if (!string.IsNullOrEmpty(confirmation.ShippingAddress.Address1))
{
    @confirmation.ShippingAddress.Address1<br />
}
<!-- ... continues for all fields -->

<!-- Billing Address (lines 206-237) - IDENTICAL PATTERN -->
@if (!string.IsNullOrEmpty(confirmation.BillingAddress.Name))
{
    @confirmation.BillingAddress.Name<br />
}
@if (!string.IsNullOrEmpty(confirmation.BillingAddress.Address1))
{
    @confirmation.BillingAddress.Address1<br />
}
<!-- ... continues for all fields -->
```

---

## Issue 5: Race Conditions

**Severity:** MEDIUM
**Files Affected:**
- `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js`
- `src/Merchello/wwwroot/js/checkout/components/express-checkout.js`

### Problem Description

Several race conditions exist in the checkout flow, though some are mitigated by existing safeguards.

### Race Condition 5.1: Nested Debounce (CONFIRMED ISSUE)

**File:** single-page-checkout.js (lines 482-487)

```javascript
async debouncedCalculateShipping() {
    this.debouncedCaptureAddress();   // NESTED CALL - PROBLEMATIC
    if (!this.canCalculateShipping) return;
    debouncer.debounce('shipping', () => this.calculateShipping(), 500);
}

async debouncedCaptureAddress() {  // Line 474
    debouncer.debounce('captureAddress', () => this.captureAddress(), 500);
}
```

**Scenario:**
1. User changes address → `debouncedCalculateShipping()` fires
2. Starts 500ms timer for both shipping calculation AND address capture
3. User changes another field before timer expires
4. Shipping calculation uses old address data
5. Address capture sends newer data after shipping calculation

**Impact:** Stale address data can be used for shipping calculation.

### Race Condition 5.2: Express Checkout Re-render (CONFIRMED ISSUE)

**File:** express-checkout.js (lines 113-127)

```javascript
const amountChanged = Math.abs(newAmount - oldAmount) > 0.01;
if (amountChanged) {
    if (this._reRenderTimeout) {
        clearTimeout(this._reRenderTimeout);
    }
    this._reRenderTimeout = setTimeout(async () => {
        this._reRenderTimeout = null;
        this._lastKnownAmount = this.config.amount;
        await this.initializeExpressCheckout();  // TEARDOWN + RE-RENDER
    }, 300);
}
```

**Scenario:**
1. User clicks PayPal button
2. Shipping selection changes basket amount
3. `initializeExpressCheckout()` called
4. `teardownExpressButtons()` destroys button mid-click
5. User action interrupted

### Race Condition 5.3: Request ID Pattern (PROPERLY IMPLEMENTED)

The codebase uses a request ID pattern that correctly handles most race conditions:

**Shipping Calculation (lines 494, 507-509):**
```javascript
const requestId = ++this._shippingRequestId;
// ... async operation ...
if (requestId !== this._shippingRequestId) {
    return;  // Ignore stale response
}
```

**Payment Initialization (lines 662, 681-682):**
```javascript
const requestId = ++this._paymentInitRequestId;
// ... async operation ...
if (requestId !== this._paymentInitRequestId) {
    return;  // User switched methods
}
```

**Assessment:** This pattern is correctly implemented and prevents most stale data issues.

---

## Issue 6: Confirmation Page Problems

**Severity:** HIGH
**File:** `src/Merchello/Views/Checkout/Confirmation.cshtml`

### Problem 6.1: No Browser Back Button Protection

**Current State:** The confirmation page has NO back button prevention mechanism.

**Risk:**
- Users can navigate back to checkout form
- Potential for duplicate order submission
- Confusing user experience

**Evidence:** No `history.replaceState()` or `popstate` listener exists in the page.

### Problem 6.2: JSON Serialization in View

**File:** Confirmation.cshtml (lines 317-325)

```csharp
@Html.Raw(System.Text.Json.JsonSerializer.Serialize(
    confirmation.LineItems.Select(li => new {
        item_id = string.IsNullOrEmpty(li.Sku) ? li.Id.ToString() : li.Sku,
        item_name = li.Name,
        price = li.UnitPrice,
        quantity = li.Quantity
    })
))
```

**Problems:**
1. **Architectural violation:** JSON serialization belongs in the controller
2. **Security risk:** Direct output without proper escaping
3. **Maintainability:** Complex logic in view
4. **Testability:** Cannot unit test this transformation

### Problem 6.3: Inline Analytics with Mixed Languages

**File:** Confirmation.cshtml (lines 296-328)

```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        if (window.MerchelloCheckout) {
            var purchaseKey = 'merchello_purchase_' + '@confirmation.InvoiceId';
            if (localStorage.getItem(purchaseKey)) {
                console.debug('Purchase event already fired...');
                return;
            }
            localStorage.setItem(purchaseKey, Date.now().toString());
            window.MerchelloCheckout.emit('checkout:purchase', {
                transaction_id: '@confirmation.InvoiceNumber',
                currency_symbol: '@confirmation.CurrencySymbol',
                value: @confirmation.Total,
                // ... more fields
            });
        }
    });
</script>
```

**Issues:**
- Mixed C# Razor syntax and JavaScript
- No type safety
- Fragile numeric interpolation (`@confirmation.Total` without quotes)
- Should be a separate module

---

## Remediation Plan

### Phase 1: Quick Wins & Critical Fixes

**Timeline:** First priority
**Risk:** Low
**Impact:** High

#### Task 1.1: Browser Back Button Protection

**File to create:** `src/Merchello/wwwroot/js/checkout/confirmation.js`

```javascript
// Prevent back navigation after order completion
(function() {
    // Replace current history entry
    history.replaceState(null, '', location.href);

    // Intercept back button
    window.addEventListener('popstate', function() {
        history.pushState(null, '', location.href);
    });

    // Optional: warn on page unload during critical actions
    // window.addEventListener('beforeunload', ...)
})();
```

**File to update:** `Confirmation.cshtml`
- Add script reference to new file

#### Task 1.2: Move JSON Serialization to Controller

**File to update:** Controller handling confirmation page

Add view model property:
```csharp
public class ConfirmationViewModel
{
    // Existing properties...

    /// <summary>
    /// Pre-serialized line items for analytics
    /// </summary>
    public string LineItemsJson { get; set; }
}
```

Serialize in controller:
```csharp
viewModel.LineItemsJson = JsonSerializer.Serialize(
    confirmation.LineItems.Select(li => new {
        item_id = string.IsNullOrEmpty(li.Sku) ? li.Id.ToString() : li.Sku,
        item_name = li.Name,
        price = li.UnitPrice,
        quantity = li.Quantity
    })
);
```

Update view:
```razor
items: @Html.Raw(Model.LineItemsJson)
```

#### Task 1.3: Extract Shared Utilities

**File to create:** `src/Merchello/wwwroot/js/checkout/utils/regions.js`

```javascript
/**
 * Load regions for a country
 * @param {Object} api - The checkout API instance
 * @param {string} addressType - 'billing' or 'shipping'
 * @param {string} countryCode - ISO country code
 * @returns {Promise<Array>} Array of regions
 */
export async function loadRegions(api, addressType, countryCode) {
    if (!countryCode) return [];
    try {
        return await api.getRegions(addressType, countryCode);
    } catch (error) {
        console.error('Failed to load regions:', error);
        return [];
    }
}
```

**File to update:** Ensure `formatters.js` exports are used consistently:

```javascript
// In all components, replace inline formatting with:
import { formatCurrency } from '../utils/formatters.js';
```

#### Task 1.4: Add Cache-Control Headers for Confirmation Page

**File to update:** `src/Merchello/Controllers/MerchelloCheckoutController.cs`

Add response headers to prevent browser caching of sensitive order data:

```csharp
public async Task<IActionResult> Confirmation(Guid id, CancellationToken ct)
{
    // Prevent browser caching of confirmation page
    Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
    Response.Headers["Pragma"] = "no-cache";
    Response.Headers["Expires"] = "0";

    // ... existing confirmation logic
}
```

**Security Benefits:**
- Prevents back-button from showing cached confirmation data
- Prevents shared computer users from seeing previous orders
- Complements the browser history protection from Task 1.1

---

### Phase 2: State Management Consolidation

**Timeline:** After Phase 1
**Risk:** Medium
**Impact:** High

#### Task 2.1: Establish Alpine Store as Single Source of Truth

**File to update:** `src/Merchello/wwwroot/js/checkout/stores/checkout.store.js`

```javascript
Alpine.store('checkout', {
    // ===== FORM STATE (moved from component) =====
    form: {
        email: '',
        billing: {
            name: '',
            address1: '',
            address2: '',
            city: '',
            state: '',
            countryCode: '',
            postalCode: '',
            phone: ''
        },
        shipping: {
            name: '',
            address1: '',
            address2: '',
            city: '',
            state: '',
            countryCode: '',
            postalCode: '',
            phone: ''
        },
        sameAsBilling: false
    },

    // ===== SHIPPING STATE =====
    shippingGroups: [],
    shippingSelections: {},
    shippingLoading: false,
    shippingError: null,
    shippingCalculated: false,

    // ===== PAYMENT STATE =====
    paymentMethods: [],
    selectedPaymentMethod: null,
    paymentSession: null,
    paymentLoading: false,

    // ===== UI STATE =====
    isSubmitting: false,
    errors: {},
    generalError: null,

    // ===== BASKET (existing) =====
    basket: {
        items: [],
        subTotal: 0,
        shipping: 0,
        tax: 0,
        discounts: [],
        total: 0
    },

    // ===== METHODS =====
    setFormField(path, value) {
        const parts = path.split('.');
        let obj = this.form;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
    },

    updateShipping(groups, selections) {
        this.shippingGroups = groups;
        this.shippingSelections = selections;
    },

    setPaymentMethod(method) {
        this.selectedPaymentMethod = method;
    },

    setError(field, message) {
        this.errors[field] = message;
    },

    clearError(field) {
        delete this.errors[field];
    },

    // ... additional methods
});
```

#### Task 2.2: Update Component to Use Store

**File to update:** `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js`

```javascript
export default function singlePageCheckout(initialData) {
    return {
        // ===== LOCAL STATE (UI-specific only) =====
        _shippingRequestId: 0,
        _paymentInitRequestId: 0,
        _emailCaptured: false,
        _lastAddressHash: null,
        announcement: '',

        // ===== COMPUTED (read from store) =====
        get form() { return this.$store.checkout.form; },
        get shippingGroups() { return this.$store.checkout.shippingGroups; },
        get shippingLoading() { return this.$store.checkout.shippingLoading; },
        get paymentMethods() { return this.$store.checkout.paymentMethods; },
        get selectedPaymentMethod() { return this.$store.checkout.selectedPaymentMethod; },
        get errors() { return this.$store.checkout.errors; },
        get isSubmitting() { return this.$store.checkout.isSubmitting; },

        // ===== METHODS (delegate to store) =====
        setFormField(path, value) {
            this.$store.checkout.setFormField(path, value);
        },

        // ... rest of methods unchanged but using store
    };
}
```

#### Task 2.3: Remove Window Globals Where Possible

**File to update:** `src/Merchello/wwwroot/js/checkout/payment.js`

Convert to module exports while maintaining backward compatibility:

```javascript
// Export for ES module usage
export const paymentManager = {
    // ... existing functionality
};

// Backward compatibility for external adapters
window.MerchelloPayment = paymentManager;
```

---

### Phase 3: Payment Architecture Consolidation

**Timeline:** After Phase 2
**Risk:** High
**Impact:** High

#### Task 3.1: Create Unified Adapter Interface

**File to create:** `src/Merchello/wwwroot/js/checkout/adapters/adapter-interface.js`

```javascript
/**
 * Unified Payment Adapter Interface
 *
 * @typedef {Object} PaymentAdapterConfig
 * @property {string} name - Human-readable adapter name
 * @property {boolean} supportsStandard - Can handle standard checkout
 * @property {boolean} supportsExpress - Can handle express checkout
 */

/**
 * @typedef {Object} PaymentAdapter
 * @property {PaymentAdapterConfig} config
 * @property {function} render - Render payment UI
 * @property {function} [submit] - Submit payment (for form-based)
 * @property {function} [tokenize] - Tokenize card data
 * @property {function} teardown - Cleanup resources
 * @property {function} [extractCustomerData] - Extract customer data (for express)
 */

/**
 * Register a payment adapter
 * @param {string} name - Unique adapter name
 * @param {PaymentAdapter} adapter - Adapter implementation
 */
export function registerAdapter(name, adapter) {
    window.MerchelloPaymentAdapters = window.MerchelloPaymentAdapters || {};
    window.MerchelloPaymentAdapters[name] = adapter;

    // Also register in express registry if supported
    if (adapter.config.supportsExpress) {
        window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};
        window.MerchelloExpressAdapters[name] = adapter;
    }
}

/**
 * Get an adapter by name
 * @param {string} name - Adapter name
 * @param {boolean} forExpress - Whether this is for express checkout
 * @returns {PaymentAdapter|null}
 */
export function getAdapter(name, forExpress = false) {
    const adapters = forExpress
        ? window.MerchelloExpressAdapters
        : window.MerchelloPaymentAdapters;
    return adapters?.[name] || null;
}
```

#### Task 3.2: Consolidate PayPal Adapters

**File to create:** `src/Merchello/wwwroot/js/checkout/adapters/paypal-unified-adapter.js`

```javascript
import { registerAdapter } from './adapter-interface.js';

const paypalAdapter = {
    config: {
        name: 'PayPal',
        supportsStandard: true,
        supportsExpress: true
    },

    renderedButtons: {},

    /**
     * Render PayPal button
     * @param {HTMLElement} container
     * @param {Object} config
     * @param {Object} context - { isExpress, session, checkout, method }
     */
    async render(container, config, context) {
        const { isExpress, session, checkout, method } = context;

        const buttonConfig = {
            style: { /* ... */ },

            createOrder: async () => {
                if (isExpress) {
                    return this._createExpressOrder(method, config);
                } else {
                    return this._createStandardOrder(session);
                }
            },

            onApprove: async (data) => {
                if (isExpress) {
                    return this._handleExpressApproval(data, checkout, method);
                } else {
                    return this._handleStandardApproval(data, session);
                }
            },

            onError: (err) => this._handleError(err, context),
            onCancel: () => this._handleCancel(context)
        };

        // ... render button
    },

    // Private methods for different flows
    async _createExpressOrder(method, config) { /* ... */ },
    async _createStandardOrder(session) { /* ... */ },
    async _handleExpressApproval(data, checkout, method) { /* ... */ },
    async _handleStandardApproval(data, session) { /* ... */ },

    // Shared error handling
    _handleError(err, context) {
        const message = err.message || 'Payment failed';
        if (context.checkout) {
            context.checkout.error = message;
        }
        window.dispatchEvent(new CustomEvent('merchello:payment-error', {
            detail: { error: err, provider: 'paypal' }
        }));
    },

    teardown() { /* ... */ }
};

registerAdapter('paypal', paypalAdapter);
export default paypalAdapter;
```

#### Task 3.3: Standardize Error Handling

**File to create:** `src/Merchello/wwwroot/js/checkout/utils/payment-errors.js`

```javascript
/**
 * Standard payment error codes
 */
export const PaymentErrorCodes = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    CANCELLED: 'CANCELLED',
    TIMEOUT: 'TIMEOUT',
    UNKNOWN: 'UNKNOWN'
};

/**
 * Handle payment error consistently
 * @param {Error} error
 * @param {Object} context - { provider, method, checkout }
 * @returns {string} User-friendly error message
 */
export function handlePaymentError(error, context = {}) {
    const code = error.code || PaymentErrorCodes.UNKNOWN;
    const userMessage = getUserMessage(code, error.message);

    // Update store
    const store = Alpine?.store?.('checkout');
    if (store) {
        store.generalError = userMessage;
    }

    // Emit event for analytics/logging
    window.dispatchEvent(new CustomEvent('merchello:payment-error', {
        detail: {
            code,
            message: error.message,
            userMessage,
            provider: context.provider,
            method: context.method
        }
    }));

    return userMessage;
}

function getUserMessage(code, technicalMessage) {
    const messages = {
        [PaymentErrorCodes.NETWORK_ERROR]: 'Unable to process payment. Please check your connection and try again.',
        [PaymentErrorCodes.VALIDATION_ERROR]: 'Please check your payment details and try again.',
        [PaymentErrorCodes.PROVIDER_ERROR]: 'Payment provider error. Please try again or use a different payment method.',
        [PaymentErrorCodes.CANCELLED]: 'Payment was cancelled.',
        [PaymentErrorCodes.TIMEOUT]: 'Payment timed out. Please try again.',
        [PaymentErrorCodes.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };
    return messages[code] || technicalMessage || messages[PaymentErrorCodes.UNKNOWN];
}
```

#### Task 3.4: Consolidate Payment Endpoints

**Problem:** Express checkout uses unified endpoints while standard payment uses provider-specific endpoints, creating inconsistency.

| Current Flow | Endpoint Pattern |
|--------------|------------------|
| Express | Unified: `/api/merchello/checkout/express-payment-intent` with `providerAlias` in body |
| Standard | Provider-specific: `/api/merchello/checkout/{providerAlias}/create-order` |

**Solution:** Migrate standard payment to use unified endpoints matching the express pattern.

**Files to update:**
- `src/Merchello/Controllers/CheckoutPaymentsApiController.cs`
- `src/Merchello/wwwroot/js/checkout/payment.js`
- `src/Merchello/wwwroot/js/checkout/adapters/*.js`

**New unified endpoints:**

```csharp
// Replace provider-specific routes:
// [HttpPost("{providerAlias}/create-order")]
// [HttpPost("{providerAlias}/capture-order")]

// With unified routes:
[HttpPost("create-order")]
public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request, CancellationToken ct)
{
    // request.ProviderAlias, request.MethodAlias in body instead of route
}

[HttpPost("capture-order")]
public async Task<IActionResult> CaptureOrder([FromBody] CaptureOrderRequest request, CancellationToken ct)
{
    // Same pattern
}
```

**Adapter updates:**

```javascript
// Before (payment.js/adapters):
fetch(`/api/merchello/checkout/${providerAlias}/create-order`, { ... })

// After:
fetch('/api/merchello/checkout/create-order', {
    body: JSON.stringify({ providerAlias, methodAlias, ...data })
})
```

**Benefits:**
- Consistent API design across all payment flows
- Simpler routing logic in controller
- Easier to add new providers (no new routes needed)
- Aligns frontend patterns between express and standard checkout

---

### Phase 4: Component Decomposition

**Timeline:** After Phase 3
**Risk:** High
**Impact:** High

#### Task 4.1: Extract Address Form Component

**File to create:** `src/Merchello/wwwroot/js/checkout/components/checkout-address-form.js`

```javascript
import { loadRegions } from '../utils/regions.js';
import { validatePhone } from '../utils/validators.js';

export default function checkoutAddressForm(prefix, countries) {
    return {
        prefix,
        countries,
        regions: [],

        get fields() {
            return this.$store.checkout.form[this.prefix];
        },

        get errors() {
            const allErrors = this.$store.checkout.errors;
            const prefixedErrors = {};
            Object.keys(allErrors).forEach(key => {
                if (key.startsWith(`${this.prefix}.`)) {
                    const field = key.replace(`${this.prefix}.`, '');
                    prefixedErrors[field] = allErrors[key];
                }
            });
            return prefixedErrors;
        },

        async init() {
            if (this.fields.countryCode) {
                await this.onCountryChange();
            }
        },

        setField(field, value) {
            this.$store.checkout.setFormField(`${this.prefix}.${field}`, value);
            this.validateField(field);
            this.$dispatch('address-changed', { prefix: this.prefix, field, value });
        },

        async onCountryChange() {
            const countryCode = this.fields.countryCode;
            this.regions = await loadRegions(checkoutApi, this.prefix, countryCode);

            // Clear state if not valid for new country
            if (this.fields.state && !this.regions.find(r => r.code === this.fields.state)) {
                this.setField('state', '');
            }
        },

        validateField(field) {
            const value = this.fields[field];
            const required = ['name', 'address1', 'city', 'countryCode', 'postalCode'];

            if (required.includes(field) && !value) {
                this.$store.checkout.setError(`${this.prefix}.${field}`, 'This field is required.');
            } else if (field === 'phone' && value) {
                const result = validatePhone(value);
                if (!result.isValid) {
                    this.$store.checkout.setError(`${this.prefix}.${field}`, result.error);
                } else {
                    this.$store.checkout.clearError(`${this.prefix}.${field}`);
                }
            } else {
                this.$store.checkout.clearError(`${this.prefix}.${field}`);
            }
        }
    };
}
```

#### Task 4.2: Extract Shipping Selection Component

**File to create:** `src/Merchello/wwwroot/js/checkout/components/checkout-shipping.js`

```javascript
export default function checkoutShipping() {
    return {
        get groups() { return this.$store.checkout.shippingGroups; },
        get selections() { return this.$store.checkout.shippingSelections; },
        get loading() { return this.$store.checkout.shippingLoading; },
        get error() { return this.$store.checkout.shippingError; },

        selectOption(groupId, optionId) {
            const newSelections = { ...this.selections, [groupId]: optionId };
            this.$store.checkout.shippingSelections = newSelections;
            this.$dispatch('shipping-selection-changed', { groupId, optionId });
        },

        getSelectedOption(groupId) {
            return this.selections[groupId];
        },

        formatShippingCost(cost) {
            return formatCurrency(cost, this.$store.checkout.currency);
        }
    };
}
```

#### Task 4.3: Extract Payment Selection Component

**File to create:** `src/Merchello/wwwroot/js/checkout/components/checkout-payment.js`

```javascript
export default function checkoutPayment() {
    return {
        get methods() { return this.$store.checkout.paymentMethods; },
        get selectedMethod() { return this.$store.checkout.selectedPaymentMethod; },
        get loading() { return this.$store.checkout.paymentLoading; },

        get cardMethods() {
            return this.methods.filter(m =>
                [10, 20, 30].includes(m.integrationType)
            );
        },

        get redirectMethods() {
            return this.methods.filter(m => m.integrationType === 0);
        },

        selectMethod(method) {
            this.$store.checkout.setPaymentMethod(method);
            this.$dispatch('payment-method-changed', { method });
        },

        isSelected(method) {
            return this.selectedMethod?.methodAlias === method.methodAlias;
        }
    };
}
```

#### Task 4.4: Simplify Main Component

**File to update:** `src/Merchello/wwwroot/js/checkout/components/single-page-checkout.js`

Target: Reduce from 1,025 lines to ~400 lines (orchestration only)

```javascript
export default function singlePageCheckout(initialData) {
    return {
        // ===== MINIMAL LOCAL STATE =====
        _shippingRequestId: 0,
        _paymentInitRequestId: 0,

        // ===== INITIALIZATION =====
        async init() {
            await this.initializeStore(initialData);
            await this.loadInitialData();
            this.setupEventListeners();
        },

        // ===== EVENT HANDLERS =====
        onAddressChanged(e) {
            this.debouncedCalculateShipping();
            this.debouncedCaptureAddress();
        },

        onShippingSelectionChanged(e) {
            this.saveShippingSelection(e.detail.groupId, e.detail.optionId);
        },

        onPaymentMethodChanged(e) {
            this.initializePaymentForm(e.detail.method);
        },

        // ===== CORE OPERATIONS =====
        async calculateShipping() { /* ... */ },
        async saveShippingSelection() { /* ... */ },
        async initializePaymentForm() { /* ... */ },
        async submitOrder() { /* ... */ },

        // ===== UTILITIES =====
        setupEventListeners() {
            this.$el.addEventListener('address-changed', (e) => this.onAddressChanged(e));
            this.$el.addEventListener('shipping-selection-changed', (e) => this.onShippingSelectionChanged(e));
            this.$el.addEventListener('payment-method-changed', (e) => this.onPaymentMethodChanged(e));
        }
    };
}
```

#### Task 4.5: Fix Debounce Race Condition

Separate address capture from shipping calculation:

```javascript
// BEFORE (problematic):
debouncedCalculateShipping() {
    this.debouncedCaptureAddress();  // Nested call
    debouncer.debounce('shipping', () => this.calculateShipping(), 500);
}

// AFTER (fixed):
onAddressChanged() {
    // Separate debounced operations
    this.debouncedCaptureAddress();
    this.debouncedCalculateShipping();
}

debouncedCalculateShipping() {
    if (!this.canCalculateShipping) return;
    debouncer.debounce('shipping', () => this.calculateShipping(), 500);
}

debouncedCaptureAddress() {
    debouncer.debounce('captureAddress', () => this.captureAddress(), 500);
}
```

---

### Phase 5: Testing & Validation

**Timeline:** Throughout all phases
**Risk:** Low
**Impact:** Critical

#### Manual Testing Checklist

##### Core Flows
- [ ] Guest checkout (new customer)
- [ ] Logged-in checkout (existing customer)
- [ ] Account creation during checkout
- [ ] "Same as billing" address toggle

##### Address Handling
- [ ] Country selection loads regions
- [ ] Region selection works
- [ ] Address auto-save for abandoned checkout
- [ ] Address validation errors display

##### Shipping
- [ ] Shipping calculation on address change
- [ ] Multiple shipping groups display
- [ ] Shipping option selection
- [ ] Shipping cost updates basket total

##### Payment
- [ ] Standard card payment
- [ ] PayPal redirect payment
- [ ] PayPal express checkout
- [ ] Payment method switching
- [ ] Payment error handling

##### Discounts
- [ ] Apply discount code
- [ ] Remove discount
- [ ] Invalid code handling

##### Completion
- [ ] Order submission success
- [ ] Confirmation page displays correctly
- [ ] Back button on confirmation (should not navigate back)
- [ ] Analytics event fires once

##### Edge Cases
- [ ] Slow network (loading states)
- [ ] Network failure (error handling)
- [ ] Multi-tab checkout (race conditions)
- [ ] Browser refresh during checkout
- [ ] Session timeout handling

#### Automated Tests

**Unit Tests:**
- `formatters.js` - currency formatting
- `regions.js` - region loading
- `payment-errors.js` - error handling
- `validators.js` - field validation

**Integration Tests:**
- Store state updates
- Component event handling
- API interaction mocking

**E2E Tests:**
- Complete checkout flow
- Payment provider integration
- Abandoned checkout recovery

---

## File Reference

| File | Current Lines | Target Lines | Phase |
|------|---------------|--------------|-------|
| single-page-checkout.js | 1,025 | ~400 | 4 |
| payment.js | ~760 | ~500 | 3 |
| express-checkout.js | ~370 | ~200 | 3 |
| checkout.store.js | ~240 | ~350 | 2 |
| Confirmation.cshtml | 331 | ~280 | 1 |
| **New:** confirmation.js | - | ~30 | 1 |
| **New:** regions.js | - | ~20 | 1 |
| **New:** adapter-interface.js | - | ~50 | 3 |
| **New:** payment-errors.js | - | ~60 | 3 |
| **New:** checkout-address-form.js | - | ~100 | 4 |
| **New:** checkout-shipping.js | - | ~50 | 4 |
| **New:** checkout-payment.js | - | ~60 | 4 |
| **New:** paypal-unified-adapter.js | - | ~200 | 3 |
| **Documentation:** Checkout.md | 1,618 | ~1,700 | After Phase 4 |

---

## Success Criteria

1. **single-page-checkout.js** reduced to <400 lines (orchestration only)
2. Single source of truth for checkout state (Alpine store)
3. Unified payment adapter registry with consistent interface
4. No code duplication for utilities (formatting, regions, validation)
5. Browser back button handled on confirmation page
6. JSON serialization moved to controller
7. All existing checkout flows continue working
8. Abandoned checkout tracking unaffected
9. All manual test cases pass
10. No regression in payment processing

---

## Documentation Updates Required

After completing the remediation phases, the following documentation must be updated:

### Checkout.md Updates

#### 1. Alpine.js Modular Architecture Section (Lines 196-393)

**Update Module Structure** (Lines 201-225):

Add new files to the structure diagram:

```
src/Merchello/wwwroot/js/checkout/
├── index.js
├── stores/
│   └── checkout.store.js       # EXPANDED: Now single source of truth
├── services/
│   ├── api.js
│   └── validation.js
├── utils/
│   ├── debounce.js
│   ├── formatters.js
│   ├── announcer.js
│   ├── regions.js              # NEW: Shared region loading
│   └── payment-errors.js       # NEW: Standardized error handling
├── components/
│   ├── single-page-checkout.js # REDUCED: ~400 lines, orchestration only
│   ├── checkout-address-form.js # NEW: Extracted address form
│   ├── checkout-shipping.js    # NEW: Extracted shipping selector
│   ├── checkout-payment.js     # NEW: Extracted payment selector
│   ├── contact-section.js
│   ├── address-form.js
│   ├── shipping-selector.js
│   ├── payment-selector.js
│   ├── order-summary.js
│   └── express-checkout.js
├── analytics.js
├── payment.js
├── confirmation.js             # NEW: Confirmation page logic
└── adapters/
    ├── adapter-interface.js    # NEW: Unified adapter registration
    ├── stripe-payment-adapter.js
    ├── stripe-express-adapter.js
    ├── braintree-payment-adapter.js
    ├── braintree-express-adapter.js
    ├── paypal-unified-adapter.js # NEW: Replaces separate adapters
    └── ...
```

#### 2. Shared State via Alpine.store Section (Lines 274-303)

**Replace current example** with expanded store responsibilities:

```javascript
// stores/checkout.store.js - SINGLE SOURCE OF TRUTH
Alpine.store('checkout', {
    // ===== FORM STATE (moved from component) =====
    form: {
        email: '',
        billing: { name: '', address1: '', ... },
        shipping: { name: '', address1: '', ... },
        sameAsBilling: false
    },

    // ===== SHIPPING STATE =====
    shippingGroups: [],
    shippingSelections: {},
    shippingLoading: false,
    shippingError: null,

    // ===== PAYMENT STATE =====
    paymentMethods: [],
    selectedPaymentMethod: null,
    paymentSession: null,

    // ===== BASKET STATE =====
    basket: { total: 0, shipping: 0, tax: 0, subtotal: 0, discount: 0 },
    currency: { code: 'GBP', symbol: '£' },

    // ===== UI STATE =====
    isSubmitting: false,
    errors: {},
    generalError: null,

    // ===== METHODS =====
    setFormField(path, value) { ... },
    updateShipping(groups, selections) { ... },
    setPaymentMethod(method) { ... },
    setError(field, message) { ... },
    clearError(field) { ... },
    formatCurrency(value) { ... }
});
```

**Add note:**

> **Single Source of Truth:** All checkout state lives in `Alpine.store('checkout')`. Components access state via `this.$store.checkout` and dispatch events for changes. The main `singlePageCheckout` component orchestrates flow but does not own state.

#### 3. Adapter Pattern Section (Lines 853-893)

**Update to document unified adapter interface:**

```javascript
// adapters/adapter-interface.js
/**
 * Unified Payment Adapter Interface
 *
 * All payment adapters (standard and express) use this single interface.
 * Adapters register once and declare their capabilities.
 */

/**
 * Register a payment adapter
 * @param {string} name - Unique adapter name (e.g., 'paypal', 'stripe')
 * @param {PaymentAdapter} adapter - Adapter implementation
 */
export function registerAdapter(name, adapter) {
    window.MerchelloPaymentAdapters[name] = adapter;

    // Auto-register for express if supported
    if (adapter.config.supportsExpress) {
        window.MerchelloExpressAdapters[name] = adapter;
    }
}

// Adapter must implement:
const adapter = {
    config: {
        name: 'Human-readable name',
        supportsStandard: true,  // Can handle /checkout/pay flow
        supportsExpress: true    // Can handle /checkout/express flow
    },

    async render(container, config, context) { },
    async submit(invoiceId, options) { },
    teardown() { },

    // Express-only (optional)
    extractCustomerData(providerResponse) { }
};
```

#### 4. File Structure Section (Lines 1466-1535)

Update to reflect new files and changes (see Module Structure above).

#### 5. Remove/Update Outdated Content

After remediation, these patterns no longer apply:
- Remove references to "triple state management" workaround
- Remove manual store synchronization examples
- Update adapter documentation to show unified pattern

### Architecture-Diagrams.md Updates

No changes required - the remediation aligns with existing architecture.

### CLAUDE.md Updates

No changes required - the remediation follows existing conventions.

---

## Appendix: Code Locations Quick Reference

### State Management
- Component data: `single-page-checkout.js:51-159`
- Alpine store: `checkout.store.js`
- Window globals: `single-page-checkout.js:267,576,612,635,700,711,736,830,977,986,999`

### Payment Flow
- Standard: `payment.js`, `single-page-checkout.js:603-740`
- Express: `express-checkout.js`
- PayPal Standard: `paypal-payment-adapter.js`
- PayPal Express: `paypal-express-adapter.js`

### Duplication Locations
- Region loading: `single-page-checkout.js:327-341`, `address-form.js:105-117`
- Currency formatting: `order-summary.js:38-42`, `checkout.store.js:237-239`, `single-page-checkout.js:203-205`
- Address validation: `single-page-checkout.js:838-860`

### Race Conditions
- Nested debounce: `single-page-checkout.js:482-487`
- Express re-render: `express-checkout.js:113-127`
- Request ID pattern (correct): `single-page-checkout.js:494,507-509,662,681-682`

### Confirmation Page
- Back button: NOT PRESENT (needs adding)
- JSON in view: `Confirmation.cshtml:317-325`
- Analytics script: `Confirmation.cshtml:296-328`
