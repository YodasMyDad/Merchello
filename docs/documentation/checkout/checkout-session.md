# Checkout Session

The checkout session is per-basket state that tracks where the customer is in the checkout flow. It is stored in `HttpContext.Session` (not the database) and survives page loads for the duration of the session cookie.

**What it is:** A JSON blob keyed by `MerchelloCheckout_{basketId}` that holds addresses, shipping selections, quoted costs, delivery dates, the current step, and (after order creation) the invoice ID.

**Why it exists:** The basket stores the latest-saved addresses and totals, but the session tracks checkout-specific signals the basket doesn't know about — like which shipping options the customer picked, what rate they were quoted, and which invoice they're paying for. It also enforces security by binding the active invoice to the session cookie so someone with a stolen URL can't pay for someone else's order.

Source: [CheckoutSession.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Checkout/Models/CheckoutSession.cs), [CheckoutSessionService.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Checkout/Services/CheckoutSessionService.cs)

## What the Session Stores

| Field | Purpose |
|-------|---------|
| `BillingAddress`, `ShippingAddress` | Captured addresses |
| `ShippingSameAsBilling` | Whether the customer ticked "same as billing" |
| `SelectedShippingOptions` | `Dictionary<Guid, string>` — GroupId to selection key (`so:{guid}` or `dyn:{provider}:{serviceCode}`) |
| `QuotedShippingCosts` | `Dictionary<Guid, QuotedShippingCost>` — rate shown to the customer at selection time |
| `SelectedDeliveryDates` | Optional per-group delivery dates |
| `CurrentStep` | `CheckoutStep` enum tracking progress |
| `AcceptsMarketing` | Marketing opt-in flag |
| `CreatedAt`, `LastActivityAt` | Session freshness for sliding/absolute timeouts |
| `InvoiceId` | The invoice created from this session (set during order creation) |
| `UpsellImpressions`, `RemovedAutoAddUpsells` | Upsell attribution and suppression |

Session timeouts are controlled by `CheckoutSettings.SessionSlidingTimeoutMinutes` (default 30) and `SessionAbsoluteTimeoutMinutes` (default 240). Set either to `0` to disable it.

## Getting a Session

```csharp
var session = await checkoutSessionService.GetSessionAsync(basketId, ct);
```

If no session exists, a fresh one is returned with `CreatedAt`/`LastActivityAt` set to `UtcNow` and `CurrentStep = Information`.

## Saving Addresses

```csharp
await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
{
    BasketId = basketId,
    Billing = billingAddress,           // Address domain model, not DTO
    Shipping = shippingAddress,         // null when SameAsBilling is true
    SameAsBilling = true,
    AcceptsMarketing = false
}, ct);
```

When `SameAsBilling` is `true`, the shipping address on the session is set to match the billing address regardless of what you pass in `Shipping`.

> **Prefer the service over the session** for most flows: `ICheckoutService.SaveAddressesAsync()` wraps session save + basket recalculation + automatic-discount refresh + DB persistence. See [Checkout Addresses](checkout-addresses.md).

## Email Capture

Save just the email early in the flow for abandoned checkout recovery:

```csharp
await checkoutSessionService.SaveEmailAsync(basketId, "customer@example.com", ct);
```

This is a lightweight operation -- it does not clear shipping selections or reset other session state.

## Setting the Checkout Step

Track which step the customer has reached:

```csharp
await checkoutSessionService.SetCurrentStepAsync(basketId, CheckoutStep.Shipping, ct);
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
            [warehouseGroupId] = "so:flat-rate-guid",
            [anotherGroupId]   = "dyn:fedex:FEDEX_GROUND"
        },
        QuotedCosts = new Dictionary<Guid, QuotedShippingCost>
        {
            [warehouseGroupId] = new QuotedShippingCost(5.99m, DateTime.UtcNow),
            [anotherGroupId]   = new QuotedShippingCost(12.50m, DateTime.UtcNow)
        }
    }, ct);
```

`QuotedShippingCost` is a record with two fields — `(decimal Cost, DateTime QuotedAt)`. You must pass both; the timestamp is used for audit.

> **Prefer `ICheckoutService.SaveShippingSelectionsAsync()`** from API flows — it wraps this session call plus basket recalculation, discount refresh, and DB persistence. See [Checkout Shipping](checkout-shipping.md).

### Selection Key Format

- **Flat-rate:** `so:{guid}` -- the `ShippingOption.Id`.
- **Dynamic carrier:** `dyn:{provider}:{serviceCode}` -- e.g. `dyn:fedex:FEDEX_GROUND`.

This contract is stable. When the invoice is created, the key is parsed into `Invoice.ShippingProviderKey`, `ShippingServiceCode`, and `ShippingServiceName` — do not break this contract or downstream fulfilment routing will fail. See [Checkout Shipping](checkout-shipping.md) for how keys are produced and parsed.

### Quoted Shipping Costs

The `QuotedCosts` dictionary captures the shipping rate shown to the customer at selection time. This rate is honoured through to order creation, even if the provider's live rates change between selection and payment. This matters most for dynamic carrier quotes (FedEx, UPS) where rates fluctuate throughout the day — the customer always pays what they saw on the shipping step.

## Recording the Invoice ID

When an invoice is created during checkout, the service records it on the session so subsequent payment calls can validate ownership:

```csharp
await checkoutSessionService.SetInvoiceIdAsync(basketId, invoiceId, ct);
```

This is used by `CheckoutPaymentsOrchestrationService.ValidateInvoiceCheckoutOwnershipAsync` — if the session's `InvoiceId` doesn't match the invoice being paid, the request is rejected. This prevents a leaked invoice URL from being paid by another session.

## Per-Request Basket Cache

To avoid re-fetching the basket inside one request, the session service exposes a per-request cache backed by `HttpContext.Items`:

```csharp
checkoutSessionService.CacheBasket(basket);
var cached = checkoutSessionService.GetCachedBasket(); // null if not cached
```

## Clearing the Session

```csharp
await checkoutSessionService.ClearSessionAsync(basketId, ct);
```

Resets the session to its default state. Call this after order completion to clean up session data.

## Key Points

- One session per basket, stored in `HttpContext.Session` (not the DB).
- `SaveEmailAsync` is lightweight -- use it early for abandoned checkout recovery; it does not reset shipping selections.
- Shipping selection keys follow a stable contract: `so:{guid}` or `dyn:{provider}:{serviceCode}`.
- `QuotedShippingCost` is a record requiring both `Cost` and `QuotedAt`.
- The session records the invoice ID after order creation for security validation during payment.
- Prefer `ICheckoutService` methods over direct `ICheckoutSessionService` calls — the service wrappers also recalculate the basket and refresh discounts.
