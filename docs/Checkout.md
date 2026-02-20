# Checkout - Sprint Planning Document

## Overview

Build a **Shopify-style built-in checkout** for Merchello - a consistent, mobile-first checkout experience that users cannot customise (except limited branding via settings).

### Goals
- Standalone checkout isolated from user's site theme
- Single-page checkout with all sections visible (Contact, Billing, Shipping, Payment)
- Guest checkout (email-only, customer auto-created)
- Express checkout (Apple Pay, Google Pay, Link by Stripe, PayPal One Touch)
- Mobile-first, Shopify-quality UX

### Design Philosophy: Familiar Checkout Experience
The checkout **must look and feel like Shopify's checkout**. This is intentional - shoppers who buy online frequently are already familiar with Shopify's checkout flow (used by millions of stores). A familiar experience means:

- **Reduced friction** - Users know what to expect at each step
- **Trust** - Recognizable patterns signal a professional, secure checkout
- **Higher conversion** - Less cognitive load = fewer abandoned carts

Key Shopify patterns to follow:
- Clean, minimal layout with order summary sidebar
- Express checkout buttons (Apple Pay, Google Pay, Link, PayPal) prominently at top
- Breadcrumb progress indicator
- Collapsible sections showing completed step summaries
- Mobile: full-width forms, sticky bottom buttons, collapsible order summary

### Tech Stack
- **.NET MVC** with Razor views in RCL
- **Alpine.JS** (ES module via importmap) for frontend interactivity with modular component architecture
- **Tailwind CSS** for utility-first styling
- **Penguin UI** components where applicable (forms, buttons, modals, accordions)
- **ContentFinder** pattern for URL routing (like ProductContentFinder)
- **Existing `IPaymentProvider` architecture** for all payment processing
- **ES Modules** for JavaScript organization (no build step required)

### Payment Provider Architecture
The checkout is **provider-agnostic** - it works with any enabled payment provider via the existing `IPaymentProvider` interface. Each provider declares multiple **payment methods**, and the checkout UI adapts based on each method's `IntegrationType`:

**Provider â†’ Method Relationship:**
- **Provider** = Payment gateway (Stripe, Braintree) - holds API credentials
- **Method** = Checkout option (Cards, Apple Pay, PayPal) - customer-facing, individually enabled

| Integration Type | UI Behaviour | Example Methods |
|------------------|--------------|-----------------|
| **Redirect** | User redirected to external payment page | Stripe Checkout Cards |
| **HostedFields** | Inline card fields via provider's JS SDK | Braintree Cards, Stripe Elements |
| **Widget** | Provider's embedded widget | Apple Pay, Google Pay, PayPal |
| **DirectForm** | Simple form fields (backoffice only) | Manual payments |

**Sprint 4 delivers Braintree** as the first HostedFields provider, demonstrating how to:
- Declare multiple methods (Cards, PayPal, Apple Pay) from one provider
- Integrate a provider's JS SDK for inline card entry
- Handle Apple Pay / Google Pay via Widget integration type
- Maintain PCI compliance (card data never touches our servers)

Future providers (Stripe Elements, Adyen, Square) follow the same pattern. See [PaymentProviders-Architecture.md](PaymentProviders-Architecture.md) for details.

### Express Checkout Requirements

The checkout **must support** express checkout methods - these are payment methods with `IsExpressCheckout = true` that appear at the **start of checkout** (before address entry) and allow customers to complete payment in one tap.

| Express Method | Provider | Status | Description |
|----------------|----------|--------|-------------|
| **Apple Pay** | Braintree or Stripe | Required | One-tap payment for iOS/Safari users |
| **Google Pay** | Braintree or Stripe | Required | One-tap payment for Android/Chrome users |
| **Link by Stripe** | Stripe | Required | Stripe's one-click checkout (saves payment info across Stripe merchants) |
| **PayPal One Touch** | PayPal | Required | One-tap PayPal without leaving checkout |

**Express Checkout Flow:**

Express checkout **skips the checkout form entirely** and goes straight to confirmation:

```
1. Customer on cart page or first checkout step
2. Express checkout buttons rendered (Apple Pay, Google Pay, PayPal)
3. Customer clicks express button
4. Provider handles authentication (Apple Pay sheet, PayPal popup, etc.)
5. Provider returns: payment token + customer data (email, shipping address, billing)
6. Backend creates order immediately using provider-returned data
7. Customer redirected to confirmation page
```

**Key Points:**
- No form filling required - provider collects all customer data
- Customer data (email, addresses) comes from the payment provider
- Order created in single step from express checkout callback
- Processed via `ProcessExpressCheckoutAsync()` method

> **Note**: Express methods are declared by providers via `GetAvailablePaymentMethods()` with `IsExpressCheckout = true`. The checkout UI automatically shows buttons for enabled express methods.

### Key Architecture References
- Follow patterns in `@docs/Architecture-Diagrams.md`
- Reference `ProductContentFinder` for URL routing pattern
- Reference existing `IPaymentProvider` interface and `StripePaymentProvider` for provider patterns
- Use `ICheckoutService` for basket operations
- Use `IOrderGroupingStrategy` for multi-warehouse display
- Use `IPaymentService` for payment session creation and processing
- Use `IDiscountEngine` and `IDiscountService` for discount code validation and automatic discounts (see `@docs/Discounts.md`)

### Basket Integration (Entry Point)

The checkout automatically loads the customer's basket via cookie - **no explicit data passing required**.

**Data Flow:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  1. Add to Basket (any page)                                       â”‚
â”‚     â””â”€â”€ ICheckoutService.AddToBasket()                             â”‚
â”‚         â””â”€â”€ Creates basket in DB + sets cookie "merchello_basket"  â”‚
â”‚                                                                     â”‚
â”‚  2. Link to Checkout                                               â”‚
â”‚     â””â”€â”€ <a href="/checkout/information">Proceed to Checkout</a>   â”‚
â”‚         â””â”€â”€ No data passed - just a navigation link                â”‚
â”‚                                                                     â”‚
â”‚  3. Checkout loads basket automatically                            â”‚
â”‚     â””â”€â”€ CheckoutController calls ICheckoutService.GetBasket()      â”‚
â”‚         â””â”€â”€ Reads basket ID from cookie â†’ loads from database      â”‚
â”‚         â””â”€â”€ Creates CheckoutViewModel for Razor views              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**For Site Developers:**
To add a checkout button to your basket page, simply link to `/checkout/information`:

```html
<a href="/checkout/information" class="btn btn-primary">
    Proceed to Checkout
</a>
```

The checkout handles everything else - basket retrieval, session management, and all checkout steps.

**Models:**
| Model | Location | Purpose |
|-------|----------|---------|
| `Basket` | `Merchello.Core/Checkout/Models/` | Shopping cart with line items, totals |
| `CheckoutSession` | `Merchello.Core/Checkout/Models/` | Tracks addresses, shipping selections |
| `CheckoutViewModel` | `Merchello/Models/` | View model passed to Razor views |
| `CheckoutSettings` | `Merchello.Core/Checkout/Models/` | Branding and configuration |

### Page Rendering Pattern

The checkout uses Umbraco's route hijacking pattern but differs from product pages in a key way: **checkout views are shipped in the Merchello RCL and are not customizable**.

#### Checkout vs Product Page Rendering

| Aspect | Product Page | Checkout |
|--------|--------------|----------|
| Views location | User's site (`Views/Products/`) | Merchello RCL (shipped with NuGet) |
| Customizable | Yes - per product `ViewAlias` | No - fixed views |
| User control | Full template control | Limited branding via `CheckoutSettings` |

#### Rendering Flow

```
1. CheckoutContentFinder intercepts /checkout/* URLs
2. Creates virtual MerchelloCheckoutPage (implements IPublishedContent)
3. Sets content type alias to "MerchelloCheckout" for route hijacking
4. CheckoutController (extends RenderController) handles the request
5. Views served from RCL at Views/Checkout/ (embedded in NuGet package)
```

#### What Users CAN Customize (via `CheckoutSettings`)
- Logo, colors, fonts (branding)
- Header/banner image
- Company info (name, support email/phone)
- Terms/Privacy URLs
- Express checkout toggle
- Confirmation redirect URL

#### What Users CANNOT Customize
- View templates/layout
- Checkout flow/steps
- Form fields structure
- Order summary layout

This Shopify-style approach ensures a consistent, tested checkout experience across all Merchello stores while still allowing brand personalization.

#### RCL View Resolution
Views are embedded in the `Merchello` assembly as a Razor Class Library. The Razor view engine is configured to locate views in the RCL automatically. There is no override mechanism - this ensures consistent UX and reduces support complexity.

#### RCL Static Assets
Static files (JavaScript, CSS) in the RCL's `wwwroot/` folder are served via the `_content/{PackageId}/` path convention:

| Source Location | Runtime URL |
|-----------------|-------------|
| `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/payment.js` | `/App_Plugins/Merchello/js/checkout/payment.js` |
| `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/analytics.js` | `/App_Plugins/Merchello/js/checkout/analytics.js` |
| `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/adapters/*.js` | `/App_Plugins/Merchello/js/checkout/adapters/*.js` |

This is handled automatically by ASP.NET Core's StaticWebAssets middleware. When referencing Merchello's static files in views, always use the `/_content/Merchello/` prefix.

> **Note:** IDE warnings about "path not found" for `_content/` paths are false positives - these paths are resolved at runtime, not compile time.

### Alpine.js Modular Architecture

The checkout uses a modular Alpine.js architecture following enterprise patterns. This provides testability, maintainability, and clear separation of concerns.

#### Module Structure

```
src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/
â”œâ”€â”€ index.js                    # Entry point - registers all Alpine components
â”œâ”€â”€ stores/
â”‚   â””â”€â”€ checkout.store.js       # Alpine.store('checkout') for shared state
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ api.js                  # Centralized API calls with error handling
â”‚   â””â”€â”€ validation.js           # Form validation rules
â”œâ”€â”€ utils/
â”‚   â”œâ”€â”€ debounce.js             # Debounce utility
â”‚   â”œâ”€â”€ formatters.js           # Currency/date formatting
â”‚   â”œâ”€â”€ announcer.js            # Screen reader announcements
â”‚   â”œâ”€â”€ regions.js              # Region/state loading for address forms
â”‚   â”œâ”€â”€ security.js             # URL validation and safe redirects
â”‚   â”œâ”€â”€ shipping-calculator.js  # Shipping cost calculation
â”‚   â””â”€â”€ payment-errors.js       # Standardized payment error handling
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ single-page-checkout.js   # Main orchestrator (coordinates sub-components)
â”‚   â”œâ”€â”€ checkout-address-form.js  # Reusable address form (billing/shipping)
â”‚   â”œâ”€â”€ checkout-shipping.js      # Shipping method display and selection
â”‚   â”œâ”€â”€ checkout-payment.js       # Payment method display and selection
â”‚   â”œâ”€â”€ order-summary.js          # Order summary sidebar with discount handling
â”‚   â””â”€â”€ express-checkout.js       # Express checkout buttons (Apple Pay, Google Pay, PayPal)
â”œâ”€â”€ payment.js                  # Payment adapter system - dynamic adapter loading
â”œâ”€â”€ analytics.js                # Event emitter for GTM/analytics integration
â”œâ”€â”€ single-page-analytics.js    # Analytics helper for single-page checkout
â”œâ”€â”€ confirmation.js             # Back-button protection for confirmation page
â””â”€â”€ adapters/                   # Payment provider adapters
    â”œâ”€â”€ paypal-unified-adapter.js
    â”œâ”€â”€ stripe-payment-adapter.js
    â”œâ”€â”€ stripe-express-adapter.js
    â”œâ”€â”€ stripe-card-elements-adapter.js
    â”œâ”€â”€ braintree-payment-adapter.js
    â”œâ”€â”€ braintree-express-adapter.js
    â””â”€â”€ braintree-local-payment-adapter.js
```

#### Alpine.js Loading Strategy

Alpine is loaded as an ES module via importmap, giving us full control over initialization order:

```html
<!-- _Layout.cshtml -->
<script type="importmap">
{
    "imports": {
        "alpinejs": "https://cdn.jsdelivr.net/npm/alpinejs@3/dist/module.esm.js",
        "@alpinejs/collapse": "https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3/dist/module.esm.js"
    }
}
</script>
<script type="module" src="/App_Plugins/Merchello/js/checkout/index.js"></script>
```

#### Component Registration Pattern

Components are registered via `Alpine.data()` before `Alpine.start()` is called:

```javascript
// index.js - Entry point
import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';
import { initCheckoutStore } from './stores/checkout.store.js';
import { initSinglePageCheckout } from './components/single-page-checkout.js';

// Make Alpine globally available
window.Alpine = Alpine;

// Register plugins
Alpine.plugin(collapse);

// Initialize store and all components BEFORE Alpine processes the DOM
initCheckoutStore(initialData);
initSinglePageCheckout();
// ... other components

// Start Alpine - all components are now registered, no race conditions
Alpine.start();
```

This approach eliminates timing issues between ES modules and CDN scripts - we control exactly when Alpine starts.

#### Shared State via Alpine.store

Cross-component state is managed via `Alpine.store('checkout')`:

```javascript
// stores/checkout.store.js
Alpine.store('checkout', {
    // Basket state (updated by multiple components)
    basket: { total: 0, shipping: 0, tax: 0, subtotal: 0, discount: 0 },
    currency: { code: 'GBP', symbol: 'Â£' },

    // Shared form state
    email: '',
    shippingSameAsBilling: true,

    // Loading states
    isSubmitting: false,

    // Methods
    updateBasket(data) { Object.assign(this.basket, data); },
    announce(message) { /* screen reader */ }
});
```

Components access the store via `this.$store.checkout`:

```javascript
// In any component
get total() {
    return this.$store.checkout?.basket?.total ?? 0;
}
```

#### Centralized Services

**API Service** (`services/api.js`) - All fetch calls in one place:

```javascript
export const checkoutApi = {
    initialize: (data) => fetchJson(`${BASE_URL}/initialize`, { method: 'POST', body: JSON.stringify(data) }),
    saveAddresses: (data) => fetchJson(`${BASE_URL}/addresses`, { method: 'POST', body: JSON.stringify(data) }),
    saveShipping: (data) => fetchJson(`${BASE_URL}/shipping`, { method: 'POST', body: JSON.stringify(data) }),
    getRegions: (type, code) => fetchJson(`${BASE_URL}/${type}/regions/${code}`),
    applyDiscount: (code) => fetchJson(`${BASE_URL}/discount/apply`, { method: 'POST', body: JSON.stringify({ code }) }),
    // ... etc
};
```

**Validation Service** (`services/validation.js`) - Form validation rules:

```javascript
export function validateEmail(email) { /* ... */ }
export function validateAddress(fields, prefix) { /* ... */ }
export function validateField(fieldName, value) { /* ... */ }
```

#### JSDoc Typing

The codebase uses JavaScript with JSDoc types for IDE intellisense without requiring a compile step:

```javascript
// @ts-check
/**
 * @typedef {Object} BasketTotals
 * @property {number} total
 * @property {number} shipping
 * @property {number} tax
 */

/**
 * Initialize checkout and calculate shipping
 * @param {Object} data
 * @param {string} data.countryCode
 * @returns {Promise<{success: boolean, basket?: BasketTotals}>}
 */
export async function initialize(data) {
    return fetchJson(`${BASE_URL}/initialize`, { method: 'POST', body: JSON.stringify(data) });
}
```

#### Initial Data from Server

Server-side data is passed to Alpine components via a JSON script block:

```html
<!-- In SinglePage.cshtml -->
<script id="checkout-initial-data" type="application/json">
@Html.Raw(JsonSerializer.Serialize(new {
    basket = new { total = basket?.Total ?? 0, shipping = basket?.Shipping ?? 0 },
    currency = new { code = "GBP", symbol = "Â£" },
    email = basket?.BillingAddress?.Email ?? "",
    billing = new { /* ... */ },
    shipping = new { /* ... */ },
    shippingGroups = Model.ShippingGroups?.Select(/* ... */)
}))
</script>

<div x-data="singlePageCheckout">
```

The `index.js` entry point reads this data and passes it to the store:

```javascript
const initialDataElement = document.getElementById('checkout-initial-data');
let initialData = {};
if (initialDataElement) {
    initialData = JSON.parse(initialDataElement.textContent || '{}');
}
initCheckoutStore(initialData);
```

#### Benefits of This Architecture

| Aspect | Before (Inline) | After (Modular) |
|--------|-----------------|-----------------|
| **Testability** | Cannot unit test inline scripts | Pure functions can be tested |
| **Reusability** | Address form duplicated conceptually | `addressForm` component reused for billing/shipping |
| **Maintainability** | 910-line function | 7 focused modules (~100-150 lines each) |
| **State Management** | Custom DOM events | Alpine.store() pattern |
| **API Calls** | Scattered throughout | Centralized in `api.js` |
| **Validation** | Mixed with UI logic | Separate `validation.js` |
| **TypeScript Ready** | No | Can add `.d.ts` types |

### Basket Data for Checkout

When entering checkout, the following data is available from the basket system.

#### Basket Model
**Location:** `Merchello.Core/Checkout/Models/Basket.cs`

| Property | Type | Description |
|----------|------|-------------|
| `Id` | `Guid` | Basket identifier |
| `CustomerId` | `Guid?` | Customer ID if logged in |
| `LineItems` | `List<LineItem>` | All cart items (products, discounts, custom) |
| `Currency` | `string` | ISO 4217 currency code |
| `CurrencySymbol` | `string` | Display symbol (Â£, $, etc.) |
| `SubTotal` | `decimal` | Before discounts |
| `Discount` | `decimal` | Total discount amount |
| `AdjustedSubTotal` | `decimal` | After discounts, before tax |
| `Tax` | `decimal` | Total tax amount |
| `Shipping` | `decimal` | Shipping cost |
| `Total` | `decimal` | Final total |
| `BillingAddress` | `Address` | Customer billing address |
| `ShippingAddress` | `Address` | Customer shipping address |
| `AvailableShippingQuotes` | `List<ShippingRateQuote>` | Shipping options from providers |
| `Errors` | `List<BasketError>` | Validation/calculation errors |

#### LineItem Model
**Location:** `Merchello.Core/Accounting/Models/LineItem.cs`

| Property | Type | Description |
|----------|------|-------------|
| `Id` | `Guid` | Line item identifier |
| `ProductId` | `Guid?` | Product reference |
| `Sku` | `string` | Product SKU |
| `Name` | `string` | Display name |
| `LineItemType` | `LineItemType` | Product, Discount, or Custom |
| `Quantity` | `int` | Item quantity |
| `Amount` | `decimal` | Unit price |
| `OriginalAmount` | `decimal?` | Original price if modified |
| `IsTaxable` | `bool` | Whether tax applies |
| `TaxRate` | `decimal` | Tax rate percentage |
| `ExtendedData` | `Dictionary<string, object>` | Discount metadata, product refs |

#### CheckoutSession Model
**Location:** `Merchello.Core/Checkout/Models/CheckoutSession.cs`

Tracks checkout progress across steps:

| Property | Type | Description |
|----------|------|-------------|
| `BasketId` | `Guid` | Associated basket |
| `BillingAddress` | `Address` | Entered billing address |
| `ShippingAddress` | `Address` | Entered shipping address |
| `ShippingSameAsBilling` | `bool` | Address toggle state |
| `SelectedShippingOptions` | `Dictionary<Guid, Guid>` | Shipping selections per warehouse group |
| `CurrentStep` | `CheckoutStep` | Addresses, Shipping, Review, or Complete |

#### Address Model
**Location:** `Merchello.Core/Locality/Models/Address.cs`

| Property | Description |
|----------|-------------|
| `Name` | Contact name |
| `Company` | Company name |
| `AddressOne`, `AddressTwo` | Street address lines |
| `TownCity` | City/town |
| `CountyState` | State/province/county |
| `PostalCode` | Postal/ZIP code |
| `Country`, `CountryCode` | Country name and ISO code |
| `Email`, `Phone` | Contact details |

#### Data Flow

```
ICheckoutService.GetBasket()
        â†“
    Basket (line items, totals, addresses)
        â†“
    CheckoutSession (step state, selections)
        â†“
    CheckoutController prepares CheckoutViewModel
        â†“
    Razor Views in RCL render checkout UI
```

The `ICheckoutService.CalculateBasketAsync()` method recalculates totals, applies tax, and fetches shipping quotes based on the destination address.

### Checkout Initialization & Calculation Flow

Understanding this flow is critical for debugging checkout bugs, especially around shipping and totals.

#### Initialization Flow (`InitializeCheckoutAsync`)

When checkout loads, shipping is **estimated from quotes** (not passed from basket):

```
1. User enters checkout with basket (basket.Shipping = 0)
2. InitializeCheckoutAsync called with country/state
3. First CalculateBasketAsync - estimates shipping from quotes
4. GetOrderGroupsAsync - creates warehouse groups with shipping options
5. ShippingAutoSelector - auto-selects cheapest option per group
6. Second CalculateBasketAsync with ShippingAmountOverride = selected amount
7. RefreshAutomaticDiscountsAsync - checks free shipping thresholds, etc.
8. Basket saved to DB with correct totals
```

#### Shipping Selection Flow (`SaveShippingSelectionsAsync`)

When user changes shipping option:

```
1. User selects shipping option(s) in UI
2. POST /api/merchello/checkout/shipping with selections
3. SaveShippingSelectionsAsync called
4. Calculates totalShipping from selected options
5. CalculateBasketAsync with ShippingAmountOverride = totalShipping
6. RefreshAutomaticDiscountsAsync called (may affect free shipping)
7. Basket saved with updated totals
```

#### Key Service Methods

| Method | Purpose | Critical Notes |
|--------|---------|----------------|
| `CalculateBasketAsync` | Recalculates all totals | Pass `ShippingAmountOverride` when you have a known shipping amount |
| `RefreshAutomaticDiscountsAsync` | Checks/applies automatic discounts | **Internally calls `CalculateBasketAsync`** - must preserve shipping |
| `GetOrderGroupsAsync` | Gets warehouse groups with shipping options | Uses session's `SelectedShippingOptions` |

#### Shipping Amount Resolution (`CalculateBasketAsync`)

The shipping cost is determined in this priority order (CheckoutService.cs:302-309):

```csharp
var shippingCost = parameters.ShippingAmountOverride      // 1. Explicit override
    ?? (basket.Shipping > 0                               // 2. Existing basket value
        ? basket.Shipping
        : shippingQuotes.Sum(...));                       // 3. Cheapest from quotes
```

**Important**: `CalculateBasketAsync` always fetches fresh shipping quotes. If quotes fail or return different values, the fallback to `basket.Shipping` should preserve the value - but this can fail if `basket.Shipping` hasn't been set yet.

#### Common Bug Pattern: Lost Shipping

**The Bug**: Total = Subtotal + Tax (shipping not included)

**Root Cause**: `RefreshAutomaticDiscountsAsync` calls `CalculateBasketAsync` internally **without** `ShippingAmountOverride`. If the shipping quotes fail or return empty, and `basket.Shipping` check fails, shipping becomes 0.

**Prevention**: When calling `RefreshAutomaticDiscountsAsync`, ensure `basket.Shipping` is already set from a previous calculation. The internal `CalculateBasketAsync` should use the existing `basket.Shipping` as fallback.

**Fix Pattern**: If you're calling `CalculateBasketAsync` after shipping has been selected, always pass `ShippingAmountOverride = basket.Shipping` to explicitly preserve it:

```csharp
// SAFE: Preserves existing shipping
await CalculateBasketAsync(new CalculateBasketParameters
{
    Basket = basket,
    CountryCode = countryCode,
    ShippingAmountOverride = basket.Shipping
}, ct);
```

#### Session vs Basket Shipping Storage

Shipping is stored in two places:

| Storage | What's Stored | Persistence |
|---------|--------------|-------------|
| `CheckoutSession.SelectedShippingOptions` | GroupId â†’ ShippingOptionId mapping | HTTP Session (volatile) |
| `basket.Shipping` | Calculated decimal amount | Database |

The session holds the **selection** (which option was chosen), while the basket holds the **calculated amount**. When recalculating, the system can either:
1. Look up selections from session and recalculate shipping
2. Use existing `basket.Shipping` value

#### Debug Checklist

When debugging checkout total issues:

1. **Check `basket.Shipping`** - Is it 0 or the expected value?
2. **Check shipping quotes** - Are quotes being returned? Any errors?
3. **Trace `CalculateBasketAsync` calls** - Is `ShippingAmountOverride` passed?
4. **Check `RefreshAutomaticDiscountsAsync`** - Does it reset shipping?
5. **Check session** - Is `SelectedShippingOptions` populated?

### Item Availability Errors (Shipping Region Restrictions)

When a user changes their shipping destination (billing country with "shipping same as billing" checked), the system checks if products can ship to the new location via warehouse service regions.

#### Error Sources

Shipping errors come from two places and are unified in `basket.Errors`:

| Source | When | Error Type |
|--------|------|------------|
| `ShippingQuoteService.GetQuotesAsync()` | Missing product refs, unresolved products | Added directly to `basket.Errors` |
| `DefaultOrderGroupingStrategy.GroupItemsAsync()` | Warehouse can't serve region, insufficient stock | Added via `InitializeCheckoutAsync()` |

#### Error Flow

```
1. User changes billing country (with shipping same as billing)
2. Frontend calls: POST /api/merchello/checkout/initialize
3. Backend: InitializeCheckoutAsync()
   a. CalculateBasketAsync() â†’ adds quote errors to basket.Errors
   b. GetOrderGroupsAsync() â†’ returns grouping errors
   c. Grouping errors copied to basket.Errors (IsShippingError = true)
4. API returns: { success: true/false, basket: { errors: [...] } }
5. Frontend checks: data.basket.errors.filter(e => e.isShippingError)
6. UI displays: "Some items cannot be shipped to this location" with item list
```

#### Partial vs Complete Failure

| Scenario | `Success` | `Groups.Count` | Behavior |
|----------|-----------|----------------|----------|
| All items ship | `true` | > 0 | Normal checkout flow |
| Some items can't ship | `false` | > 0 | Shows shipping options + item errors |
| No items can ship | `false` | 0 | Shows only item errors, blocks checkout |

#### Frontend Error Display

The `SinglePage.cshtml` displays item-level errors in both success and failure responses:

```javascript
// Success case: partial failure (some items ship, some don't)
if (data.basket.errors && data.basket.errors.length > 0) {
    this.itemAvailabilityErrors = data.basket.errors.filter(e => e.isShippingError);
    this.allItemsShippable = this.itemAvailabilityErrors.length === 0;
}

// Failure case: complete failure (no items can ship)
// Same check applied - basket included in error response
```

#### Debug Checklist for Item Availability

1. **Check warehouse service regions** - Does the warehouse have `ServiceRegions` configured for the destination country/state?
2. **Check `basket.Errors`** - Are errors with `IsShippingError = true` being returned?
3. **Check `OrderGroupingResult.Errors`** - What's the failure reason from `SelectWarehouseForProduct()`?
4. **Check API response** - Is `basket` included in both success AND error responses?
5. **Check frontend** - Is `itemAvailabilityErrors` populated? Is `allItemsShippable` correct?

### Discount System Integration
The checkout integrates with the existing discount system (`@docs/Discounts.md`):

| Feature | Service | Description |
|---------|---------|-------------|
| Apply discount code | `ICheckoutService.ApplyDiscountCodeAsync()` | Validates code via `IDiscountEngine`, applies to basket |
| Remove discount | `ICheckoutService.RemovePromotionalDiscountAsync()` | Removes promotional discount line item |
| Automatic discounts | `ICheckoutService.RefreshAutomaticDiscountsAsync()` | Auto-applies eligible discounts (e.g., "10% off orders over Â£100") |
| Validation | `IDiscountEngine.ValidateCodeAsync()` | Checks eligibility, limits, date range, customer segments |

The order summary sidebar displays:
- Applied promotional discounts (with code if applicable)
- Automatic discounts that were applied
- Option to remove promotional discounts
- Discount input field for entering codes

---

## User Flow Summary

```
/checkout                â†’ Single-page checkout with all sections:
                           - Contact (email)
                           - Billing address
                           - Shipping address (or "same as billing")
                           - Shipping method selection
                           - Payment method & card entry
                           - Discount code input
        â†“
/checkout/confirmation   â†’ Order summary, optional redirect to Umbraco content
```

### Payment Callback Flow

When a payment redirect completes, the provider redirects back to Merchello via callback URLs:

| URL | View | Purpose |
|-----|------|---------|
| `/checkout/return?session_id=xxx` | `Return.cshtml` | Handles successful payment callbacks |
| `/checkout/cancel` | `Cancel.cshtml` | Handles user-cancelled payments |

The `CheckoutContentFinder` maps these URLs to the `PaymentReturn` and `PaymentCancelled` checkout steps respectively. The `Return.cshtml` view processes the payment result and redirects to confirmation on success.

---

# Sprint Phases

---

## Phase 1: Foundation

### Goal
Establish the core infrastructure - URL routing, controller, layout, and settings model. By the end, navigating to `/checkout` should render a basic page.

### Deliverables
- [x] `CheckoutContentFinder` - intercepts `/checkout/*` URLs
- [x] `MerchelloCheckoutPage` - virtual IPublishedContent for checkout steps
- [x] `CheckoutController` - route hijacking controller extending RenderController
- [x] `_Layout.cshtml` - minimal checkout layout (logo, no site nav)
- [x] `CheckoutSettings` nested options class registered via `Merchello:Checkout` section in `appsettings.json`
- [x] Alpine.JS included via CDN in layout
- [x] Tailwind CSS setup with build pipeline
- [x] Penguin UI components integrated (forms, buttons, modals)

### Key Files
| New | Location |
|-----|----------|
| CheckoutContentFinder | `src/Merchello/Routing/` |
| MerchelloCheckoutPage | `src/Merchello/Models/` |
| CheckoutController | `src/Merchello/Controllers/` |
| Checkout views | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` |
| CheckoutSettings | `src/Merchello.Core/Checkout/Models/` |

| Modified | Change |
|----------|--------|
| MerchelloComposer | Register ContentFinder |
| Startup.cs | Register `CheckoutSettings` via `Configure<CheckoutSettings>()` |

### Done When
- `/checkout` renders the checkout layout with logo
- `/checkout/information`, `/checkout/shipping`, `/checkout/payment` route correctly
- Settings (logo, colors) can be configured in appsettings.json

---

## Phase 2: Information Step

### Goal
Build the first checkout step - contact info, billing/shipping addresses, discount codes, and order summary sidebar.

### Deliverables
- [x] `Information.cshtml` view with Alpine.JS data binding
- [x] Address form component (country dropdown, address fields)
- [x] "Same as billing" toggle for shipping address
- [x] Discount code input with apply/remove functionality
- [x] Order summary sidebar (line items, subtotal, discount, tax, total)
- [x] API endpoints: apply discount, remove discount, get summary
- [x] Client + server-side validation
- [x] Country dropdown filtered by `MerchelloSettings.AllowedCountries`
- [x] Placeholder section for express checkout buttons (populated in Phase 9)

### Key Files
| New | Location |
|-----|----------|
| Information.cshtml | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` |
| _OrderSummary.cshtml | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` |
| _AddressForm.cshtml | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` |

### Key Services
- `ICheckoutService.ApplyDiscountCodeAsync()` - wraps `IDiscountEngine.ValidateCodeAsync()`
- `ICheckoutService.RemovePromotionalDiscountAsync()`
- `ICheckoutService.RefreshAutomaticDiscountsAsync()` - applies eligible automatic discounts
- `ILocationsService` for country list

> **Note**: Discount functionality is powered by the discount system in `@docs/Discounts.md`. The checkout consumes `IDiscountEngine` for code validation, eligibility checks, and automatic discount detection.

### Done When
- User can enter email and addresses
- Discount codes apply/remove with feedback
- Order summary updates in real-time
- Validation prevents progression without required fields
- "Continue to shipping" navigates to shipping step
- Express checkout placeholder area exists (buttons added in Phase 9)

---

## Phase 3: Shipping Step

### Goal
Display warehouse groups with shipping options. User selects shipping method per group.

### Deliverables
- [x] `Shipping.cshtml` view
- [x] Integrate with `IOrderGroupingStrategy` to get warehouse groups
- [x] Display items grouped by shipment
- [x] Shipping options per group (radio buttons)
- [x] API endpoint: select shipping option
- [x] Real-time total updates when shipping selected
- [x] Breadcrumb navigation (Information â†’ Shipping â†’ Payment)

### Key Files
| New | Location |
|-----|----------|
| Shipping.cshtml | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` |

### Key Services
- `IShippingQuoteService.GetQuotesAsync()` - gets available shipping options per warehouse group
- `IOrderGroupingStrategy.GroupItemsAsync()` - splits basket by warehouse/fulfillment location
- `ICheckoutService.CalculateBasketAsync()` - recalculates totals with selected shipping

> **Note**: Shipping quotes are provided by the shipping provider system in `@docs/ShippingProviders-Architecture.md`. The checkout displays available options from enabled providers.

> **Architecture Note**: Shipping groups are rendered inline in `Shipping.cshtml` (no separate partial). The `IOrderGroupingStrategy` powers the grouping logic - groups from `ICheckoutService.GetOrderGroupsAsync()` are passed to the view via `Model.ShippingGroups`.

### Done When
- Items display grouped by warehouse
- Shipping options show with prices and estimates
- Selecting shipping updates the order total
- "Continue to payment" navigates to payment step
- Can navigate back to edit information

---

## Phase 4: Payment Step UI âœ…

### Goal
Build the payment step UI that adapts to any payment method's integration type using a **dynamic adapter pattern**. The checkout has ZERO hard-coded provider logic.

### Architecture: Payment Adapters

The checkout uses a fully pluggable adapter pattern:

1. **Provider returns adapter URL** - Each provider's `CreatePaymentSessionAsync()` returns an `AdapterUrl`
2. **Checkout loads adapter dynamically** - `payment.js` loads the adapter script at runtime
3. **Adapter handles provider-specific logic** - SDK initialization, UI rendering, payment submission
4. **Checkout never knows about specific providers** - All provider logic is in adapter files

```
Provider.CreatePaymentSessionAsync()
    â†“
PaymentSessionResult { AdapterUrl, ProviderAlias, MethodAlias, JsSdkUrl, ... }
    â†“
payment.js loads adapter dynamically
    â†“
window.MerchelloPaymentAdapters[providerAlias].render(container, session)
    â†“
User interacts with provider UI
    â†“
adapter.submit() â†’ POST /api/merchello/checkout/process-payment
```

### Deliverables
- [x] `Payment.cshtml` view that renders based on method's `IntegrationType`
- [x] Payment method selector with provider-returned icons (`IconHtml`)
- [x] Handle Redirect flow (redirect to `session.redirectUrl`)
- [x] Handle HostedFields/Widget flow (load adapter from `session.adapterUrl`)
- [x] Error handling and retry logic
- [x] Order creation on successful payment
- [x] `payment.js` - dynamic adapter loading (no hard-coded providers)
- [x] Provider adapters in `wwwroot/App_Plugins/Merchello/js/checkout/adapters/`

### Key Files
| File | Location | Purpose |
|------|----------|---------|
| Payment.cshtml | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` | Payment step view |
| payment.js | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/` | Dynamic adapter loading |
| stripe-payment-adapter.js | `wwwroot/App_Plugins/Merchello/js/checkout/adapters/` | Stripe SDK integration |
| braintree-payment-adapter.js | `wwwroot/App_Plugins/Merchello/js/checkout/adapters/` | Braintree SDK integration |
| paypal-unified-adapter.js | `wwwroot/App_Plugins/Merchello/js/checkout/adapters/` | PayPal SDK integration (standard + express) |

### Key Services
- `IPaymentProviderManager.GetStandardPaymentMethodsAsync()` - list non-express payment methods
- `IPaymentProviderManager.GetExpressCheckoutMethodsAsync()` - list express checkout methods
- `IPaymentService.CreatePaymentSessionAsync()` - get provider session with adapter URL
- `IPaymentService.ProcessPaymentAsync()` - process payment result
- `IInvoiceService.CreateInvoiceFromBasketAsync()` - create invoice/orders

### Adapter Pattern

```javascript
// payment.js - no hard-coded providers
async function initializePaymentMethod(session, container) {
    switch (session.integrationType) {
        case 0: // Redirect - no adapter needed
            return { type: 'redirect', redirectUrl: session.redirectUrl };

        case 10: // HostedFields
        case 20: // Widget
            // Load adapter dynamically
            await loadScript(session.adapterUrl);
            const adapter = window.MerchelloPaymentAdapters[session.providerAlias];

            // Load provider SDK
            if (session.jsSdkUrl) await loadScript(session.jsSdkUrl);

            // Render payment UI
            await adapter.render(container, session, this);
            return { type: 'adapter', adapter };

        case 30: // DirectForm
            this.renderDirectForm(session.formFields, container);
            return { type: 'directForm' };
    }
}
```

### Adapter Interface

Every adapter must implement:

```javascript
window.MerchelloPaymentAdapters['provider-alias'] = {
    // Render payment UI into container
    async render(container, session, checkout) { },

    // Submit payment - returns { success, error?, transactionId? }
    async submit(invoiceId, options) { },

    // Cleanup when switching methods
    teardown() { }
};
```

### Done When
- [x] Payment step lists all enabled payment methods with provider icons
- [x] Redirect flow works (e.g., Stripe Checkout)
- [x] HostedFields/Widget adapters load and render dynamically
- [x] Payment failures show clear error messages
- [x] Successful payment creates invoice and redirects to confirmation
- [x] **No hard-coded provider logic in checkout** - fully pluggable

---

## Phase 5: Confirmation & Order Completion

### Goal
Show order confirmation with details. Handle optional redirect to Umbraco content.

### Deliverables
- [x] `Confirmation.cshtml` view
- [x] Order summary display (items, addresses, payment method)
- [x] Invoice number and confirmation message
- [x] "Continue shopping" button
- [x] Optional redirect to `CheckoutSettings.ConfirmationRedirectUrl`
- [x] Email confirmation trigger (via notification system)
- [x] Handle edge cases (expired session, already completed order)

### Key Files
| New | Location |
|-----|----------|
| Confirmation.cshtml | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` |

### Key Services
- `IInvoiceService.GetAsync()`
- Notification: `InvoiceCreatedNotification`

### Done When
- Confirmation page displays complete order details
- If redirect URL configured, user redirects with invoice number in query
- Email notification fires on order completion
- Direct URL access to `/checkout/confirmation/{id}` works for order lookup

---

## Phase 6: Braintree Provider

### Goal
Implement Braintree as a multi-method provider, demonstrating the Provider â†’ Methods architecture with inline card entry and Apple Pay / Google Pay as separate methods.

### Deliverables
- [x] `BraintreePaymentProvider` implementing `IPaymentProvider`
- [x] `GetAvailablePaymentMethods()` returning:
  - Cards (HostedFields, `IsExpressCheckout = false`)
  - PayPal (Widget, `IsExpressCheckout = true`)
  - Apple Pay (Widget, `IsExpressCheckout = true`)
  - Google Pay (Widget, `IsExpressCheckout = true`)
- [x] Configuration fields (merchant ID, public/private keys, environment)
- [x] Client token generation for Drop-in UI
- [x] `ProcessExpressCheckoutAsync()` for Apple Pay / Google Pay / PayPal
- [x] Webhook endpoint for async payment confirmation
- [x] Refund support
- [x] Sandbox testing

### Key Files
| New | Location |
|-----|----------|
| BraintreePaymentProvider.cs | `src/Merchello.Core/Payments/Providers/Braintree/` |

### Dependencies
- NuGet: `Braintree`

> **Note**: Follow the payment provider patterns in `@docs/PaymentProviders-Architecture.md` and `@docs/PaymentProviders-DevGuide.md`. Reference `StripePaymentProvider` as the existing implementation example.

### Done When
- Braintree appears as payment option when enabled
- Card payments process successfully in sandbox
- Apple Pay button appears on supported devices
- Google Pay button appears on supported devices
- Webhooks update payment status correctly
- Refunds can be processed from backoffice

---

## Phase 7: Stripe Provider Update

### Goal
Update the existing Stripe provider to add HostedFields (Stripe Elements) and express checkout methods (Link, Apple Pay, Google Pay) using the Provider â†’ Methods architecture.

### Deliverables
- [x] Update `StripePaymentProvider.GetAvailablePaymentMethods()` to include:
  - Cards - Redirect (existing Stripe Checkout)
  - Cards - Elements (HostedFields, new)
  - Apple Pay (Widget, `IsExpressCheckout = true`)
  - Google Pay (Widget, `IsExpressCheckout = true`)
  - Link by Stripe (Widget, `IsExpressCheckout = true`)
- [x] `ProcessExpressCheckoutAsync()` for Apple Pay / Google Pay / Link
- [x] Stripe Payment Element integration for HostedFields card entry
- [x] Update configuration for Payment Element client secret

### Key Files
| New/Modified | Location |
|--------------|----------|
| StripePaymentProvider.cs | `src/Merchello.Core/Payments/Providers/Stripe/` (modify) |

### Dependencies
- NuGet: `Stripe.net` (existing)

### Done When
- Stripe Elements renders inline card fields
- Link by Stripe button appears for eligible users
- Apple Pay / Google Pay buttons appear on supported devices
- Existing Stripe Checkout (Redirect) still works
- All methods can be individually enabled/disabled

---

## Phase 8: PayPal Provider âœ…

### Goal
Implement PayPal as a payment provider using the Provider â†’ Methods architecture.

### Deliverables
- [x] `PayPalPaymentProvider` implementing `IPaymentProvider`
- [x] `GetAvailablePaymentMethods()` returning:
  - PayPal (Widget, `IsExpressCheckout = true`)
  - Pay Later (Widget, `IsExpressCheckout = false`)
- [x] `ProcessExpressCheckoutAsync()` for PayPal One Touch
- [x] PayPal JS SDK integration for inline button
- [x] Webhook endpoint for payment confirmation
- [x] Refund support
- [x] Sandbox testing configuration

### Key Files
| New | Location |
|-----|----------|
| PayPalPaymentProvider.cs | `src/Merchello.Core/Payments/Providers/PayPal/` |

### Dependencies
- NuGet: `PayPalServerSDK` (v1.1.1+) - Official PayPal Server SDK

### Configuration
| Field | Description |
|-------|-------------|
| `clientId` | PayPal REST API Client ID |
| `clientSecret` | PayPal REST API Client Secret |
| `webhookId` | PayPal Webhook ID for signature verification |
| `brandName` | Optional brand name shown on PayPal checkout |

### Webhook Events
- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`

### Done When
- [x] PayPal appears as payment option when enabled
- [x] PayPal button renders via JS SDK
- [x] One Touch allows express PayPal payment
- [x] Webhooks update payment status correctly
- [x] Refunds can be processed from backoffice

---

## Phase 9: Express Checkout Integration âœ…

### Goal
Wire up express checkout buttons on the Information step, allowing customers to skip the checkout form entirely using Apple Pay, Google Pay, Link by Stripe, or PayPal One Touch.

### Deliverables
- [x] Express checkout section on Information step (before address form)
- [x] Dynamic button rendering based on enabled express methods
- [x] **Pluggable architecture** - buttons appear automatically when a provider supports express checkout
- [x] Apple Pay button (via Stripe Express Checkout Element)
- [x] Google Pay button (via Stripe Express Checkout Element)
- [x] Link by Stripe button (via Stripe Express Checkout Element)
- [x] Handle customer data return from express providers
- [x] `POST /api/merchello/checkout/express` endpoint to complete checkout
- [x] `GET /api/merchello/checkout/express-config` endpoint for SDK configuration
- [x] `POST /api/merchello/checkout/express-payment-intent` endpoint for PaymentIntent creation
- [x] Redirect to confirmation page after express payment
- [x] `IPaymentProviderManager.GetExpressCheckoutMethodsAsync()` - list express options
- [x] `IPaymentProvider.GetExpressCheckoutClientConfigAsync()` - provider SDK configuration

### Key Files
| New | Location |
|-----|----------|
| _ExpressCheckout.cshtml | `src/Merchello/App_Plugins/Merchello/Views/Checkout/` |
| stripe-express-adapter.js | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/adapters/` |
| braintree-express-adapter.js | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/adapters/` |
| paypal-unified-adapter.js | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/adapters/` |
| ExpressCheckoutClientConfig.cs | `src/Merchello.Core/Payments/Models/` |

### Pluggable Architecture
The express checkout system is **fully dynamic and pluggable**:

1. **Provider Declaration**: Providers declare express methods via `GetAvailablePaymentMethods()` with `IsExpressCheckout = true`
2. **SDK Configuration**: Providers implement `GetExpressCheckoutClientConfigAsync()` to return client-side SDK configuration including:
   - `SdkUrl`: URL to the provider's JavaScript SDK (e.g., Stripe.js, PayPal SDK)
   - `CustomAdapterUrl`: URL to a static JS file containing the adapter that handles button rendering and payment flow
   - `SdkConfig`: Provider-specific configuration (API keys, amounts, etc.)
3. **Dynamic Script Loading**: The `_ExpressCheckout.cshtml` partial:
   - Fetches `/api/merchello/checkout/express-config` to get available methods
   - Dynamically loads each method's adapter script via `adapterUrl`
   - Dynamically loads the provider SDK via `sdkUrl`
   - Calls the adapter's `render()` method to display the button
4. **Adapter Registration**: Adapters register with `window.MerchelloExpressAdapters` to handle SDK initialization and payment flow

When a new payment provider that supports express checkout is enabled with correct sort order, its buttons **automatically appear** without any code changes to the checkout views.

**Provider Implementation:**
```csharp
// In your payment provider's GetExpressCheckoutClientConfigAsync:
return new ExpressCheckoutClientConfig
{
    ProviderAlias = "myprovider",
    MethodAlias = "applepay",
    SdkUrl = "https://cdn.myprovider.com/sdk.js",
    CustomAdapterUrl = "/App_Plugins/Merchello/js/checkout/adapters/myprovider-express-adapter.js",
    SdkConfig = new Dictionary<string, object>
    {
        ["publicKey"] = _publicKey,
        ["amount"] = amount
    }
};
```

**Adapter Implementation** (static JS file):
```javascript
// /App_Plugins/Merchello/js/checkout/adapters/myprovider-express-adapter.js
(function() {
    window.MerchelloExpressAdapters = window.MerchelloExpressAdapters || {};
    window.MerchelloExpressAdapters['myprovider'] = {
        async render(container, method, config, checkout) {
            // Initialize provider SDK and render button
            // Handle payment authorization
            // Call checkout.processExpressCheckout() with token and customer data
        }
    };
})();
```

### Express Checkout Flow
Express checkout **skips the checkout form entirely** and goes straight to confirmation:

```
1. Customer on checkout Information step
2. GET /api/merchello/checkout/express-methods â†’ Render buttons
3. Customer clicks Apple Pay â†’ Wallet opens â†’ Payment authorized
4. Provider returns: payment token + customer data (email, shipping address)
5. POST /api/merchello/checkout/express with:
   - basketId, providerAlias, methodAlias
   - paymentToken
   - customerData (email, address from provider)
6. Backend: ProcessExpressCheckoutAsync() â†’ creates order + records payment
7. Redirect to confirmation page
```

### Express Checkout Endpoint
```typescript
// POST /api/merchello/checkout/express
const response = await fetch('/api/merchello/checkout/express', {
    method: 'POST',
    body: JSON.stringify({
        basketId: 'guid',
        providerAlias: 'stripe',
        methodAlias: 'applepay',
        paymentToken: 'tok_xxx',
        customerData: {
            email: 'customer@example.com',
            fullName: 'John Doe',
            shippingAddress: {
                line1: '123 Main St',
                city: 'London',
                postalCode: 'SW1A 1AA',
                countryCode: 'GB'
            }
        }
    })
});

// Response
{
    success: true,
    invoiceId: 'guid',
    invoiceNumber: 'INV-0001',
    redirectUrl: '/checkout/confirmation/guid'
}
```

### Done When
- [x] Express checkout buttons appear prominently at top of Information step
- [x] Clicking express button opens respective wallet/popup
- [x] Customer data (email, address) captured from express provider
- [x] Order created immediately without form entry
- [x] Customer redirected to confirmation page
- [x] Buttons only show when respective method is enabled
- [x] Works on mobile (iOS Safari for Apple Pay, etc.)
- [x] Fully pluggable - new providers automatically display buttons when enabled

---

## Phase 10: Analytics Integration

### Goal
Create an **analytics-agnostic event system** that emits standardized checkout events. Users hook into these events via their own script loaded through `CustomScriptUrl` setting.

### Architecture

The checkout is **provider-agnostic** - it doesn't hardcode GTM or Facebook Pixel. Instead:

```
analytics.js (in RCL)
    â†“
Emits standardized events to window.MerchelloCheckout
    â†“
User's custom script (loaded via CustomScriptUrl)
    â†“
Pushes to GTM, Facebook, Segment, Plausible, etc.
```

### Deliverables
- [x] `analytics.js` - Event emitter with built-in helper methods
- [x] `CustomScriptUrl` setting in `CheckoutSettings`
- [x] Example `checkout-analytics.js` in `Merchello.Site`
- [x] Documentation of all events and data payloads

### Key Files
| File | Location | Purpose |
|------|----------|---------|
| analytics.js | `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/` | Event emitter + helpers |
| checkout-analytics.js | `src/Merchello.Site/wwwroot/js/` | Example GTM + FB implementation |

### Event Emitter API

```javascript
// Subscribe to specific event
window.MerchelloCheckout.on('checkout:purchase', function(data) { });

// Subscribe to all events
window.MerchelloCheckout.onAny(function(eventName, data) { });

// Unsubscribe
window.MerchelloCheckout.off('checkout:purchase', callback);

// Built-in helper methods
window.MerchelloCheckout.mapToGA4Item(item);      // Transform for GA4
window.MerchelloCheckout.mapToMetaContents(items); // Transform for Meta Pixel
window.MerchelloCheckout.getContentIds(items);     // Get array of IDs
window.MerchelloCheckout.getTotalQuantity(items);  // Sum quantities
```

### Events & Data Payloads

| Event | Trigger | Maps to GA4 | Maps to Meta |
|-------|---------|-------------|--------------|
| `checkout:begin` | Enter checkout | `begin_checkout` | `InitiateCheckout` |
| `checkout:add_contact_info` | Valid email entered | `add_contact_info` | - |
| `checkout:add_shipping_info` | Shipping chosen | `add_shipping_info` | - |
| `checkout:add_payment_info` | Payment method selected | `add_payment_info` | `AddPaymentInfo` |
| `checkout:coupon_applied` | Discount applied | Custom | - |
| `checkout:coupon_removed` | Discount removed | Custom | - |
| `checkout:purchase` | Order complete | `purchase` | `Purchase` |
| `checkout:error` | Error occurred | Custom | - |

#### Event Data Structure

**checkout:begin / checkout:purchase** (full data):
```javascript
{
    transaction_id: 'INV-0001',  // purchase only
    currency: 'GBP',
    value: 159.98,
    tax: 26.66,                  // purchase only
    shipping: 9.99,              // purchase only
    coupon: 'SAVE10',
    item_count: 3,
    items: [
        {
            item_id: 'SKU-001',
            item_name: 'Product Name',
            item_brand: 'Brand',
            item_category: 'Category',
            item_variant: 'Blue / Large',
            price: 49.99,
            quantity: 2,
            discount: 5.00
        }
    ]
}
```

### Configuration

Add to `appsettings.json`:
```json
{
  "Merchello": {
    "Checkout": {
      "CustomScriptUrl": "/js/checkout-analytics.js"
    }
  }
}
```

### User Implementation

Users create their own analytics script that listens to events:

```javascript
// /js/checkout-analytics.js
(function() {
    var mc = window.MerchelloCheckout;

    // GTM / GA4
    mc.on('checkout:purchase', function(data) {
        dataLayer.push({ ecommerce: null });
        dataLayer.push({
            event: 'purchase',
            ecommerce: {
                transaction_id: data.transaction_id,
                currency: data.currency,
                value: data.value,
                items: data.items.map(mc.mapToGA4Item)
            }
        });
    });

    // Facebook Pixel
    if (typeof fbq === 'function') {
        mc.on('checkout:purchase', function(data) {
            fbq('track', 'Purchase', {
                currency: data.currency,
                value: data.value,
                contents: mc.mapToMetaContents(data.items),
                content_type: 'product'
            });
        });
    }
})();
```

### Done When
- [x] `analytics.js` emits all 8 events with full ecommerce data
- [x] Event emitter API available at `window.MerchelloCheckout`
- [x] `CustomScriptUrl` setting added to `CheckoutSettings`
- [x] `_Layout.cshtml` loads custom script when configured
- [x] `Merchello.Site` has working example with GTM + Facebook Pixel
- [x] Built-in helper methods for GA4 and Meta Pixel transformations

---

## Phase 11: Polish & Testing

### Goal
Final polish, testing, and mobile refinement.

### Deliverables
- [ ] Mobile UX refinement (touch targets, bottom-fixed buttons)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance testing (< 3s page load on 3G)
- [ ] End-to-end testing of all payment flows

### Done When
- Works smoothly on mobile (iOS Safari, Android Chrome)
- Passes accessibility checks
- No console errors, smooth animations
- All payment providers tested end-to-end
- Express checkout works on all supported devices

---

## Technical Reference

### Checkout Settings Model
```csharp
public class CheckoutSettings
{
    // === Header/Banner ===
    public string? HeaderBackgroundImageUrl { get; set; }  // Banner image (1000x400px recommended)
    public string? HeaderBackgroundColor { get; set; }     // Fallback if no image

    // === Logo ===
    public string? LogoUrl { get; set; }
    public LogoPosition LogoPosition { get; set; } = LogoPosition.Left;
    public int LogoMaxWidth { get; set; } = 200;

    // === Colors ===
    public string PrimaryColor { get; set; } = "#000000";
    public string AccentColor { get; set; } = "#0066FF";
    public string BackgroundColor { get; set; } = "#FFFFFF";
    public string TextColor { get; set; } = "#333333";
    public string ErrorColor { get; set; } = "#DC2626";

    // === Typography ===
    public string HeadingFontFamily { get; set; } = "system-ui";
    public string BodyFontFamily { get; set; } = "system-ui";

    // === Company Info ===
    public string? CompanyName { get; set; }
    public string? SupportPhone { get; set; }

    // === Behavior ===
    public bool ShowExpressCheckout { get; set; } = true;
    public bool RequirePhone { get; set; } = false;
    public string? ConfirmationRedirectUrl { get; set; }
    public string? TermsUrl { get; set; }
    public string? PrivacyUrl { get; set; }

    // === Custom Scripts ===
    public string? CustomScriptUrl { get; set; }  // URL to custom JS for analytics/tracking
}

public enum LogoPosition
{
    Left,
    Center,
    Right
}
```

### Settings Registration
Register `CheckoutSettings` in `Startup.cs` following the existing nested options pattern (like `CacheOptions`):

```csharp
// In Startup.cs AddMerch() method
builder.Services.Configure<CheckoutSettings>(builder.Config.GetSection("Merchello:Checkout"));
```

Inject via `IOptions<CheckoutSettings>` in services/controllers:
```csharp
public class CheckoutController(IOptions<CheckoutSettings> settings) : Controller
{
    private readonly CheckoutSettings _settings = settings.Value;
}
```

### appsettings.json Configuration

> Note: Checkout branding/order terms and policy URL content are now DB-backed and configured from the Merchello root workspace tabs (`Store`, `Policies`, `Checkout`, `UCP`).  
> Keep only non-migrated checkout appsettings values here.

```json
{
  "Merchello": {
    "StoreCurrencyCode": "GBP",
    "Checkout": {
      "SessionSlidingTimeoutMinutes": 30,
      "SessionAbsoluteTimeoutMinutes": 240,
      "LogSessionExpirations": true
    }
  }
}
```

### File Structure
```
src/Merchello/
â”œâ”€â”€ Routing/
â”‚   â””â”€â”€ CheckoutContentFinder.cs
â”œâ”€â”€ Models/
â”‚   â””â”€â”€ MerchelloCheckoutPage.cs
â”œâ”€â”€ Controllers/
â”‚   â””â”€â”€ CheckoutController.cs
â”œâ”€â”€ Views/Checkout/
â”‚   â”œâ”€â”€ _Layout.cshtml              # Checkout layout (logo, custom scripts, styles)
â”‚   â”œâ”€â”€ _ViewImports.cshtml         # Razor imports
â”‚   â”œâ”€â”€ _OrderSummary.cshtml        # Order summary sidebar partial
â”‚   â”œâ”€â”€ _AddressForm.cshtml         # Address form partial (billing/shipping)
â”‚   â”œâ”€â”€ _ExpressCheckout.cshtml     # Express checkout buttons partial
â”‚   â”œâ”€â”€ SinglePage.cshtml           # Main single-page checkout view
â”‚   â”œâ”€â”€ Confirmation.cshtml         # Order confirmation page
â”‚   â”œâ”€â”€ Return.cshtml               # Payment return/callback handler
â”‚   â””â”€â”€ Cancel.cshtml               # Payment cancellation handler
â”œâ”€â”€ Styles/
â”‚   â”œâ”€â”€ tailwind.config.js          # Tailwind configuration
â”‚   â””â”€â”€ checkout.css                # Tailwind input file (@tailwind directives)
â””â”€â”€ wwwroot/
    â”œâ”€â”€ css/checkout.css            # Generated Tailwind output - do not edit
    â””â”€â”€ js/checkout/
        â”œâ”€â”€ index.js                # Entry point - registers all Alpine components
        â”œâ”€â”€ stores/
        â”‚   â””â”€â”€ checkout.store.js   # Alpine.store('checkout') for shared state
        â”œâ”€â”€ services/
        â”‚   â”œâ”€â”€ api.js              # Centralized API calls with error handling
        â”‚   â””â”€â”€ validation.js       # Form validation rules
        â”œâ”€â”€ utils/
        â”‚   â”œâ”€â”€ debounce.js         # Debounce utility
        â”‚   â”œâ”€â”€ formatters.js       # Currency/date formatting
        â”‚   â”œâ”€â”€ announcer.js        # Screen reader announcements
        â”‚   â”œâ”€â”€ regions.js          # Region/state loading
        â”‚   â”œâ”€â”€ security.js         # URL validation and safe redirects
        â”‚   â”œâ”€â”€ shipping-calculator.js  # Shipping cost calculation
        â”‚   â””â”€â”€ payment-errors.js   # Standardized payment error handling
        â”œâ”€â”€ components/
        â”‚   â”œâ”€â”€ single-page-checkout.js   # Main orchestrator (coordinates sub-components)
        â”‚   â”œâ”€â”€ checkout-address-form.js  # Reusable address form (billing/shipping)
        â”‚   â”œâ”€â”€ checkout-shipping.js      # Shipping method display and selection
        â”‚   â”œâ”€â”€ checkout-payment.js       # Payment method display and selection
        â”‚   â”œâ”€â”€ order-summary.js          # Order summary with discount handling
        â”‚   â””â”€â”€ express-checkout.js       # Express checkout buttons
        â”œâ”€â”€ analytics.js            # Event emitter for GTM/analytics
        â”œâ”€â”€ payment.js              # Dynamic adapter loading - no hard-coded providers
        â”œâ”€â”€ single-page-analytics.js # Analytics helper for single-page checkout
        â”œâ”€â”€ confirmation.js         # Back-button protection for confirmation
        â””â”€â”€ adapters/               # Provider-specific adapters
            â”œâ”€â”€ paypal-unified-adapter.js
            â”œâ”€â”€ stripe-payment-adapter.js
            â”œâ”€â”€ stripe-express-adapter.js
            â”œâ”€â”€ stripe-card-elements-adapter.js
            â”œâ”€â”€ braintree-payment-adapter.js
            â”œâ”€â”€ braintree-express-adapter.js
            â””â”€â”€ braintree-local-payment-adapter.js

src/Merchello.Core/Checkout/Models/
â””â”€â”€ CheckoutSettings.cs

# Payment providers are built-in to Merchello.Core
# Each provider declares multiple methods via GetAvailablePaymentMethods()
src/Merchello.Core/Payments/Providers/
â”œâ”€â”€ Stripe/
â”‚   â””â”€â”€ StripePaymentProvider.cs      # Methods: Cards (Redirect), Apple Pay, Google Pay
â”œâ”€â”€ Braintree/
â”‚   â””â”€â”€ BraintreePaymentProvider.cs   # Methods: Cards (HostedFields), PayPal, Apple Pay, Google Pay
â”œâ”€â”€ PayPal/
â”‚   â””â”€â”€ PayPalPaymentProvider.cs      # Methods: PayPal (Widget), Pay Later
â””â”€â”€ BuiltIn/
    â””â”€â”€ ManualPaymentProvider.cs      # Manual/offline payments
```

### Dependencies
| Package | Purpose | Used By | Phase |
|---------|---------|---------|-------|
| Alpine.js (CDN) | Frontend reactivity | Checkout | 1 |
| Tailwind CSS | Utility-first CSS | Checkout | 1 |
| Penguin UI | Alpine.js + Tailwind components | Checkout | 1 |
| Braintree | Braintree SDK | BraintreePaymentProvider | 6 |
| Stripe.net | Stripe SDK | StripePaymentProvider | 7 |
| PayPalServerSDK | PayPal Server SDK (v1.1.1+) | PayPalPaymentProvider | 8 |

Note: Each payment provider has its own NuGet dependency. The checkout itself only depends on `IPaymentProvider` interface.

### Tailwind CSS Build
The checkout uses Tailwind CSS for utility-first styling, with Penguin UI components for common UI patterns:

```
src/Merchello/Styles/checkout.css -> wwwroot/App_Plugins/Merchello/css/checkout.css
```

Add to `.csproj`:
```xml
<Target Name="CompileTailwind" BeforeTargets="Build">
  <Exec Command="npx tailwindcss -i Styles/checkout.css -o wwwroot/App_Plugins/Merchello/css/checkout.css --minify" />
</Target>
```

### Penguin UI Components
Use [Penguin UI](https://www.penguinui.com/) components for consistent, accessible UI:

| Component | Usage in Checkout |
|-----------|-------------------|
| Form inputs | Email, address fields with validation states |
| Buttons | Primary/secondary actions, loading states |
| Accordion | Collapsible order summary (mobile), completed step summaries |
| Radio groups | Shipping options, payment method selection |
| Alerts | Error messages, discount code feedback |
| Modal | Address book picker, shipping details |

Copy component markup from Penguin UI and adapt to Razor views. Components use Alpine.js for interactivity.

---

## Security Checklist

- [x] PCI Compliance - card data never touches our servers (HostedFields providers handle this)
- [x] CSRF protection - JSON APIs use SameSite cookies; checkout uses fetch with JSON bodies, not form POSTs
- [x] Rate limiting on discount code attempts - implemented in `ICheckoutService.ApplyDiscountCodeAsync()` (5 attempts/minute per basket)
- [x] Server-side validation on all inputs - validated in controllers and services
- [ ] HTTPS required for checkout pages - infrastructure configuration
- [x] Session security - basket tied to session/cookie
- [x] Payment provider credentials stored securely (encrypted in DB, never exposed to frontend)

---

## Success Criteria

| Criteria | Measure |
|----------|---------|
| Functional | Complete checkout flow cart â†’ confirmation |
| Mobile | Fully responsive, touch-optimized |
| Payments | Card payments via Braintree + Stripe working |
| Express Checkout | Apple Pay, Google Pay, Link by Stripe, PayPal One Touch all working |
| Discounts | Promotional codes apply correctly |
| Multi-warehouse | Split shipments display clearly |
| Analytics | All GTM events firing |
| Performance | < 3s page load on 3G |
| Accessibility | WCAG 2.1 AA compliant |

---

## Related Documentation

| Document | Relevance to Checkout |
|----------|----------------------|
| `@docs/Architecture-Diagrams.md` | Centralized service patterns, factory patterns |
| `@docs/PaymentProviders-Architecture.md` | `IPaymentProvider` interface, integration types |
| `@docs/PaymentProviders-DevGuide.md` | How to implement Braintree provider (Phase 4) |
| `@docs/ShippingProviders-Architecture.md` | Shipping quote system, provider patterns |
| `@docs/Discounts.md` | `IDiscountEngine`, discount validation, automatic discounts |
| `@docs/Customer-Segments.md` | Customer segments used for discount eligibility |
| `@docs/Developer-Guidelines.md` | Coding standards, service patterns |
| `@docs/Typescript.md` | Frontend TypeScript patterns (if migrating from Alpine.JS later) |


