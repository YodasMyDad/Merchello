# Shipping Provider Development Guide

Guide for third-party developers creating custom shipping providers.

## Quick Start

1. Create .NET Class Library project
2. Reference `Merchello.Core`
3. Implement `IShippingProvider` or extend `ShippingProviderBase`
4. Package as NuGet
5. Install - Merchello auto-discovers via assembly scanning

## Provider Capabilities

| Capability | Description | Example Use Case |
|------------|-------------|------------------|
| `SupportsRealTimeRates` | Fetches live rates from carrier API | FedEx, UPS, DHL |
| `SupportsTracking` | Provides tracking URLs | All major carriers |
| `SupportsLabelGeneration` | Creates shipping labels | Carrier integrations |
| `SupportsDeliveryDateSelection` | Customer picks delivery date | Premium delivery |
| `SupportsInternational` | Handles cross-border shipments | Global carriers |
| `RequiresFullAddress` | Needs complete address (not just postal) | Most carrier APIs |
| `SupportedCountries` | Restrict to specific countries | Regional carriers |

## Configuration Field Types

| Type | Use For |
|------|---------|
| `Text` | API keys, account numbers |
| `Password` | Secrets, tokens (masked in UI) |
| `Textarea` | Multi-line config, JSON |
| `Checkbox` | Boolean flags |
| `Select` | Dropdown options |
| `Url` | Endpoint URLs with validation |

---

## Example 1: FedEx (Real-Time Rates)

```csharp
public class FedExShippingProvider : ShippingProviderBase
{
    private string? _accountNumber;
    private string? _apiKey;
    private string? _secretKey;
    private bool _useProduction;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "fedex",
        DisplayName = "FedEx",
        Icon = "icon-truck",
        Description = "Real-time FedEx shipping rates",
        SupportsRealTimeRates = true,
        SupportsTracking = true,
        SupportsLabelGeneration = true,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = true,
        SetupInstructions = "Create a FedEx Developer account at developer.fedex.com to obtain API credentials."
    };

    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "accountNumber", Label = "Account Number", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "apiKey", Label = "API Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "secretKey", Label = "Secret Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "meterNumber", Label = "Meter Number", FieldType = ConfigurationFieldType.Text, IsRequired = false }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            _accountNumber = settings?.GetValueOrDefault("accountNumber");
            _apiKey = settings?.GetValueOrDefault("apiKey");
            _secretKey = settings?.GetValueOrDefault("secretKey");
        }
        _useProduction = !(config?.IsTestMode ?? true);
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        // FedEx requires full address for accurate rates
        if (request.IsEstimateMode) return false;
        
        // Must have at least one shippable item with weight
        return request.Items.Any(i => i.IsShippable && i.TotalWeightKg > 0);
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return null;

        var fedexRequest = new FedExRateRequest
        {
            AccountNumber = _accountNumber,
            Origin = MapToFedExAddress(request.OriginAddress),
            Destination = MapToFedExAddress(request.DestinationAddress),
            Packages = request.Packages.Select(p => new FedExPackage
            {
                Weight = p.WeightKg,
                Length = p.LengthCm,
                Width = p.WidthCm,
                Height = p.HeightCm
            }).ToList()
        };

        var response = await _fedexClient.GetRatesAsync(fedexRequest, ct);

        var serviceLevels = response.Rates.Select(rate => new ShippingServiceLevel
        {
            ServiceCode = $"fedex-{rate.ServiceType.ToLower()}",
            ServiceName = rate.ServiceName,
            TotalCost = rate.TotalCharge,
            CurrencyCode = rate.Currency,
            TransitTime = TimeSpan.FromDays(rate.TransitDays),
            EstimatedDeliveryDate = rate.DeliveryDate
        }).ToList();

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = serviceLevels
        };
    }
}
```

---

## Example 2: UPS (with Tracking)

```csharp
public class UpsShippingProvider : ShippingProviderBase
{
    private string? _accessKey;
    private string? _userId;
    private string? _password;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "ups",
        DisplayName = "UPS",
        Icon = "icon-truck",
        Description = "UPS shipping rates with tracking support",
        SupportsRealTimeRates = true,
        SupportsTracking = true,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = true
    };

    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new() { Key = "accessKey", Label = "Access Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "userId", Label = "User ID", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "password", Label = "Password", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "accountNumber", Label = "Account Number", FieldType = ConfigurationFieldType.Text, IsRequired = true }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            _accessKey = settings?.GetValueOrDefault("accessKey");
            _userId = settings?.GetValueOrDefault("userId");
            _password = settings?.GetValueOrDefault("password");
        }
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return !request.IsEstimateMode && request.Items.Any(i => i.IsShippable);
    }

    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return null;

        var rates = await _upsClient.GetRatesAsync(/* ... */);

        return new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = rates.Select(r => new ShippingServiceLevel
            {
                ServiceCode = $"ups-{r.ServiceCode}",
                ServiceName = r.ServiceDescription,
                TotalCost = r.TotalCharges,
                CurrencyCode = r.CurrencyCode,
                EstimatedDeliveryDate = r.GuaranteedDeliveryDate,
                ExtendedProperties = new Dictionary<string, string>
                {
                    ["trackingUrlTemplate"] = "https://www.ups.com/track?tracknum={trackingNumber}"
                }
            }).ToList()
        };
    }
}
```

---

## Example 3: Weight-Based Tiered Shipping

```csharp
public class WeightBasedShippingProvider : ShippingProviderBase
{
    private List<WeightTier>? _tiers;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "weight-based",
        DisplayName = "Weight-Based Shipping",
        Icon = "icon-scale",
        Description = "Tiered shipping rates based on total weight",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = false
    };

    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new()
            {
                Key = "tiers",
                Label = "Weight Tiers (JSON)",
                FieldType = ConfigurationFieldType.Textarea,
                IsRequired = true,
                Description = "JSON array: [{\"maxKg\": 1, \"cost\": 5.00}, {\"maxKg\": 5, \"cost\": 10.00}]",
                DefaultValue = "[{\"maxKg\": 1, \"cost\": 5.00}, {\"maxKg\": 5, \"cost\": 10.00}, {\"maxKg\": 20, \"cost\": 15.00}]"
            },
            new()
            {
                Key = "serviceName",
                Label = "Service Name",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                DefaultValue = "Standard Shipping"
            }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            var tiersJson = settings?.GetValueOrDefault("tiers");
            if (!string.IsNullOrEmpty(tiersJson))
            {
                _tiers = JsonSerializer.Deserialize<List<WeightTier>>(tiersJson);
            }
        }
        _tiers ??= [new WeightTier { MaxKg = 100, Cost = 10.00m }];
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return request.Items.Any(i => i.IsShippable);
    }

    public override Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return Task.FromResult<ShippingRateQuote?>(null);

        var totalWeight = request.Items.Sum(i => i.TotalWeightKg ?? 0);
        var tier = _tiers!.OrderBy(t => t.MaxKg).FirstOrDefault(t => totalWeight <= t.MaxKg);
        var cost = tier?.Cost ?? _tiers!.Last().Cost;

        return Task.FromResult<ShippingRateQuote?>(new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "weight-standard",
                    ServiceName = "Standard Shipping",
                    TotalCost = cost,
                    CurrencyCode = request.CurrencyCode ?? "GBP",
                    Description = $"Based on {totalWeight:F2} kg total weight"
                }
            ]
        });
    }

    private record WeightTier
    {
        public decimal MaxKg { get; init; }
        public decimal Cost { get; init; }
    }
}
```

---

## Example 4: Free Shipping (Conditional)

```csharp
public class FreeShippingProvider : ShippingProviderBase
{
    private decimal _minimumOrderValue;
    private string? _excludedCountries;

    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "free-shipping",
        DisplayName = "Free Shipping",
        Icon = "icon-gift",
        Description = "Free shipping for orders over a minimum value",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = false,
        SupportsInternational = true,
        RequiresFullAddress = false
    };

    public override ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<ShippingProviderConfigurationField>>(
        [
            new()
            {
                Key = "minimumOrderValue",
                Label = "Minimum Order Value",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                DefaultValue = "50.00",
                Description = "Orders above this value qualify for free shipping"
            },
            new()
            {
                Key = "excludedCountries",
                Label = "Excluded Countries",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "US,CA,AU",
                Description = "Comma-separated country codes to exclude"
            },
            new()
            {
                Key = "deliveryDays",
                Label = "Estimated Delivery Days",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "5-7"
            }
        ]);
    }

    public override ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct = default)
    {
        if (config?.SettingsJson != null)
        {
            var settings = JsonSerializer.Deserialize<Dictionary<string, string>>(config.SettingsJson);
            if (decimal.TryParse(settings?.GetValueOrDefault("minimumOrderValue"), out var min))
            {
                _minimumOrderValue = min;
            }
            _excludedCountries = settings?.GetValueOrDefault("excludedCountries");
        }
        return ValueTask.CompletedTask;
    }

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        // Check minimum order value
        if (request.ItemsSubtotal < _minimumOrderValue) return false;

        // Check excluded countries
        if (!string.IsNullOrEmpty(_excludedCountries))
        {
            var excluded = _excludedCountries.Split(',').Select(c => c.Trim().ToUpperInvariant());
            if (excluded.Contains(request.CountryCode.ToUpperInvariant())) return false;
        }

        return request.Items.Any(i => i.IsShippable);
    }

    public override Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return Task.FromResult<ShippingRateQuote?>(null);

        return Task.FromResult<ShippingRateQuote?>(new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "free-standard",
                    ServiceName = "Free Shipping",
                    TotalCost = 0,
                    CurrencyCode = request.CurrencyCode ?? "GBP",
                    Description = $"Free shipping on orders over {_minimumOrderValue:C}"
                }
            ]
        });
    }
}
```

---

## Example 5: Delivery Date Selection

```csharp
public class PremiumDeliveryProvider : ShippingProviderBase
{
    public override ShippingProviderMetadata Metadata => new()
    {
        Key = "premium-delivery",
        DisplayName = "Premium Delivery",
        Icon = "icon-calendar",
        Description = "Choose your delivery date",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = true,
        SupportsInternational = false,
        RequiresFullAddress = true,
        SupportedCountries = ["GB"]
    };

    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return request.CountryCode.Equals("GB", StringComparison.OrdinalIgnoreCase)
            && request.Items.Any(i => i.IsShippable);
    }

    public override Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request, CancellationToken ct = default)
    {
        if (!IsAvailableFor(request)) return Task.FromResult<ShippingRateQuote?>(null);

        return Task.FromResult<ShippingRateQuote?>(new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "premium-choose-date",
                    ServiceName = "Choose Your Delivery Date",
                    TotalCost = 4.99m,
                    CurrencyCode = "GBP",
                    Description = "Select a specific delivery date"
                }
            ]
        });
    }

    public override Task<List<DateTime>> GetAvailableDeliveryDatesAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        CancellationToken ct = default)
    {
        var dates = new List<DateTime>();
        var startDate = DateTime.Today.AddDays(2); // Minimum 2 days lead time

        for (var i = 0; i < 14; i++) // Next 14 days
        {
            var date = startDate.AddDays(i);
            // Exclude Sundays
            if (date.DayOfWeek != DayOfWeek.Sunday)
            {
                dates.Add(date);
            }
        }

        return Task.FromResult(dates);
    }

    public override Task<decimal> CalculateDeliveryDateSurchargeAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken ct = default)
    {
        // Saturday delivery surcharge
        if (requestedDate.DayOfWeek == DayOfWeek.Saturday)
        {
            return Task.FromResult(2.00m);
        }

        return Task.FromResult(0m);
    }

    public override Task<bool> ValidateDeliveryDateAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken ct = default)
    {
        // Must be at least 2 days in the future
        if (requestedDate < DateTime.Today.AddDays(2)) return Task.FromResult(false);

        // No Sundays
        if (requestedDate.DayOfWeek == DayOfWeek.Sunday) return Task.FromResult(false);

        // Within 14-day window
        if (requestedDate > DateTime.Today.AddDays(16)) return Task.FromResult(false);

        return Task.FromResult(true);
    }
}
```

---

## Frontend Integration

```typescript
interface ShippingQuote {
  providerKey: string;
  providerName: string;
  serviceLevels: ServiceLevel[];
  errors: string[];
}

interface ServiceLevel {
  serviceCode: string;
  serviceName: string;
  totalCost: number;
  currencyCode: string;
  transitTime?: string;
  estimatedDeliveryDate?: string;
  description?: string;
}

async function getShippingQuotes(basketId: string, countryCode: string, stateCode?: string): Promise<ShippingQuote[]> {
  const params = new URLSearchParams({ countryCode });
  if (stateCode) params.append('stateCode', stateCode);
  
  const response = await fetch(`/api/merchello/checkout/${basketId}/shipping?${params}`);
  return response.json();
}

// Display shipping options
function renderShippingOptions(quotes: ShippingQuote[]) {
  const container = document.getElementById('shipping-options');
  
  quotes.forEach(quote => {
    quote.serviceLevels.forEach(service => {
      const option = document.createElement('div');
      option.className = 'shipping-option';
      option.innerHTML = `
        <label>
          <input type="radio" name="shipping" 
                 value="${quote.providerKey}:${service.serviceCode}"
                 data-cost="${service.totalCost}">
          <span class="service-name">${service.serviceName}</span>
          <span class="service-cost">${formatCurrency(service.totalCost, service.currencyCode)}</span>
          ${service.estimatedDeliveryDate 
            ? `<span class="delivery-date">Est. ${formatDate(service.estimatedDeliveryDate)}</span>` 
            : ''}
        </label>
      `;
      container.appendChild(option);
    });
  });
}

// For providers with delivery date selection
async function getDeliveryDates(basketId: string, providerKey: string, serviceCode: string): Promise<Date[]> {
  const response = await fetch(
    `/api/merchello/checkout/${basketId}/shipping/${providerKey}/${serviceCode}/dates`
  );
  return response.json();
}

async function selectShippingOption(basketId: string, providerKey: string, serviceCode: string, deliveryDate?: string) {
  await fetch(`/api/merchello/checkout/${basketId}/shipping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerKey,
      serviceCode,
      requestedDeliveryDate: deliveryDate
    })
  });
}
```

---

## Notes

- Sensitive config values (API keys) should be encrypted at rest
- Consider caching carrier API responses (rates cached 10 mins by default)
- Use `IsTestMode` from configuration to switch between sandbox/production
- Providers auto-discovered via assembly scanning - no DI registration needed
- Return `null` from `GetRatesAsync` if provider cannot service the request
- Use `ExtendedProperties` for provider-specific data (tracking URL templates, etc.)
- Weight should be in kilograms, dimensions in centimeters
- Always check `IsAvailableFor` before making expensive API calls







