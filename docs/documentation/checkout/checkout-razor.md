# Customizing Checkout Views

Merchello ships with an integrated Shopify-style checkout that renders via Razor views. This guide covers how the views work, what data they receive, and how to customize them.

## How Checkout Rendering Works

Merchello's checkout uses Umbraco's route hijacking. When a content node has the `MerchelloCheckout` content type alias, the `MerchelloCheckoutController` handles the request and renders the appropriate Razor view based on the checkout step.

The controller is a standard Umbraco `RenderController`:

```csharp
public class MerchelloCheckoutController : RenderController
{
    public async Task<IActionResult> Index(CancellationToken ct)
    {
        // Determines the step, loads data, returns the right view
    }
}
```

---

## View Locations

All checkout views live in the Razor Class Library (RCL) at:

```
~/App_Plugins/Merchello/Views/Checkout/
```

| View | Step | Purpose |
|------|------|---------|
| `SinglePage.cshtml` | Information, Shipping, Payment | The main single-page checkout |
| `Confirmation.cshtml` | Confirmation | Order confirmation after payment |
| `PostPurchase.cshtml` | PostPurchase | Post-purchase upsell page |
| `Return.cshtml` | PaymentReturn | Payment provider redirect return |
| `Cancel.cshtml` | PaymentCancelled | Payment cancellation page |
| `ResetPassword.cshtml` | N/A | Password reset form |

The single-page checkout handles the Information, Shipping, and Payment steps in a single view with client-side step navigation.

---

## The CheckoutViewModel

Every checkout view receives a `CheckoutViewModel` with all the data needed for rendering. Here are the key properties:

### Core Properties

| Property | Type | Description |
|----------|------|-------------|
| `Step` | `CheckoutStep` | Current step (Information, Shipping, Payment, Confirmation, etc.) |
| `Settings` | `CheckoutSettings` | Branding and configuration (logo, colors, store name) |
| `Store` | `StoreSettings` | Store identity and contact information |
| `Basket` | `Basket?` | The shopping basket (null on confirmation page) |
| `Session` | `CheckoutSession?` | Checkout session tracking progress |

### Country and Shipping

| Property | Type | Description |
|----------|------|-------------|
| `BillingCountries` | `IReadOnlyCollection<CountryDto>` | All countries for billing address |
| `ShippingCountries` | `IReadOnlyCollection<CountryDto>` | Countries you can ship to |
| `ShippingGroups` | `IReadOnlyCollection<ShippingGroupDto>` | Shipping groups with options |
| `DefaultCountryCode` | `string?` | Pre-selected country code |
| `DefaultStateCode` | `string?` | Pre-selected state/region code |

### Currency and Display

| Property | Type | Description |
|----------|------|-------------|
| `DisplayCurrencyCode` | `string?` | Customer's display currency (e.g., "GBP") |
| `DisplayCurrencySymbol` | `string?` | Currency symbol (e.g., "£") |
| `ExchangeRate` | `decimal` | Exchange rate from store to display currency |
| `CurrencyDecimalPlaces` | `int` | Decimal places for formatting (e.g., 2 for GBP, 0 for JPY) |
| `DisplayTotal` | `decimal` | Pre-calculated total in display currency |
| `DisplaySubTotal` | `decimal` | Pre-calculated subtotal |
| `DisplayShipping` | `decimal` | Pre-calculated shipping cost |
| `DisplayTax` | `decimal` | Pre-calculated tax amount |
| `DisplayDiscount` | `decimal` | Pre-calculated discount amount |

### Tax-Inclusive Display

| Property | Type | Description |
|----------|------|-------------|
| `DisplayPricesIncTax` | `bool` | Whether prices include tax |
| `TaxInclusiveDisplaySubTotal` | `decimal` | Subtotal with tax included |
| `TaxIncludedMessage` | `string?` | e.g., "Including £10.17 in taxes" |

### UI State

| Property | Type | Description |
|----------|------|-------------|
| `HasItems` | `bool` | Whether the basket has items |
| `IsSinglePageCheckout` | `bool` | Whether this is the single-page view |
| `ShowDiscountCode` | `bool` | Whether to show discount code input |
| `IsLoggedIn` | `bool` | Whether the customer is signed in |
| `MemberEmail` | `string?` | Logged-in member's email |
| `HasDigitalProducts` | `bool` | Whether basket has digital products |
| `LogoPositionClass` | `string` | CSS class for logo alignment |

### Confirmation

| Property | Type | Description |
|----------|------|-------------|
| `Confirmation` | `OrderConfirmationDto?` | Order confirmation data |
| `LineItemsJson` | `string?` | Pre-serialized line items for analytics |

### Integration

| Property | Type | Description |
|----------|------|-------------|
| `AddressLookup` | `AddressLookupClientConfigDto?` | Address lookup provider config |
| `ExpressCheckoutConfig` | `ExpressCheckoutConfigDto?` | Express checkout SDK config |

---

## Overriding Views

To customize the checkout views, create your own view files that override the defaults. Because the views are served from an RCL, the standard ASP.NET Core view discovery order applies -- views in your project take priority over RCL views.

### Option 1: Override in Your Project

Create the same file path in your project's `Views` folder:

```
YourProject/
  Views/
    Checkout/
      SinglePage.cshtml      <-- overrides the RCL version
      Confirmation.cshtml     <-- overrides the RCL version
```

> **Warning:** When you override a view, you take ownership of it. Future Merchello updates to that view won't automatically apply to your override. Keep your customizations minimal to reduce maintenance.

### Option 2: Custom Confirmation Redirect

If you only need to customize the confirmation page, you can configure a redirect URL instead of overriding the view:

```json
{
  "Merchello": {
    "Checkout": {
      "ConfirmationRedirectUrl": "/thank-you"
    }
  }
}
```

When set, the checkout redirects to your custom URL with query parameters:

```
/thank-you?invoiceId=abc123&invoiceNumber=INV-001
```

This lets you build the confirmation page however you want while keeping the rest of the checkout intact.

---

## Checkout Steps

The checkout controller determines the step from the `MerchelloCheckoutPage` content node:

```csharp
public enum CheckoutStep
{
    Information,
    Shipping,
    Payment,
    Confirmation,
    PaymentReturn,
    PaymentCancelled,
    PostPurchase
}
```

For the single-page checkout, Information, Shipping, and Payment are all handled in `SinglePage.cshtml` with JavaScript managing step navigation.

---

## Security Features

The checkout views include several security measures you should preserve in any overrides:

### Confirmation Page Security

The confirmation page uses a cookie-based token to prevent unauthorized access:

```csharp
// Token is set when payment succeeds
var confirmationToken = Request.Cookies[Core.Constants.Cookies.ConfirmationToken];
// Must match the invoice ID
if (tokenInvoiceId != checkoutPage.InvoiceId.Value)
{
    // Show "order not found" -- don't reveal whether the invoice exists
}
```

### Cache Prevention

The confirmation and post-purchase pages set no-cache headers to prevent shared computer users from seeing previous orders:

```csharp
Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
```

### Basket Cleanup

After a successful order, the basket cookie is deleted:

```csharp
Response.Cookies.Delete(Core.Constants.Cookies.BasketId);
```

---

## Cart Recovery Links

The checkout controller handles recovery links at `/checkout/recover/{token}`. When a customer clicks a recovery link from an abandoned cart email, the controller:

1. Validates the recovery token
2. Restores the basket from the abandoned checkout snapshot
3. Sets the basket cookie
4. Redirects to `/checkout/information`

This is handled automatically -- you don't need to add any code for it to work.

---

## Checkout Settings

The `CheckoutSettings` object in the view model controls branding:

```json
{
  "Merchello": {
    "Checkout": {
      "LogoUrl": "/img/logo.png",
      "LogoPosition": "Left",
      "AccentColor": "#6366f1",
      "ConfirmationRedirectUrl": null
    }
  }
}
```

| Setting | Description |
|---------|-------------|
| `LogoUrl` | URL to your store logo |
| `LogoPosition` | `Left`, `Center`, or `Right` alignment |
| `AccentColor` | Primary accent color for buttons and highlights |
| `ConfirmationRedirectUrl` | Custom URL to redirect after order completion |

---

## Data Flow Summary

Here's how data flows from the controller to your views:

1. **Controller loads basket** via `ICheckoutService.GetBasket()`
2. **Controller initializes checkout** with the customer's country to get shipping groups
3. **Controller resolves display currency** via `IStorefrontContextService.GetDisplayContextAsync()`
4. **Controller calculates display amounts** with proper currency conversion and tax-inclusive math
5. **Controller builds `CheckoutViewModel`** with all pre-calculated values
6. **View receives the model** and renders the UI

> **Tip:** All monetary calculations are done server-side in the controller. Your views should display the pre-calculated values rather than doing math in Razor. This keeps the single source of truth for calculations in C#.
