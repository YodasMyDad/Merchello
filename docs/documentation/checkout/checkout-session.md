# Checkout Session

The checkout session tracks the customer's progress through the checkout flow. It stores addresses, shipping selections, and the current step across page loads.

## What the Session Stores

Each basket has one session, created automatically on first access. The session holds:

- Billing and shipping addresses
- Shipping option selections (per order group)
- Quoted shipping costs (locked at selection time)
- The current checkout step
- Marketing opt-in preference
- The invoice ID (set after order creation)

## Getting a Session

```csharp
var session = await checkoutSessionService.GetSessionAsync(basketId, ct);
```

If no session exists, a new one is created with default values.

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
            [anotherGroupId] = "dyn:fedex:FEDEX_GROUND"
        },
        QuotedCosts = new Dictionary<Guid, QuotedShippingCost>
        {
            [warehouseGroupId] = new QuotedShippingCost(5.99m),
            [anotherGroupId] = new QuotedShippingCost(12.50m)
        }
    }, ct);
```

### Selection Key Format

- **Flat-rate:** `so:{guid}` -- the shipping option ID.
- **Dynamic carrier:** `dyn:{provider}:{serviceCode}` -- e.g. `dyn:fedex:FEDEX_GROUND`.

See [Checkout Shipping](checkout-shipping.md) for more on how selection keys work.

### Quoted Shipping Costs

The `QuotedCosts` dictionary captures the shipping rate shown to the customer at selection time. This rate is honoured through to order creation, even if the provider's live rates change between selection and payment.

## Clearing the Session

```csharp
await checkoutSessionService.ClearSessionAsync(basketId, ct);
```

Resets the session to its default state. Call this after order completion to clean up session data.

## Key Points

- One session per basket, created automatically on first access.
- `SaveEmailAsync` is lightweight -- use it early for abandoned checkout recovery.
- Shipping selection keys follow a stable contract: `so:{guid}` or `dyn:{provider}:{serviceCode}`.
- Quoted shipping costs are preserved from selection time through to order creation.
- The session records the invoice ID after order creation for security validation during payment.
