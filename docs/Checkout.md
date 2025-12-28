# Checkout - Sprint Planning Document

## Overview

Build a **Shopify-style built-in checkout** for Merchello - a consistent, mobile-first checkout experience that users cannot customise (except limited branding via settings).

### Goals
- Standalone checkout isolated from user's site theme
- Multi-step flow: Information → Shipping → Payment → Confirmation
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
- **Alpine.JS** (CDN) for frontend interactivity
- **Tailwind CSS** for utility-first styling
- **Penguin UI** components where applicable (forms, buttons, modals, accordions)
- **ContentFinder** pattern for URL routing (like ProductContentFinder)
- **Existing `IPaymentProvider` architecture** for all payment processing

### Payment Provider Architecture
The checkout is **provider-agnostic** - it works with any enabled payment provider via the existing `IPaymentProvider` interface. Each provider declares multiple **payment methods**, and the checkout UI adapts based on each method's `IntegrationType`:

**Provider → Method Relationship:**
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
| `CurrencySymbol` | `string` | Display symbol (£, $, etc.) |
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
        ↓
    Basket (line items, totals, addresses)
        ↓
    CheckoutSession (step state, selections)
        ↓
    CheckoutController prepares CheckoutViewModel
        ↓
    Razor Views in RCL render checkout UI
```

The `ICheckoutService.CalculateBasketAsync()` method recalculates totals, applies tax, and fetches shipping quotes based on the destination address.

### Discount System Integration
The checkout integrates with the existing discount system (`@docs/Discounts.md`):

| Feature | Service | Description |
|---------|---------|-------------|
| Apply discount code | `ICheckoutService.ApplyDiscountCodeAsync()` | Validates code via `IDiscountEngine`, applies to basket |
| Remove discount | `ICheckoutService.RemovePromotionalDiscountAsync()` | Removes promotional discount line item |
| Automatic discounts | `ICheckoutService.RefreshAutomaticDiscountsAsync()` | Auto-applies eligible discounts (e.g., "10% off orders over £100") |
| Validation | `IDiscountEngine.ValidateCodeAsync()` | Checks eligibility, limits, date range, customer segments |

The order summary sidebar displays:
- Applied promotional discounts (with code if applicable)
- Automatic discounts that were applied
- Option to remove promotional discounts
- Discount input field for entering codes

---

## User Flow Summary

```
/checkout/information    → Email, billing/shipping address, discount code
        ↓
/checkout/shipping       → Select shipping per warehouse group
        ↓
/checkout/payment        → Select payment provider, card entry or express checkout
        ↓
/checkout/confirmation   → Order summary, optional redirect to Umbraco content
```

---

# Sprint Phases

---

## Phase 1: Foundation

### Goal
Establish the core infrastructure - URL routing, controller, layout, and settings model. By the end, navigating to `/checkout` should render a basic page.

### Deliverables
- [ ] `CheckoutContentFinder` - intercepts `/checkout/*` URLs
- [ ] `MerchelloCheckoutPage` - virtual IPublishedContent for checkout steps
- [ ] `CheckoutController` - route hijacking controller extending RenderController
- [ ] `_Layout.cshtml` - minimal checkout layout (logo, no site nav)
- [ ] `CheckoutSettings` nested options class registered via `Merchello:Checkout` section in `appsettings.json`
- [ ] Alpine.JS included via CDN in layout
- [ ] Tailwind CSS setup with build pipeline
- [ ] Penguin UI components integrated (forms, buttons, modals)

### Key Files
| New | Location |
|-----|----------|
| CheckoutContentFinder | `src/Merchello/Routing/` |
| MerchelloCheckoutPage | `src/Merchello/Models/` |
| CheckoutController | `src/Merchello/Controllers/` |
| Checkout views | `src/Merchello/Views/Checkout/` |
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
- [ ] `Information.cshtml` view with Alpine.JS data binding
- [ ] Address form component (country dropdown, address fields)
- [ ] "Same as billing" toggle for shipping address
- [ ] Discount code input with apply/remove functionality
- [ ] Order summary sidebar (line items, subtotal, discount, tax, total)
- [ ] API endpoints: apply discount, remove discount, get summary
- [ ] Client + server-side validation
- [ ] Country dropdown filtered by `MerchelloSettings.AllowedCountries`
- [ ] Placeholder section for express checkout buttons (populated in Phase 9)

### Key Files
| New | Location |
|-----|----------|
| Information.cshtml | `src/Merchello/Views/Checkout/` |
| _OrderSummary.cshtml | `src/Merchello/Views/Checkout/` |
| _AddressForm.cshtml | `src/Merchello/Views/Checkout/` |

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
- [ ] `Shipping.cshtml` view
- [ ] Integrate with `IOrderGroupingStrategy` to get warehouse groups
- [ ] Display items grouped by shipment
- [ ] Shipping options per group (radio buttons)
- [ ] API endpoint: select shipping option
- [ ] Real-time total updates when shipping selected
- [ ] Breadcrumb navigation (Information → Shipping → Payment)

### Key Files
| New | Location |
|-----|----------|
| Shipping.cshtml | `src/Merchello/Views/Checkout/` |
| _ShipmentGroup.cshtml | `src/Merchello/Views/Checkout/` |

### Key Services
- `IShippingQuoteService.GetQuotesAsync()` - gets available shipping options per warehouse group
- `IOrderGroupingStrategy.GroupItemsAsync()` - splits basket by warehouse/fulfillment location
- `ICheckoutService.CalculateBasketAsync()` - recalculates totals with selected shipping

> **Note**: Shipping quotes are provided by the shipping provider system in `@docs/ShippingProviders-Architecture.md`. The checkout displays available options from enabled providers.

### Done When
- Items display grouped by warehouse
- Shipping options show with prices and estimates
- Selecting shipping updates the order total
- "Continue to payment" navigates to payment step
- Can navigate back to edit information

---

## Phase 4: Payment Step UI

### Goal
Build the payment step UI that adapts to any payment method's integration type. This phase focuses on the UI only - provider implementations come in later phases.

### Deliverables
- [ ] `Payment.cshtml` view that renders based on method's `IntegrationType`
- [ ] Payment method selector (list enabled methods from all providers)
- [ ] Handle Redirect flow (redirect to provider, handle return)
- [ ] Handle HostedFields flow (load provider SDK, render inline fields)
- [ ] Handle Widget flow (provider's embedded widget)
- [ ] Error handling and retry logic
- [ ] Order creation on successful payment
- [ ] `payment.js` - dynamic provider SDK loading

### Key Files
| New | Location |
|-----|----------|
| Payment.cshtml | `src/Merchello/Views/Checkout/` |
| payment.js | `src/Merchello/wwwroot/js/checkout/` |

### Key Services
- `IPaymentProviderManager.GetStandardPaymentMethodsAsync()` - list non-express payment methods
- `IPaymentProviderManager.GetExpressCheckoutMethodsAsync()` - list express checkout methods
- `IPaymentService.CreatePaymentSessionAsync()` - get provider session data (requires providerAlias + methodAlias)
- `IPaymentService.ProcessPaymentAsync()` - process payment result
- `IInvoiceService.CreateInvoiceFromBasketAsync()` - create invoice/orders

### Key Patterns
The checkout must handle different integration types dynamically:

```javascript
// Payment step adapts to method's integration type
async function initiatePayment(invoiceId, providerAlias, methodAlias) {
    const session = await createPaymentSession(invoiceId, providerAlias, methodAlias);

    switch (session.integrationType) {
        case 0: // Redirect
            window.location.href = session.redirectUrl;
            break;
        case 10: // HostedFields
            await loadProviderSdk(session.javaScriptSdkUrl, session.clientToken);
            break;
        case 20: // Widget
            await setupWidget(session);
            break;
        case 30: // DirectForm
            renderForm(session.formFields);
            break;
    }
}
```

### Done When
- Payment step lists all enabled payment methods (grouped by provider)
- Existing Stripe Cards (Redirect) still works through new UI
- UI correctly adapts to different `IntegrationType` values per method
- Payment failures show clear error messages
- Successful payment creates invoice and redirects to confirmation

---

## Phase 5: Confirmation & Order Completion

### Goal
Show order confirmation with details. Handle optional redirect to Umbraco content.

### Deliverables
- [ ] `Confirmation.cshtml` view
- [ ] Order summary display (items, addresses, payment method)
- [ ] Invoice number and confirmation message
- [ ] "Continue shopping" button
- [ ] Optional redirect to `CheckoutSettings.ConfirmationRedirectUrl`
- [ ] Email confirmation trigger (via notification system)
- [ ] Handle edge cases (expired session, already completed order)

### Key Files
| New | Location |
|-----|----------|
| Confirmation.cshtml | `src/Merchello/Views/Checkout/` |

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
Implement Braintree as a multi-method provider, demonstrating the Provider → Methods architecture with inline card entry and Apple Pay / Google Pay as separate methods.

### Deliverables
- [ ] `BraintreePaymentProvider` implementing `IPaymentProvider`
- [ ] `GetAvailablePaymentMethods()` returning:
  - Cards (HostedFields, `IsExpressCheckout = false`)
  - PayPal (Widget, `IsExpressCheckout = true`)
  - Apple Pay (Widget, `IsExpressCheckout = true`)
  - Google Pay (Widget, `IsExpressCheckout = true`)
- [ ] Configuration fields (merchant ID, public/private keys, environment)
- [ ] Client token generation for Drop-in UI
- [ ] `ProcessExpressCheckoutAsync()` for Apple Pay / Google Pay / PayPal
- [ ] Webhook endpoint for async payment confirmation
- [ ] Refund support
- [ ] Sandbox testing

### Key Files
| New | Location |
|-----|----------|
| BraintreePaymentProvider.cs | `src/Merchello.PaymentProviders/Braintree/` |
| BraintreeSettings.cs | `src/Merchello.PaymentProviders/Braintree/` |
| BraintreeWebhookController.cs | `src/Merchello.PaymentProviders/Braintree/` |

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
Update the existing Stripe provider to add HostedFields (Stripe Elements) and express checkout methods (Link, Apple Pay, Google Pay) using the Provider → Methods architecture.

### Deliverables
- [ ] Update `StripePaymentProvider.GetAvailablePaymentMethods()` to include:
  - Cards - Redirect (existing Stripe Checkout)
  - Cards - Elements (HostedFields, new)
  - Apple Pay (Widget, `IsExpressCheckout = true`)
  - Google Pay (Widget, `IsExpressCheckout = true`)
  - Link by Stripe (Widget, `IsExpressCheckout = true`)
- [ ] `ProcessExpressCheckoutAsync()` for Apple Pay / Google Pay / Link
- [ ] Stripe Payment Element integration for HostedFields card entry
- [ ] Update configuration for Payment Element client secret

### Key Files
| New/Modified | Location |
|--------------|----------|
| StripePaymentProvider.cs | `src/Merchello.PaymentProviders/Stripe/` (modify) |

### Dependencies
- NuGet: `Stripe.net` (existing)

### Done When
- Stripe Elements renders inline card fields
- Link by Stripe button appears for eligible users
- Apple Pay / Google Pay buttons appear on supported devices
- Existing Stripe Checkout (Redirect) still works
- All methods can be individually enabled/disabled

---

## Phase 8: PayPal Provider

### Goal
Implement PayPal as a payment provider using the Provider → Methods architecture.

### Deliverables
- [ ] `PayPalPaymentProvider` implementing `IPaymentProvider`
- [ ] `GetAvailablePaymentMethods()` returning:
  - PayPal (Widget, `IsExpressCheckout = true`)
  - Pay Later (Widget, `IsExpressCheckout = false`)
- [ ] `ProcessExpressCheckoutAsync()` for PayPal One Touch
- [ ] PayPal JS SDK integration for inline button
- [ ] Webhook endpoint for payment confirmation
- [ ] Refund support
- [ ] Sandbox testing

### Key Files
| New | Location |
|-----|----------|
| PayPalPaymentProvider.cs | `src/Merchello.PaymentProviders/PayPal/` |
| PayPalSettings.cs | `src/Merchello.PaymentProviders/PayPal/` |
| PayPalWebhookController.cs | `src/Merchello.PaymentProviders/PayPal/` |

### Dependencies
- NuGet: `PayPalCheckoutSdk`

### Done When
- PayPal appears as payment option when enabled
- PayPal button renders via JS SDK
- One Touch allows express PayPal payment
- Webhooks update payment status correctly
- Refunds can be processed from backoffice

---

## Phase 9: Express Checkout Integration

### Goal
Wire up express checkout buttons on the Information step, allowing customers to skip the checkout form entirely using Apple Pay, Google Pay, Link by Stripe, or PayPal One Touch.

### Deliverables
- [ ] Express checkout section on Information step (before address form)
- [ ] Dynamic button rendering based on enabled express methods
- [ ] Apple Pay button (via Braintree or Stripe - whichever is enabled)
- [ ] Google Pay button (via Braintree or Stripe - whichever is enabled)
- [ ] Link by Stripe button (when Stripe enabled)
- [ ] PayPal One Touch button (when PayPal enabled)
- [ ] Handle customer data return from express providers
- [ ] Call `POST /api/merchello/checkout/express` to complete checkout
- [ ] Redirect to confirmation page after express payment
- [ ] `IPaymentProviderManager.GetExpressCheckoutMethodsAsync()` - list express options

### Key Files
| New | Location |
|-----|----------|
| _ExpressCheckout.cshtml | `src/Merchello/Views/Checkout/` |
| express-checkout.js | `src/Merchello/wwwroot/js/checkout/` |

### Express Checkout Flow
Express checkout **skips the checkout form entirely** and goes straight to confirmation:

```
1. Customer on checkout Information step
2. GET /api/merchello/checkout/express-methods → Render buttons
3. Customer clicks Apple Pay → Wallet opens → Payment authorized
4. Provider returns: payment token + customer data (email, shipping address)
5. POST /api/merchello/checkout/express with:
   - basketId, providerAlias, methodAlias
   - paymentToken
   - customerData (email, address from provider)
6. Backend: ProcessExpressCheckoutAsync() → creates order + records payment
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
- Express checkout buttons appear prominently at top of Information step
- Clicking express button opens respective wallet/popup
- Customer data (email, address) captured from express provider
- Order created immediately without form entry
- Customer redirected to confirmation page
- Buttons only show when respective method is enabled
- Works on mobile (iOS Safari for Apple Pay, etc.)

---

## Phase 10: Analytics Integration

### Goal
Add GTM dataLayer events and Facebook Pixel tracking for marketing attribution.

### Deliverables
- [ ] `analytics.js` module with checkout events
- [ ] `begin_checkout` event on checkout entry
- [ ] `add_shipping_info` event when shipping selected
- [ ] `add_payment_info` event when payment initiated
- [ ] `purchase` event on successful order
- [ ] Facebook Pixel events (InitiateCheckout, AddPaymentInfo, Purchase)
- [ ] GA4 ecommerce item mapping

### Key Files
| New | Location |
|-----|----------|
| analytics.js | `src/Merchello/wwwroot/js/checkout/` |

### Events (GA4 Standard)
| Event | Trigger |
|-------|---------|
| begin_checkout | Enter checkout |
| add_shipping_info | Select shipping method |
| add_payment_info | Enter payment step |
| purchase | Order complete |

### Done When
- All events fire at correct points in flow
- Events contain correct ecommerce data (items, value, currency)
- Events visible in GTM debug mode
- Facebook Pixel events fire correctly

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
    public string? SupportEmail { get; set; }
    public string? SupportPhone { get; set; }

    // === Behavior ===
    public bool ShowExpressCheckout { get; set; } = true;
    public bool RequirePhone { get; set; } = false;
    public string? ConfirmationRedirectUrl { get; set; }
    public string? TermsUrl { get; set; }
    public string? PrivacyUrl { get; set; }
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
```json
{
  "Merchello": {
    "StoreCurrencyCode": "GBP",
    "Checkout": {
      "HeaderBackgroundImageUrl": "/images/checkout-banner.jpg",
      "HeaderBackgroundColor": "#1a1a1a",
      "LogoUrl": "/images/logo.png",
      "LogoPosition": "Left",
      "LogoMaxWidth": 200,
      "PrimaryColor": "#000000",
      "AccentColor": "#0066FF",
      "BackgroundColor": "#FFFFFF",
      "TextColor": "#333333",
      "ErrorColor": "#DC2626",
      "HeadingFontFamily": "Inter, system-ui, sans-serif",
      "BodyFontFamily": "Inter, system-ui, sans-serif",
      "CompanyName": "My Store",
      "SupportEmail": "support@example.com",
      "SupportPhone": "+44 123 456 7890",
      "ShowExpressCheckout": true,
      "RequirePhone": false,
      "ConfirmationRedirectUrl": "/order-complete",
      "TermsUrl": "/terms",
      "PrivacyUrl": "/privacy"
    }
  }
}
```

### File Structure
```
src/Merchello/
├── Routing/
│   └── CheckoutContentFinder.cs
├── Models/
│   └── MerchelloCheckoutPage.cs
├── Controllers/
│   └── CheckoutController.cs
├── Views/Checkout/
│   ├── _Layout.cshtml
│   ├── _OrderSummary.cshtml
│   ├── _AddressForm.cshtml
│   ├── _ShipmentGroup.cshtml
│   ├── _ExpressCheckout.cshtml     # Express checkout buttons (Phase 9)
│   ├── Information.cshtml
│   ├── Shipping.cshtml
│   ├── Payment.cshtml              # Method-agnostic, adapts to method IntegrationType
│   └── Confirmation.cshtml
├── Styles/
│   ├── tailwind.config.js         # Tailwind configuration
│   └── checkout.css               # Tailwind input file (@tailwind directives)
└── wwwroot/
    ├── css/checkout.css           # Generated Tailwind output - do not edit
    └── js/checkout/
        ├── checkout.js
        ├── analytics.js            # Phase 10
        ├── payment.js              # Handles all method integration types
        └── express-checkout.js     # Phase 9

src/Merchello.Core/Checkout/Models/
└── CheckoutSettings.cs

# Payment providers are separate - checkout works with ANY enabled method
# Each provider declares multiple methods via GetAvailablePaymentMethods()
src/Merchello.PaymentProviders/
├── Stripe/
│   ├── StripePaymentProvider.cs      # Methods: Cards (Redirect), Apple Pay, Google Pay
│   └── StripeWebhookController.cs
├── Braintree/
│   ├── BraintreePaymentProvider.cs   # Methods: Cards (HostedFields), PayPal, Apple Pay, Google Pay
│   ├── BraintreeSettings.cs
│   └── BraintreeWebhookController.cs
└── PayPal/
    ├── PayPalPaymentProvider.cs      # Methods: PayPal (Widget), Pay Later
    ├── PayPalSettings.cs
    └── PayPalWebhookController.cs
```

### Dependencies
| Package | Purpose | Used By | Phase |
|---------|---------|---------|-------|
| Alpine.js (CDN) | Frontend reactivity | Checkout | 1 |
| Tailwind CSS | Utility-first CSS | Checkout | 1 |
| Penguin UI | Alpine.js + Tailwind components | Checkout | 1 |
| Braintree | Braintree SDK | BraintreePaymentProvider | 6 |
| Stripe.net | Stripe SDK | StripePaymentProvider | 7 |
| PayPalCheckoutSdk | PayPal SDK | PayPalPaymentProvider | 8 |

Note: Each payment provider has its own NuGet dependency. The checkout itself only depends on `IPaymentProvider` interface.

### Tailwind CSS Build
The checkout uses Tailwind CSS for utility-first styling, with Penguin UI components for common UI patterns:

```
src/Merchello/Styles/checkout.css → wwwroot/css/checkout.css
```

Add to `.csproj`:
```xml
<Target Name="CompileTailwind" BeforeTargets="Build">
  <Exec Command="npx tailwindcss -i Styles/checkout.css -o wwwroot/css/checkout.css --minify" />
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

- [ ] PCI Compliance - card data never touches our servers (HostedFields providers handle this)
- [ ] CSRF tokens on all form submissions
- [ ] Rate limiting on discount code attempts
- [ ] Server-side validation on all inputs
- [ ] HTTPS required for checkout pages
- [ ] Session security - basket tied to session/cookie
- [ ] Payment provider credentials stored securely (encrypted in DB, never exposed to frontend)

---

## Success Criteria

| Criteria | Measure |
|----------|---------|
| Functional | Complete checkout flow cart → confirmation |
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
