# Customizing Checkout Views

Merchello ships with a Shopify-style checkout rendered via Razor views. This guide covers where the views live, what data they receive, and how to customize them.

## How Checkout Rendering Works

When a content node uses the `MerchelloCheckout` content type alias, the `MerchelloCheckoutController` handles the request and renders the appropriate Razor view based on the checkout step. This uses Umbraco's standard route hijacking.

---

## View Locations

All checkout views are served from the Merchello RCL at:

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

The single-page checkout handles Information, Shipping, and Payment steps in one view with client-side step navigation.

---

## The CheckoutViewModel

Every checkout view receives a `CheckoutViewModel` with all the data needed for rendering.

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

> **Tip:** All monetary calculations are done server-side. Your views should display the pre-calculated values from the view model rather than doing math in Razor.

---

## Overriding Views

Views in your project take priority over RCL views, following standard ASP.NET Core view discovery.

### Option 1: Override in Your Project

Create the same file path in your project's `Views` folder:

```
YourProject/
  Views/
    Checkout/
      SinglePage.cshtml      <-- overrides the RCL version
      Confirmation.cshtml     <-- overrides the RCL version
```

> **Warning:** When you override a view, you take ownership of it. Future Merchello updates to that view won't automatically apply to your override. Keep customizations minimal to reduce maintenance.

### Option 2: Custom Confirmation Redirect

If you only need to customize the confirmation page, configure a redirect URL instead:

```json
{
  "Merchello": {
    "Checkout": {
      "ConfirmationRedirectUrl": "/thank-you"
    }
  }
}
```

The checkout redirects to your URL with query parameters:

```
/thank-you?invoiceId=abc123&invoiceNumber=INV-001
```

This lets you build the confirmation page however you want while keeping the rest of the checkout intact.

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

## Cart Recovery Links

The checkout handles recovery links at `/checkout/recover/{token}` automatically. When a customer clicks a recovery link from an abandoned cart email:

1. The recovery token is validated.
2. The basket is restored from the abandoned checkout snapshot.
3. The basket cookie is set.
4. The customer is redirected to `/checkout/information`.

No additional code is needed for this to work.

---

## Security Notes for View Overrides

If you override checkout views, keep these behaviors intact:

- **Confirmation page access** is protected by a cookie token -- only the customer who placed the order can view confirmation details.
- **Confirmation and post-purchase pages** set no-cache headers to prevent shared computer users from seeing previous orders.
- **Basket cleanup** happens automatically after a successful order (the basket cookie is deleted).

These are handled by the controller, so they work automatically unless you bypass the standard rendering pipeline.
