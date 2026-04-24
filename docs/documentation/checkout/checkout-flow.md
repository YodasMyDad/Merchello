# Checkout Flow Overview

Merchello provides a built-in, Shopify-style checkout experience. It is a consistent, mobile-first flow that handles everything from basket to payment confirmation. The checkout is rendered using MVC Razor views from the Merchello RCL (Razor Class Library) and uses Alpine.js for interactivity.

**What it is:** A drop-in, opinionated checkout that works out of the box with any enabled payment and shipping provider.

**Why you use it:** You get a fully-tested, mobile-first checkout with multi-currency, abandoned-cart recovery, express checkout, and tax-inclusive display without writing any UI code. You only override views when you need brand-specific customisation (see [Customizing Checkout Views](checkout-razor.md)).

**How it fits together:**

| Layer | Responsibility | Source |
|-------|----------------|--------|
| `CheckoutContentFinder` | Resolves `/checkout/*` URLs into a virtual page | [CheckoutContentFinder.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Routing/CheckoutContentFinder.cs) |
| `MerchelloCheckoutController` | Razor-hijacked controller that renders each step | [MerchelloCheckoutController.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/MerchelloCheckoutController.cs) |
| `CheckoutApiController` | Public AJAX surface at `/api/merchello/checkout` | [CheckoutApiController.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/CheckoutApiController.cs) |
| `CheckoutPaymentsApiController` | Payment/express-checkout endpoints on the same base path | [CheckoutPaymentsApiController.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/CheckoutPaymentsApiController.cs) |
| `ICheckoutService` | Business logic: basket math, order grouping, address/shipping saves | [ICheckoutService.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Checkout/Services/Interfaces/ICheckoutService.cs) |
| `ICheckoutSessionService` | Per-basket session state (step, addresses, shipping selections, invoice id) | [ICheckoutSessionService.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Checkout/Services/Interfaces/ICheckoutSessionService.cs) |

> **Invariant:** Controllers never touch `DbContext`. All persistence and calculation flows through services. Basket totals are always computed by `CheckoutService.CalculateBasketAsync()` — never in views, controllers, or JS.

## Design Philosophy

The checkout intentionally mirrors Shopify's checkout patterns. Shoppers who buy online frequently are already familiar with this flow, which means:

- **Reduced friction** -- customers know what to expect at each step.
- **Trust** -- recognisable patterns signal a professional, secure checkout.
- **Higher conversion** -- less cognitive load means fewer abandoned carts.

## Checkout Steps

The checkout flows through these steps in order:

| Step | URL | Description |
|------|-----|-------------|
| Information | `/checkout` or `/checkout/information` | Email, billing address, shipping address |
| Shipping | `/checkout/shipping` | Shipping method selection per warehouse group |
| Payment | `/checkout/payment` | Payment method selection and processing |
| Confirmation | `/checkout/confirmation/{invoiceId}` | Order summary and download links |
| PaymentReturn | `/checkout/return` | Handles return from external payment providers |
| PaymentCancelled | `/checkout/cancel` | Handles cancelled external payments |
| PostPurchase | `/checkout/post-purchase/{invoiceId}` | Post-purchase upsells |

```csharp
public enum CheckoutStep
{
    Information = 0,
    Shipping = 1,
    Payment = 2,
    Confirmation = 3,
    PaymentReturn = 4,
    PaymentCancelled = 5,
    PostPurchase = 6
}
```

## How Routing Works

Checkout URLs are handled by `CheckoutContentFinder`, which intercepts any `/checkout/*` URL and creates virtual Umbraco content. This means you do not need to create checkout pages in the Umbraco content tree.

```
/checkout              --> CheckoutStep.Information
/checkout/information  --> CheckoutStep.Information
/checkout/shipping     --> CheckoutStep.Shipping
/checkout/payment      --> CheckoutStep.Payment
/checkout/confirmation/abc-123 --> CheckoutStep.Confirmation (with invoiceId)
```

The `MerchelloCheckoutController` then renders the appropriate Razor view from the RCL based on the step.

## The Checkout Controller

`MerchelloCheckoutController` is a standard Umbraco `RenderController` that:

1. Determines the current checkout step from the URL.
2. Loads the basket and checkout session.
3. Builds a `CheckoutViewModel` with all the data the view needs.
4. Renders the step-specific Razor view from the Merchello RCL.

The controller handles several special cases:

- **Confirmation security** -- validates a confirmation token cookie to prevent unauthorised access to order details.
- **Recovery links** -- handles abandoned checkout recovery tokens.
- **Custom confirmation redirect** -- supports redirecting to a custom URL after payment if configured.
- **Display currency enrichment** -- converts confirmation amounts to the customer's display currency.

## Checkout API

The `CheckoutApiController` at `/api/merchello/checkout` handles all the AJAX operations the checkout UI needs:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/basket` | Get basket with formatted totals |
| `GET` | `/shipping/countries` | Available shipping countries |
| `GET` | `/shipping/regions/{code}` | Regions for a shipping country |
| `GET` | `/billing/countries` | All countries for billing |
| `GET` | `/billing/regions/{code}` | Regions for a billing country |
| `POST` | `/addresses` | Save billing and shipping addresses |
| `POST` | `/discount/apply` | Apply a discount code |
| `POST` | `/initialize` | Initialize single-page checkout |
| `GET` | `/address-lookup/config` | Get address lookup configuration |
| `POST` | `/address-lookup/suggestions` | Get address autocomplete suggestions |
| `POST` | `/address-lookup/resolve` | Resolve an address suggestion |

## Single-Page Checkout

Merchello supports a single-page checkout mode where all sections (contact, billing, shipping, payment) are visible on one page. This is initialised with the `/api/merchello/checkout/initialize` endpoint:

```javascript
const response = await fetch('/api/merchello/checkout/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        countryCode: 'GB',
        stateCode: null,
        autoSelectShipping: true,
        email: null
    })
});
```

The `InitializeCheckout` method:
1. Sets the shipping location from the provided country/state.
2. Syncs the basket currency to match the storefront context.
3. Calculates order groups (splits basket items by warehouse).
4. Optionally auto-selects the cheapest shipping option per group.
5. Returns the basket, shipping groups, and combined shipping total.

## Express Checkout

The checkout supports express payment methods (Apple Pay, Google Pay, PayPal One Touch) that skip the form entirely:

1. Customer clicks an express checkout button on the cart or checkout page.
2. The payment provider handles authentication (Apple Pay sheet, PayPal popup, etc.).
3. The provider returns a payment token plus customer data (email, shipping address).
4. The backend creates the order immediately using the provider-returned data.
5. Customer goes directly to the confirmation page.

Express checkout methods are identified by `IsExpressCheckout = true` on the payment method.

## Payment Provider Architecture

The checkout is **provider-agnostic**. It works with any enabled payment provider via the `IPaymentProvider` interface. Each provider declares payment methods with an `IntegrationType`:

| Integration Type | Behaviour | Examples |
|------------------|-----------|---------|
| `Redirect` | Redirect to external payment page | Stripe Checkout |
| `HostedFields` | Inline card fields via provider SDK | Braintree Cards, Stripe Elements |
| `Widget` | Provider's embedded widget | Apple Pay, Google Pay |
| `DirectForm` | Simple form fields (backoffice only) | Manual payments |

## Guest Checkout

Guest checkout is supported -- customers only need to provide an email address. A customer record is auto-created from the email during checkout. For digital products, however, a customer account is required.

## Post-Payment Flow

After successful payment:

1. **Confirmation page** -- shows the order summary with line items, totals, and shipping details.
2. **Basket cleared** -- the basket cookie is deleted and per-request cache cleared.
3. **Download links** -- if the order contains digital products, download links are displayed (for `InstantDownload` method).
4. **Confirmation token** -- a secure cookie ensures only the customer who placed the order can view the confirmation.
5. **Post-purchase upsells** -- optionally redirects to a post-purchase upsell page before final confirmation.

## Abandoned Checkout Recovery

If `IAbandonedCheckoutService` is registered, the checkout supports recovery links sent via email. These links contain a token that restores the customer's basket and pre-fills their information.

## Key Points

- The checkout uses virtual routing via `CheckoutContentFinder` -- no Umbraco content pages needed.
- All checkout views are served from the Merchello RCL at `~/App_Plugins/Merchello/Views/Checkout/`.
- The checkout is Shopify-style: familiar, mobile-first, and opinionated.
- Express checkout methods skip the address form and go straight to payment.
- Confirmation pages are secured with a cookie token to prevent unauthorised access.
- The checkout supports both multi-step and single-page modes.
