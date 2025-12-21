# Checkout - Sprint Planning Document

## Overview

Build a **Shopify-style built-in checkout** for Merchello - a consistent, mobile-first checkout experience that users cannot customise (except limited branding via settings).

### Goals
- Standalone checkout isolated from user's site theme
- Multi-step flow: Information → Shipping → Payment → Confirmation
- Guest checkout (email-only, customer auto-created)
- Express checkout (Apple Pay, Google Pay)
- Mobile-first, Shopify-quality UX

### Design Philosophy: Familiar Checkout Experience
The checkout **must look and feel like Shopify's checkout**. This is intentional - shoppers who buy online frequently are already familiar with Shopify's checkout flow (used by millions of stores). A familiar experience means:

- **Reduced friction** - Users know what to expect at each step
- **Trust** - Recognizable patterns signal a professional, secure checkout
- **Higher conversion** - Less cognitive load = fewer abandoned carts

Key Shopify patterns to follow:
- Clean, minimal layout with order summary sidebar
- Express checkout buttons (Apple Pay, Google Pay) prominently at top
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
The checkout is **provider-agnostic** - it works with any enabled payment provider via the existing `IPaymentProvider` interface. The checkout UI adapts based on each provider's `IntegrationType`:

| Integration Type | UI Behaviour | Example Providers |
|------------------|--------------|-------------------|
| **Redirect** | User redirected to external payment page | Stripe Checkout, PayPal |
| **HostedFields** | Inline card fields via provider's JS SDK | Braintree, Stripe Elements |
| **Widget** | Provider's embedded widget | Klarna, Affirm |
| **DirectForm** | Simple form fields (backoffice only) | Manual payments |

**Sprint 4 delivers Braintree** as the first HostedFields provider, demonstrating how to:
- Integrate a provider's JS SDK for inline card entry
- Handle Apple Pay / Google Pay via provider SDK
- Maintain PCI compliance (card data never touches our servers)

Future providers (Stripe Elements, Adyen, Square) follow the same pattern.

### Key Architecture References
- Follow patterns in `@docs/Architecture-Diagrams.md`
- Reference `ProductContentFinder` for URL routing pattern
- Reference existing `IPaymentProvider` interface and `StripePaymentProvider` for provider patterns
- Use `ICheckoutService` for basket operations
- Use `IOrderGroupingStrategy` for multi-warehouse display
- Use `IPaymentService` for payment session creation and processing
- Use `IDiscountEngine` and `IDiscountService` for discount code validation and automatic discounts (see `@docs/Discounts.md`)

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

## Phase 4: Payment Step & Braintree Provider

### Goal
Build the payment step UI that adapts to any payment provider's integration type. Add Braintree as the first HostedFields provider demonstrating inline card entry and express checkout.

### Deliverables

**Payment Step (Provider-Agnostic)**
- [ ] `Payment.cshtml` view that renders based on provider's `IntegrationType`
- [ ] Payment method selector (list enabled providers)
- [ ] Handle Redirect flow (redirect to provider, handle return)
- [ ] Handle HostedFields flow (load provider SDK, render inline fields)
- [ ] Express checkout section (shows Apple Pay/Google Pay when provider supports)
- [ ] Error handling and retry logic
- [ ] Order creation on successful payment

**Braintree Provider (HostedFields Example)**
- [ ] `BraintreePaymentProvider` implementing `IPaymentProvider`
- [ ] Configuration fields (merchant ID, public/private keys, environment)
- [ ] Client token generation for Drop-in UI
- [ ] Apple Pay / Google Pay integration via Braintree SDK
- [ ] Webhook endpoint for async payment confirmation
- [ ] Refund support

> **Note**: Follow the payment provider patterns in `@docs/PaymentProviders-Architecture.md` and `@docs/PaymentProviders-DevGuide.md`. Reference `StripePaymentProvider` as the existing implementation example.

### Key Services
- `IPaymentProviderManager.GetEnabledProvidersAsync()` - list available providers
- `IPaymentService.CreatePaymentSessionAsync()` - get provider session data
- `IPaymentService.ProcessPaymentAsync()` - process payment result
- `IInvoiceService.CreateInvoiceFromBasketAsync()` - create invoice/orders

### Key Patterns
The checkout must handle different integration types dynamically:

```javascript
// Payment step adapts to provider type
if (provider.integrationType === 'Redirect') {
    window.location.href = session.redirectUrl;
} else if (provider.integrationType === 'HostedFields') {
    loadProviderSdk(session.javaScriptSdkUrl, session.clientToken);
}
```

### Dependencies
- NuGet: `Braintree` (for Braintree provider only)

### Done When
- Payment step lists all enabled payment providers
- Existing Stripe (Redirect) still works through new UI
- Braintree (HostedFields) processes card payments in sandbox
- Apple Pay / Google Pay buttons appear when configured
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

### Key Services
- `IInvoiceService.GetAsync()`
- Notification: `InvoiceCreatedNotification`

### Done When
- Confirmation page displays complete order details
- If redirect URL configured, user redirects with invoice number in query
- Email notification fires on order completion
- Direct URL access to `/checkout/confirmation/{id}` works for order lookup

---

## Phase 6: Analytics Integration

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

## Phase 7: Polish & Testing

### Goal
Final polish, testing, and mobile refinement. All checkout settings are configured via `appsettings.json` (no admin UI needed).

### Deliverables
- [ ] Mobile UX refinement (touch targets, bottom-fixed buttons)
- [ ] Cross-browser testing
- [ ] Accessibility audit (WCAG 2.1 AA)

### Done When
- Works smoothly on mobile (iOS Safari, Android Chrome)
- Passes accessibility checks
- No console errors, smooth animations

---

## Technical Reference

### Checkout Settings Model
```csharp
public class CheckoutSettings
{
    // Branding
    public string? LogoUrl { get; set; }
    public string PrimaryColor { get; set; } = "#000000";
    public string AccentColor { get; set; } = "#0066FF";
    public string BackgroundColor { get; set; } = "#FFFFFF";
    public string TextColor { get; set; } = "#333333";

    // Company Info
    public string? CompanyName { get; set; }
    public string? SupportEmail { get; set; }
    public string? SupportPhone { get; set; }

    // Behavior
    public bool ShowExpressCheckout { get; set; } = true;
    public bool RequirePhone { get; set; } = false;
    public string? ConfirmationRedirectUrl { get; set; }
    public string? TermsUrl { get; set; }
    public string? PrivacyUrl { get; set; }
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
      "LogoUrl": "/images/logo.png",
      "PrimaryColor": "#000000",
      "AccentColor": "#0066FF",
      "BackgroundColor": "#FFFFFF",
      "TextColor": "#333333",
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
│   ├── Information.cshtml
│   ├── Shipping.cshtml
│   ├── Payment.cshtml              # Provider-agnostic, adapts to IntegrationType
│   └── Confirmation.cshtml
├── Styles/
│   ├── tailwind.config.js         # Tailwind configuration
│   └── checkout.css               # Tailwind input file (@tailwind directives)
└── wwwroot/
    ├── css/checkout.css           # Generated Tailwind output - do not edit
    └── js/checkout/
        ├── checkout.js
        ├── analytics.js
        └── payment.js              # Handles all provider integration types

src/Merchello.Core/Checkout/Models/
└── CheckoutSettings.cs

# Payment providers are separate - checkout works with ANY enabled provider
src/Merchello.PaymentProviders/
├── Stripe/
│   └── StripePaymentProvider.cs    # Already exists (Redirect type)
└── Braintree/
    └── BraintreePaymentProvider.cs # New (HostedFields type)
```

### Dependencies
| Package | Purpose | Used By |
|---------|---------|---------|
| Alpine.js (CDN) | Frontend reactivity | Checkout |
| Tailwind CSS | Utility-first CSS | Checkout |
| Penguin UI | Alpine.js + Tailwind components | Checkout |
| Braintree | Braintree SDK | BraintreePaymentProvider only |

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
| Payments | Card + Apple Pay + Google Pay working |
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
