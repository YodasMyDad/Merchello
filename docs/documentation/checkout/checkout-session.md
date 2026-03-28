# Checkout Session Management

The checkout session tracks the customer's progress through the checkout flow. It stores addresses, shipping selections, the current step, and other state that needs to persist across page loads during checkout.

## What the Session Stores

A `CheckoutSession` contains:

```csharp
public class CheckoutSession
{
    public Guid BasketId { get; set; }
    public Address BillingAddress { get; set; }
    public Address ShippingAddress { get; set; }
    public bool ShippingSameAsBilling { get; set; }
    public Dictionary<Guid, string> SelectedShippingOptions { get; set; }
    public Dictionary<Guid, QuotedShippingCost> QuotedShippingCosts { get; set; }
    public Dictionary<Guid, DateTime> SelectedDeliveryDates { get; set; }
    public CheckoutStep CurrentStep { get; set; }
    public bool AcceptsMarketing { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivityAt { get; set; }
    public Guid? InvoiceId { get; set; }
}
```

Each basket has one session. The session is created automatically the first time it is requested.

## Getting a Session

```csharp
var session = await checkoutSessionService.GetSessionAsync(basketId, ct);
```

If no session exists for the basket, a new one is created with default values.

## Saving Addresses

```csharp
await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
{
    BasketId = basketId,
    BillingAddress = billingAddress,
    ShippingAddress = shippingAddress,
    ShippingSameAsBilling = true,
    AcceptsMarketing = false
}, ct);
```

When `ShippingSameAsBilling` is `true`, the shipping address is set to match the billing address.

## Email Capture

You can save just the email without touching the rest of the session. This is used for abandoned checkout recovery -- capture the email early so you can send a recovery link if the customer leaves:

```csharp
await checkoutSessionService.SaveEmailAsync(basketId, "customer@example.com", ct);
```

> **Note:** `SaveEmailAsync` does NOT clear shipping selections, unlike `SaveAddressesAsync`. This is intentional -- it is a lightweight operation for early email capture.

## Setting the Checkout Step

Track which step the customer has reached:

```csharp
await checkoutSessionService.SetCurrentStepAsync(
    basketId,
    CheckoutStep.Shipping,
    ct);
```

## Saving Shipping Selections

After the customer picks their shipping methods:

```csharp
await checkoutSessionService.SaveShippingSelectionsAsync(
    new SaveSessionShippingSelectionsParameters
    {
        BasketId = basketId,
        Selections = new Dictionary<Guid, string>
        {
            // GroupId -> SelectionKey
            [warehouseGroupId] = "so:flat-rate-guid",    // Flat-rate selection
            [anotherGroupId] = "dyn:fedex:FEDEX_GROUND"  // Dynamic carrier selection
        },
        QuotedCosts = new Dictionary<Guid, QuotedShippingCost>
        {
            [warehouseGroupId] = new QuotedShippingCost(5.99m),
            [anotherGroupId] = new QuotedShippingCost(12.50m)
        }
    }, ct);
```

### Shipping Selection Key Format

The selection key follows a stable contract:

- **Flat-rate:** `so:{guid}` -- where guid is the shipping option ID.
- **Dynamic carrier:** `dyn:{provider}:{serviceCode}` -- e.g. `dyn:fedex:FEDEX_GROUND`.

> **Warning:** Do not change this key format. It is parsed by the order creation pipeline to set `ShippingProviderKey`, `ShippingServiceCode`, and `ShippingServiceName` on orders.

### Quoted Shipping Costs

The `QuotedShippingCosts` dictionary preserves the shipping rate that was shown to the customer at the time of selection. This quoted rate is honoured through checkout completion, even if the provider's live rates change between selection and payment.

## Setting the Invoice ID

When an invoice is created from the checkout, the session records it for security validation:

```csharp
await checkoutSessionService.SetInvoiceIdAsync(basketId, invoiceId, ct);
```

This ensures the session owns the invoice being paid -- preventing one session from paying for another session's invoice.

## Clearing the Session

```csharp
await checkoutSessionService.ClearSessionAsync(basketId, ct);
```

This resets the session to its default state. Typically called after order completion.

## Per-Request Basket Caching

The session service provides a per-request cache to avoid loading the basket from the database multiple times in the same HTTP request:

```csharp
// Cache the basket (stored in HttpContext.Items)
checkoutSessionService.CacheBasket(basket);

// Retrieve later in the same request
var cached = checkoutSessionService.GetCachedBasket();
```

This is used internally by the checkout pipeline to avoid redundant database calls.

## Session Timeouts

The checkout session tracks two timestamps:

- **CreatedAt** -- when the session was first created. Used with absolute timeout settings.
- **LastActivityAt** -- when the session was last accessed or modified. Used with sliding timeout settings.

These are used in conjunction with your checkout settings to expire stale sessions.

## Upsell Tracking

The session can track upsell impressions for conversion attribution:

```csharp
await checkoutSessionService.AddUpsellImpressionsAsync(
    new AddUpsellImpressionsParameters
    {
        BasketId = basketId,
        Impressions = [...]
    }, ct);
```

It also tracks auto-added upsell products that the customer explicitly removed, preventing re-addition:

```csharp
await checkoutSessionService.TrackRemovedAutoAddAsync(
    basketId,
    new RemovedAutoAddRecord { ProductId = productId },
    ct);
```

## Key Points

- One session per basket. Created automatically on first access.
- `SaveEmailAsync` is a lightweight operation for early email capture (abandoned checkout recovery).
- Shipping selection keys follow a stable contract: `so:{guid}` or `dyn:{provider}:{serviceCode}`.
- Quoted shipping costs are preserved from selection time through to order creation.
- The `InvoiceId` on the session provides security validation during payment.
- Per-request basket caching avoids redundant database loads within a single HTTP request.
