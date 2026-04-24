# Dynamic Shipping Providers

Dynamic shipping providers fetch live rates from carrier APIs at checkout. Merchello ships with built-in FedEx and UPS providers, and you can add custom providers for other carriers.

## How Dynamic Providers Differ from Flat Rate

| Aspect | Flat Rate | Dynamic |
|--------|-----------|---------|
| Rates | Pre-configured in database | Fetched live from carrier API |
| Package info | Not used | Weight, dimensions sent to carrier |
| API keys | Not needed | Required (carrier credentials) |
| Cost accuracy | Fixed | Real-time based on actual shipment |
| Speed | Instant (DB lookup) | Network call to carrier API |

Dynamic providers set `UsesLiveRates = true` in their metadata and must **not** rely on fixed-cost entries in the database.

> **Invariant (CLAUDE.md):** If you want a carrier-named option at a fixed cost (e.g., "FedEx Ground $8.99"), create it as a flat-rate `ShippingOption` (`ProviderKey = "flat-rate"`). Assigning a dynamic provider key to a fixed-cost entry will cause the option to be hidden or rendered as "Calculated at checkout".

Built-in dynamic providers:

- [`FedExShippingProvider`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs) (`fedex`)
- [`UpsShippingProvider`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs) (`ups`)

---

## Built-in Providers

### FedEx

**Provider Key:** `fedex`

Real-time FedEx shipping rates via the FedEx REST API.

#### Configuration Fields

| Field | Description |
|-------|-------------|
| `apiKey` | FedEx API Key (Client ID) |
| `secretKey` | FedEx Secret Key (Client Secret) |
| `accountNumber` | FedEx Account Number |
| `environment` | `sandbox` or `production` |
| `childKey` | (Optional) Child Key for CSP/parent-child OAuth |
| `childSecret` | (Optional) Child Secret for CSP/parent-child OAuth |

#### Supported Service Types

| Service Code | Description |
|-------------|-------------|
| `FEDEX_GROUND` | FedEx Ground |
| `FEDEX_EXPRESS_SAVER` | FedEx Express Saver |
| `FEDEX_2_DAY` | FedEx 2Day |
| `FEDEX_2_DAY_AM` | FedEx 2Day AM |
| `PRIORITY_OVERNIGHT` | FedEx Priority Overnight |
| `STANDARD_OVERNIGHT` | FedEx Standard Overnight |
| `FIRST_OVERNIGHT` | FedEx First Overnight |
| `INTERNATIONAL_ECONOMY` | FedEx International Economy |
| `INTERNATIONAL_PRIORITY` | FedEx International Priority |
| `FEDEX_FREIGHT_ECONOMY` | FedEx Freight Economy |

#### Testing

For sandbox testing, use your own API Key and Secret Key from the [FedEx Developer Portal](https://developer.fedex.com), FedEx's test account number `740561073`, and real addresses (sandbox returns simulated rates). Do not use your production account number in sandbox mode.

---

### UPS

**Provider Key:** `ups`

Real-time UPS shipping rates via the UPS REST API.

#### Configuration Fields

| Field | Description |
|-------|-------------|
| `clientId` | UPS Client ID |
| `clientSecret` | UPS Client Secret |
| `accountNumber` | UPS Shipper Number |
| `environment` | `sandbox` or `production` |

#### Supported Service Types

| Service Code | Description |
|-------------|-------------|
| `03` | UPS Ground |
| `02` | UPS 2nd Day Air |
| `13` | UPS Next Day Air Saver |
| `01` | UPS Next Day Air |
| `14` | UPS Next Day Air Early |
| `59` | UPS 2nd Day Air AM |
| `12` | UPS 3 Day Select |
| `65` | UPS Saver (International) |
| `07` | UPS Worldwide Express |
| `08` | UPS Worldwide Expedited |
| `11` | UPS Standard (International) |
| `54` | UPS Worldwide Express Plus |

#### Testing

Your Client ID and Secret work for both sandbox and production. Sandbox returns simulated rates; production rates reflect your negotiated pricing.

---

## Rate Fetching at Checkout

When the customer's shipping address is known, `IShippingQuoteService` fetches rates from all applicable providers:

```csharp
var quotes = await shippingQuoteService.GetQuotesForWarehouseAsync(
    new GetWarehouseQuotesParameters
    {
        WarehouseId = warehouseId,
        Items = shippableItems,
        DestinationAddress = shippingAddress,
        CurrencyCode = currencyCode
    },
    cancellationToken);
```

The quotes are combined with flat-rate options and presented to the customer as a unified list.

### Quoted Rate Caching

When a customer selects a dynamic shipping option at checkout, the quoted rate is stored in the checkout session. This ensures the customer is charged the rate they saw, even if carrier rates change between selection and payment.

The `QuotedCosts` dictionary in the shipping selection request preserves these rates:

```json
{
  "selections": {
    "group-id": "dyn:fedex:FEDEX_GROUND"
  },
  "quotedCosts": {
    "group-id": 8.47
  }
}
```

### Selection Key Contract

Shipping selection keys follow a stable contract that is parsed into order fields (`ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`):

- Flat-rate: `so:{guid}`
- Dynamic: `dyn:{provider}:{serviceCode}`

---

## Fallback Behavior

If a dynamic provider fails to return rates (API timeout, invalid credentials, etc.), the system:

1. Logs a warning
2. Marks the option with `IsFallbackRate = true` and a `FallbackReason`
3. Falls back to flat-rate options for that group
4. The customer can still complete checkout using flat-rate shipping

The checkout UI can display a message when fallback rates are used (check `HasFallbackRates` on the shipping group DTO).

---

## Currency Conversion

Carrier APIs may return rates in a different currency than your store currency. The system:

1. Detects the currency mismatch between the carrier response and store currency
2. Looks up the exchange rate from `IExchangeRateCache`
3. Converts the rate to the store currency
4. Applies any further display currency conversion for the customer

---

## Creating a Custom Dynamic Provider

To add support for another carrier, implement `IShippingProvider` (or extend `ShippingProviderBase` for sensible defaults):

```csharp
public class MyCarrierProvider : ShippingProviderBase
{
    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "mycarrier",
        DisplayName = "My Carrier",
        SupportsRealTimeRates = true,
        RequiresFullAddress = true
    };

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request,
        CancellationToken ct)
    {
        // Call your carrier's API
        // Return a ShippingRateQuote with service levels
    }
}
```

Your provider is automatically discovered by `ExtensionManager` and available for configuration in the backoffice.

### Blocking Dynamic Options per Product

Set `ProductRoot.AllowExternalCarrierShipping = false` to prevent dynamic carrier options from appearing for specific products. Those products will only show flat-rate shipping options at checkout.

> **Invariant (CLAUDE.md):** `AllowExternalCarrierShipping = false` must suppress dynamic options for the entire shipping group containing that product. The default order grouping strategy enforces this -- custom strategies must honour it too.

---

## IShippingProvider Reference

### Required Members

| Member | Purpose |
| ------ | ------- |
| `Metadata` | Provider name, key, capabilities |
| `IsAvailableFor(request)` | Quick check if provider can service the request |
| `GetRatesAsync(request)` | Fetch all available rates |

### Configuration Members

| Member | Purpose |
| ------ | ------- |
| `GetConfigurationFieldsAsync()` | Global config fields (API keys, etc.) |
| `GetMethodConfigFieldsAsync()` | Per-method config fields |
| `GetSupportedServiceTypesAsync()` | List all service types |
| `ConfigureAsync(config)` | Apply saved configuration |

### Extended Rate Methods

| Method | Purpose |
|--------|---------|
| `GetRatesForServicesAsync(request, services, options)` | Fetch rates for specific service types |
| `GetRatesForAllServicesAsync(request, warehouseConfig)` | Fetch all rates with warehouse config applied (markup, exclusions) |
| `GetAvailableServicesAsync(origin, destination)` | Discover available services for a route |

### Delivery Date Methods

| Method | Purpose |
|--------|---------|
| `GetAvailableDeliveryDatesAsync(request, service)` | Get selectable delivery dates |
| `CalculateDeliveryDateSurchargeAsync(request, service, date)` | Calculate surcharge for a specific date |
| `ValidateDeliveryDateAsync(request, service, date)` | Validate a delivery date is still available |

See the full interface at [`IShippingProvider.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shipping/Providers/Interfaces/IShippingProvider.cs).

## Related Topics

- [Shipping Overview](shipping-overview.md)
- [Flat Rate Shipping](flat-rate-shipping.md)
- [Package Configuration](package-configuration.md) -- weight/dimensions used by carrier APIs
- [Creating Shipping Providers](../extending/creating-shipping-providers.md)
