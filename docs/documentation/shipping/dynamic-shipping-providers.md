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

---

## Built-in Providers

### FedEx

**Provider Key:** `fedex`

Real-time FedEx shipping rates via the FedEx REST API.

#### Setup

1. Create a FedEx Developer account at [developer.fedex.com](https://developer.fedex.com)
2. Create an API Project and select the **Rate API**
3. Get your **API Key** (Client ID) and **Secret Key** (Client Secret)
4. Get your **FedEx Account Number**

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

FedEx provides many service levels. Common ones include:

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

For sandbox testing:
- Use your own API Key and Secret Key from the Developer Portal
- Use FedEx's test account number: `740561073`
- Test with real addresses -- sandbox returns simulated rates

> **Warning:** Do not use your production account number in sandbox mode.

---

### UPS

**Provider Key:** `ups`

Real-time UPS shipping rates via the UPS REST API.

#### Setup

1. Create a UPS Developer account at [developer.ups.com](https://developer.ups.com)
2. Create an Application and select the **Rating** API
3. Get your **Client ID** and **Client Secret**
4. Get your **UPS Account Number** (shipper number)

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

- Your Client ID and Secret work for both sandbox and production
- Sandbox returns simulated rates
- Production rates reflect your negotiated pricing

---

## Warehouse Provider Configuration

Each warehouse can have its own configuration for dynamic providers. This is managed in the backoffice under **Warehouses > [Warehouse] > Shipping Providers**.

### Per-Warehouse Settings

| Setting | Description |
|---------|-------------|
| **Enabled** | Whether this provider is active for this warehouse |
| **Markup Percentage** | Percentage to add on top of carrier rates (e.g., 10% markup) |
| **Excluded Services** | Service types to hide from customers |

### How It Works

1. The provider is configured globally with API credentials
2. Each warehouse enables the provider and sets its own markup/exclusions
3. At checkout, when items are grouped by warehouse:
   - The system checks which dynamic providers are enabled for that warehouse
   - Fetches rates from each enabled provider
   - Applies markup percentages
   - Filters out excluded service types
   - Returns the remaining options to the customer

### Markup Example

If FedEx Ground quotes $8.47 and the warehouse has a 15% markup:

```
Base rate:  $8.47
Markup:     $1.27 (15% of $8.47)
Shown cost: $9.74
```

### Service Exclusions

You might want to exclude certain service types. For example:
- Exclude overnight shipping from a warehouse that can't process same-day
- Exclude freight services for a warehouse without a loading dock
- Exclude international services from a domestic-only warehouse

---

## Provider Visibility

Dynamic provider options appear at checkout when:

1. The provider is **globally enabled** (configured with API credentials)
2. The provider is **enabled for the warehouse** serving the items
3. The product allows external carrier shipping (`ProductRoot.AllowExternalCarrierShipping != false`)
4. The carrier can service the route (origin warehouse to destination address)

If any of these conditions fail, the dynamic options are silently hidden -- the customer only sees flat-rate options.

---

## Rate Fetching at Checkout

When the customer's shipping address is known, the system fetches rates:

```csharp
// IShippingQuoteService fetches quotes from all applicable providers
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

To add support for another carrier, extend `ShippingProviderBase`:

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

---

## IShippingProvider Reference

### Required Methods

| Method | Purpose |
|--------|---------|
| `Metadata` | Provider name, key, capabilities |
| `IsAvailableFor(request)` | Quick check if provider can service the request |
| `GetRatesAsync(request)` | Fetch all available rates |

### Optional Methods

| Method | Purpose |
|--------|---------|
| `GetConfigurationFieldsAsync()` | Global config fields (API keys, etc.) |
| `GetMethodConfigFieldsAsync()` | Per-method config fields |
| `GetSupportedServiceTypesAsync()` | List all service types |
| `ConfigureAsync(config)` | Apply saved configuration |
| `GetRatesForServicesAsync(request, services, options)` | Fetch rates for specific service types |
| `GetRatesForAllServicesAsync(request, warehouseConfig)` | Fetch all rates with warehouse config applied |
| `GetAvailableServicesAsync(origin, destination)` | Discover available services for a route |
| `GetAvailableDeliveryDatesAsync(request, service)` | Get selectable delivery dates |
| `CalculateDeliveryDateSurchargeAsync(request, service, date)` | Calculate surcharge for a date |
| `ValidateDeliveryDateAsync(request, service, date)` | Validate a delivery date |
