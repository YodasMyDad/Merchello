# Creating Custom Shipping Providers

Shipping providers fetch delivery rates and options for customers during checkout. Merchello ships with a built-in flat-rate provider and live-rate providers for FedEx and UPS, but you can create your own for any carrier or custom rate logic.

## Quick Overview

To create a shipping provider, you need to:

1. Create a class that extends `ShippingProviderBase`
2. Implement the required members: `Metadata`, `IsAvailableFor()`, and `GetRatesAsync()`
3. Optionally support service types, delivery dates, and dynamic service discovery

## How Shipping Providers Fit In

Understanding where your provider sits in the shipping pipeline is important:

```
Customer enters address
    -> IShippingService.GetShippingOptionsForBasket()
    -> Order grouping determines which warehouses serve the items
    -> For each warehouse:
        -> Flat-rate options are resolved from configured shipping options
        -> Dynamic providers (yours) are called via GetRatesAsync()
    -> All options are presented to the customer
```

> **Note:** Shipping providers determine **customer-facing rates and options**. They are separate from fulfilment providers, which handle the physical shipment after an order is placed. Don't mix carrier quoting logic into fulfilment services.

### Flat-Rate vs Dynamic Providers

Merchello distinguishes two provider flavors by the `ConfigCapabilities.UsesLiveRates` flag on your `ShippingProviderMetadata`:

- **Flat-rate** (`UsesLiveRates = false`): rates come from the configured `ShippingOption` / `ShippingCost` tables. Selection keys use the `so:{guid}` format. Built-in example: [FlatRateShippingProvider.cs](../../../src/Merchello.Core/Shipping/Providers/BuiltIn/FlatRateShippingProvider.cs).
- **Dynamic / live-rate** (`UsesLiveRates = true`): rates are fetched from a carrier API at checkout time. Selection keys use the `dyn:{providerKey}:{serviceCode}` format. The provider **must not** rely on fixed-cost entries. Visibility is gated by provider enablement *and* the owning warehouse's provider config. `ProductRoot.AllowExternalCarrierShipping = false` blocks dynamic options for that product. Built-in examples: [FedExShippingProvider.cs](../../../src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs), [UpsShippingProvider.cs](../../../src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs).

Both live on the same `ShippingProviderBase`; it's the metadata flag and the source of cost data that differ.

## Minimal Example

```csharp
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;

public class AcmeShippingProvider(
    ICurrencyService currencyService)
    : ShippingProviderBase(currencyService)
{
    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "acme-carrier",                // Unique identifier, never change
        DisplayName = "Acme Carrier",
        Description = "Real-time shipping rates from Acme",
        SupportsRealTimeRates = true,        // This is a live-rate provider
        SupportsInternational = true,
        Icon = "icon-truck"
    };

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        // Quick check: can this provider service this request?
        return !string.IsNullOrEmpty(request.DestinationCountry);
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request,
        CancellationToken cancellationToken = default)
    {
        // Call your carrier API for rates
        var rates = await FetchRatesFromApi(request, cancellationToken);

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = rates.Select(r => new ShippingServiceLevel
            {
                ServiceCode = r.Code,
                ServiceName = r.Name,
                TotalCost = r.Price,
                CurrencyCode = request.CurrencyCode,
                TransitTime = TimeSpan.FromDays(r.EstimatedDays),
                EstimatedDeliveryDate = DateTime.UtcNow.AddDays(r.EstimatedDays)
            }).ToList()
        };
    }
}
```

## Step-by-Step Breakdown

### Step 1: Define Metadata

The `ShippingProviderMetadata` describes your provider's capabilities:

```csharp
public override ShippingProviderMetadata Metadata => new()
{
    Key = "my-carrier",                     // Required. Unique, immutable.
    DisplayName = "My Carrier",             // Required. Shown in backoffice.
    Description = "...",                    // Optional.
    Icon = "icon-truck",                    // Optional. Umbraco icon class.
    IconSvg = "<svg>...</svg>",             // Optional. Takes precedence over Icon.
    SetupInstructions = "## Setup\n...",    // Optional. Markdown.
    SupportsRealTimeRates = true,           // Does this fetch live rates from an API?
    SupportsTracking = false,               // Can it track shipments?
    SupportsLabelGeneration = false,        // Can it generate shipping labels?
    SupportsDeliveryDateSelection = false,  // Can customers pick delivery dates?
    SupportsInternational = true,           // Does it ship internationally?
    RequiresFullAddress = false,            // Does it need full address or just country/postal?
    SupportedCountries = null,              // null = all countries, or ["US", "CA", "GB"]
    RatesIncludeTax = false,                // Are returned rates tax-inclusive? (Unusual)
    ConfigCapabilities = new ProviderConfigCapabilities
    {
        UsesLiveRates = true,               // true = dynamic provider (carrier API)
        RequiresGlobalConfig = true,        // true = API credentials configured once globally
        HasLocationBasedCosts = false,      // true only for flat-rate cost-table providers
        HasWeightTiers = false              // true only for flat-rate weight-tier providers
    }
};
```

> **Tip:** Most carrier APIs return **tax-exclusive** rates. Only set `RatesIncludeTax = true` if your carrier is explicitly configured to return gross rates (this is uncommon for B2B APIs).

> **Note:** `ConfigCapabilities.UsesLiveRates` is what actually routes your provider into the dynamic-rate pipeline (`GetRatesForServicesAsync` + `GetRatesForAllServicesAsync`). `SupportsRealTimeRates` is a UI-facing capability flag only.

### Step 2: Configuration Fields

If your provider needs API keys:

```csharp
public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
    [
        new ProviderConfigurationField
        {
            Key = "apiKey",
            Label = "API Key",
            FieldType = ConfigurationFieldType.Password,
            IsRequired = true,
            IsSensitive = true
        },
        new ProviderConfigurationField
        {
            Key = "accountNumber",
            Label = "Account Number",
            FieldType = ConfigurationFieldType.Text,
            IsRequired = true
        }
    ]);
}
```

Configuration is stored in `Configuration` after `ConfigureAsync()` is called:

```csharp
var apiKey = Configuration?.GetValue("apiKey");
```

### Step 3: Method Config Fields

Per-warehouse shipping method configuration fields appear when staff set up a method in the backoffice:

```csharp
public override ValueTask<IEnumerable<ProviderConfigurationField>> GetMethodConfigFieldsAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
    [
        new ProviderConfigurationField
        {
            Key = "markupPercent",
            Label = "Markup %",
            Description = "Percentage markup to apply to carrier rates",
            FieldType = ConfigurationFieldType.Percentage,
            DefaultValue = "0"
        }
    ]);
}
```

### Step 4: Service Types

If your carrier supports multiple service levels, declare them:

```csharp
public override ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult<IReadOnlyList<ShippingServiceType>>(
    [
        new ShippingServiceType { Code = "GROUND", Name = "Ground Shipping" },
        new ShippingServiceType { Code = "EXPRESS", Name = "Express (2-Day)" },
        new ShippingServiceType { Code = "OVERNIGHT", Name = "Overnight" }
    ]);
}
```

Service types let warehouse administrators enable only specific services per warehouse in the backoffice.

### Step 5: Availability Check

The `IsAvailableFor()` method is a quick, synchronous filter called before the heavier `GetRatesAsync()`:

```csharp
public override bool IsAvailableFor(ShippingQuoteRequest request)
{
    // Don't bother calling the API if we can't service this destination
    if (string.IsNullOrEmpty(request.DestinationCountry))
        return false;

    // Only service specific countries
    if (Metadata.SupportedCountries != null &&
        !Metadata.SupportedCountries.Contains(request.DestinationCountry))
        return false;

    return true;
}
```

### Step 6: Fetch Rates

This is the core method. It receives a `ShippingQuoteRequest` with origin/destination details and package information:

```csharp
public override async Task<ShippingRateQuote?> GetRatesAsync(
    ShippingQuoteRequest request,
    CancellationToken cancellationToken = default)
{
    try
    {
        // Build API request from the ShippingQuoteRequest
        // request.OriginAddress - warehouse address
        // request.DestinationCountry, request.DestinationState, request.DestinationPostal
        // request.Packages - list of ShipmentPackage (weight, dimensions)
        // request.CurrencyCode

        var apiResponse = await CallCarrierApi(request, cancellationToken);

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = apiResponse.Rates.Select(rate => new ShippingServiceLevel
            {
                ServiceCode = rate.ServiceCode,
                ServiceName = rate.ServiceName,
                TotalCost = rate.Amount,
                CurrencyCode = rate.Currency,
                TransitTime = TimeSpan.FromDays(rate.TransitDays),
                EstimatedDeliveryDate = rate.EstimatedDelivery,
                ServiceType = new ShippingServiceType
                {
                    Code = rate.ServiceCode,
                    Name = rate.ServiceName
                }
            }).ToList()
        };
    }
    catch (Exception ex)
    {
        // Return quote with errors rather than throwing
        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = [],
            Errors = [$"Failed to fetch rates: {ex.Message}"]
        };
    }
}
```

### Step 7: Filtered Rates (Optional)

When a warehouse enables only specific service types, `GetRatesForServicesAsync()` is called. The default implementation fetches all rates and filters, but you can override to filter at the API level:

```csharp
public override async Task<ShippingRateQuote?> GetRatesForServicesAsync(
    ShippingQuoteRequest request,
    IReadOnlyList<string> serviceTypes,       // e.g., ["GROUND", "EXPRESS"]
    IReadOnlyList<ShippingOptionSnapshot> shippingOptions,
    CancellationToken cancellationToken = default)
{
    // More efficient: tell the API to only return specific services
    var apiResponse = await CallCarrierApi(request, serviceTypes, cancellationToken);
    // ... build ShippingRateQuote
}
```

### Step 8: Delivery Date Selection (Optional)

If your provider supports customer-selected delivery dates:

```csharp
public override async Task<List<DateTime>> GetAvailableDeliveryDatesAsync(
    ShippingQuoteRequest request,
    ShippingServiceLevel serviceLevel,
    CancellationToken cancellationToken = default)
{
    // Return available delivery dates for the next 14 days
    return Enumerable.Range(1, 14)
        .Select(d => DateTime.UtcNow.Date.AddDays(d))
        .Where(d => d.DayOfWeek != DayOfWeek.Sunday) // No Sunday delivery
        .ToList();
}

public override async Task<decimal> CalculateDeliveryDateSurchargeAsync(
    ShippingQuoteRequest request,
    ShippingServiceLevel serviceLevel,
    DateTime requestedDate,
    CancellationToken cancellationToken = default)
{
    // Saturday delivery costs extra
    return requestedDate.DayOfWeek == DayOfWeek.Saturday ? 5.99m : 0m;
}
```

## Shipping Selection Key Contract

When customers select a shipping option, the selection is stored as a key:

- **Flat-rate:** `so:{guid}` (references a ShippingOption record)
- **Dynamic provider:** `dyn:{providerKey}:{serviceCode}` (e.g., `dyn:fedex:FEDEX_GROUND`)

> **Warning:** This contract is load-bearing and must remain stable. The checkout parses selection keys into `Order.ShippingProviderKey`, `Order.ShippingServiceCode`, and `Order.ShippingServiceName`, and honors rates quoted during the session. Emitting a different format (e.g., swapping the separator, lowercasing the service code) will break order creation and shipping rate reconciliation. Make sure `ServiceCode` values returned from `GetRatesAsync()` are stable across requests so selections survive session refreshes.

## The Markup System

The base class includes `ApplyMarkup()` which applies percentage markups from warehouse configuration to carrier rates. You generally don't need to worry about this -- it's handled automatically by `GetRatesForAllServicesAsync()`.

## Dependency Injection

> **Warning:** Use **constructor injection only**. `ExtensionManager` activates providers via `ActivatorUtilities.CreateInstance`, so setter injection and post-construction configuration hooks are not supported. `ShippingProviderBase` requires `ICurrencyService` through its base constructor -- forward it from your own primary constructor. See [Extension Manager](extension-manager.md).

## Built-in Providers for Reference

| Provider | Location | Notes |
|---|---|---|
| Flat Rate | [FlatRateShippingProvider.cs](../../../src/Merchello.Core/Shipping/Providers/BuiltIn/FlatRateShippingProvider.cs) | Configured rates, no API calls. `UsesLiveRates = false`. |
| FedEx | [FedExShippingProvider.cs](../../../src/Merchello.Core/Shipping/Providers/FedEx/FedExShippingProvider.cs) | Live rates from FedEx API. `UsesLiveRates = true`. |
| UPS | [UpsShippingProvider.cs](../../../src/Merchello.Core/Shipping/Providers/UPS/UpsShippingProvider.cs) | Live rates from UPS API. `UsesLiveRates = true`. |

Base class: [ShippingProviderBase.cs](../../../src/Merchello.Core/Shipping/Providers/ShippingProviderBase.cs). Metadata: [ShippingProviderMetadata.cs](../../../src/Merchello.Core/Shipping/Providers/ShippingProviderMetadata.cs). Capability flags: [ProviderConfigCapabilities.cs](../../../src/Merchello.Core/Shipping/Providers/ProviderConfigCapabilities.cs).
