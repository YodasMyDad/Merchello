# Exchange Rate Provider Development Guide

Guide for third-party developers creating custom exchange rate providers.

## Quick Start

1. Create .NET Class Library project
2. Reference `Merchello.Core`
3. Implement `IExchangeRateProvider`
4. Package as NuGet
5. Ensure the host app calls `builder.AddMerchello()`
6. Install or reference the provider assembly so it is included in Merchello's startup assembly scan

## Key Difference from Other Providers

| Provider Type | Enable Model |
|---------------|--------------|
| Shipping | Multiple can be enabled per warehouse |
| Payment | Multiple can be enabled (toggle) |
| **Exchange Rate** | **Only ONE active at a time (radio selection)** |

Only one exchange rate provider can be active. When a user activates a provider, any previously active provider is automatically deactivated.

---

## Provider Interface

```csharp
public interface IExchangeRateProvider
{
    /// <summary>
    /// Provider metadata (alias, display name, icon, etc.)
    /// </summary>
    ExchangeRateProviderMetadata Metadata { get; }

    /// <summary>
    /// Get configuration fields for the backoffice UI (API keys, etc.)
    /// </summary>
    ValueTask<IEnumerable<ExchangeRateProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Configure the provider with saved settings
    /// </summary>
    ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all exchange rates for a base currency
    /// </summary>
    Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a single exchange rate between two currencies
    /// </summary>
    Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default);
}
```

## Provider Metadata

```csharp
public record ExchangeRateProviderMetadata(
    string Alias,              // Unique identifier, e.g., "open-exchange-rates"
    string DisplayName,        // User-friendly name, e.g., "Open Exchange Rates"
    string? Icon,              // Umbraco icon, e.g., "icon-globe"
    string? Description,       // Brief description for backoffice UI
    bool SupportsHistoricalRates,  // Can fetch rates for past dates
    string[] SupportedCurrencies); // Empty = all currencies supported
```

## Configuration Field Types

| Type | Use For |
|------|---------|
| `Text` | API keys, account IDs |
| `Password` | Secrets, tokens (masked in UI) |
| `Textarea` | Multi-line config, JSON |
| `Checkbox` | Boolean flags |
| `Select` | Dropdown options |
| `Url` | API endpoint URLs with validation |

## Result Types

```csharp
public record ExchangeRateResult(
    bool Success,                        // Whether the fetch succeeded
    string BaseCurrency,                 // The base currency code (e.g., "USD")
    Dictionary<string, decimal> Rates,   // Currency code -> rate mapping
    DateTime TimestampUtc,               // When rates were fetched
    string? ErrorMessage);               // Error details if Success = false
```

---

## Example 1: Free Provider (No Configuration)

```csharp
public class FrankfurterExchangeRateProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<FrankfurterExchangeRateProvider> logger) : IExchangeRateProvider
{
    private const string BaseUrl = "https://api.frankfurter.dev/v1";
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "frankfurter",
        DisplayName: "Frankfurter (ECB Rates)",
        Icon: "icon-globe",
        Description: "Free exchange rates from the European Central Bank via frankfurter.dev",
        SupportsHistoricalRates: true,
        SupportedCurrencies: []);

    // No configuration needed for free API
    public ValueTask<IEnumerable<ExchangeRateProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
        => ValueTask.FromResult<IEnumerable<ExchangeRateProviderConfigurationField>>([]);

    public ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
        => ValueTask.CompletedTask;

    public async Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(baseCurrency))
        {
            return new ExchangeRateResult(false, "", new(), DateTime.UtcNow, "Base currency is required.");
        }

        try
        {
            var response = await _httpClient.GetAsync(
                $"{BaseUrl}/latest?base={Uri.EscapeDataString(baseCurrency.ToUpperInvariant())}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return new ExchangeRateResult(
                    false,
                    baseCurrency.ToUpperInvariant(),
                    new(),
                    DateTime.UtcNow,
                    $"API returned {response.StatusCode}");
            }

            var data = await response.Content.ReadFromJsonAsync<FrankfurterResponse>(
                cancellationToken: cancellationToken);

            if (data?.Rates == null || string.IsNullOrWhiteSpace(data.Base))
            {
                return new ExchangeRateResult(false, baseCurrency.ToUpperInvariant(), new(), DateTime.UtcNow, "Invalid response.");
            }

            var timestampUtc = DateTime.UtcNow;
            if (DateTime.TryParse(data.Date, out var parsedDate))
            {
                timestampUtc = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
            }

            return new ExchangeRateResult(
                true,
                data.Base.ToUpperInvariant(),
                data.Rates,
                timestampUtc,
                null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogWarning(ex, "Frankfurter GetRatesAsync failed for base {BaseCurrency}", baseCurrency);
            return new ExchangeRateResult(false, baseCurrency.ToUpperInvariant(), new(), DateTime.UtcNow, ex.Message);
        }
    }

    public async Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fromCurrency) || string.IsNullOrWhiteSpace(toCurrency))
        {
            return null;
        }

        // Same currency = 1:1 rate
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return 1m;
        }

        try
        {
            var from = Uri.EscapeDataString(fromCurrency.ToUpperInvariant());
            var to = Uri.EscapeDataString(toCurrency.ToUpperInvariant());
            var response = await _httpClient.GetAsync($"{BaseUrl}/latest?base={from}&symbols={to}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var data = await response.Content.ReadFromJsonAsync<FrankfurterResponse>(cancellationToken: cancellationToken);
            return data?.Rates?.GetValueOrDefault(toCurrency.ToUpperInvariant());
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogWarning(ex, "Frankfurter GetRateAsync failed for {From}->{To}", fromCurrency, toCurrency);
            return null;
        }
    }

    private record FrankfurterResponse(string Base, string Date, Dictionary<string, decimal> Rates);
}
```

---

## Example 2: Commercial Provider (With API Key)

```csharp
public class OpenExchangeRatesProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<OpenExchangeRatesProvider> logger) : IExchangeRateProvider
{
    private const string BaseUrl = "https://openexchangerates.org/api";
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    private string? _appId;

    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "open-exchange-rates",
        DisplayName: "Open Exchange Rates",
        Icon: "icon-coins-dollar-alt",
        Description: "Real-time and historical exchange rates from openexchangerates.org. Requires API key.",
        SupportsHistoricalRates: true,
        SupportedCurrencies: []);

    public ValueTask<IEnumerable<ExchangeRateProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ExchangeRateProviderConfigurationField>>(
        [
            new()
            {
                Key = "appId",
                Label = "App ID",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Description = "Your Open Exchange Rates App ID from openexchangerates.org",
                Placeholder = "Enter your App ID"
            },
            new()
            {
                Key = "useHttps",
                Label = "Use HTTPS",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "true",
                Description = "HTTPS is required for paid plans"
            }
        ]);
    }

    public ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        _appId = configuration?.GetValue("appId");
        return ValueTask.CompletedTask;
    }

    public async Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_appId))
        {
            return new ExchangeRateResult(false, baseCurrency, new(), DateTime.UtcNow, "App ID not configured.");
        }

        if (string.IsNullOrWhiteSpace(baseCurrency))
        {
            return new ExchangeRateResult(false, "", new(), DateTime.UtcNow, "Base currency is required.");
        }

        try
        {
            // Note: Free plan only supports USD as base currency
            var url = $"{BaseUrl}/latest.json?app_id={_appId}&base={baseCurrency.ToUpperInvariant()}";
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning("Open Exchange Rates API error: {StatusCode} - {Body}",
                    response.StatusCode, errorBody);
                return new ExchangeRateResult(
                    false,
                    baseCurrency.ToUpperInvariant(),
                    new(),
                    DateTime.UtcNow,
                    $"API returned {response.StatusCode}");
            }

            var data = await response.Content.ReadFromJsonAsync<OxrResponse>(cancellationToken: cancellationToken);

            if (data?.Rates == null)
            {
                return new ExchangeRateResult(false, baseCurrency.ToUpperInvariant(), new(), DateTime.UtcNow, "Invalid response.");
            }

            var timestamp = DateTimeOffset.FromUnixTimeSeconds(data.Timestamp).UtcDateTime;

            return new ExchangeRateResult(
                true,
                data.Base?.ToUpperInvariant() ?? baseCurrency.ToUpperInvariant(),
                data.Rates,
                timestamp,
                null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Open Exchange Rates GetRatesAsync failed for base {BaseCurrency}", baseCurrency);
            return new ExchangeRateResult(false, baseCurrency.ToUpperInvariant(), new(), DateTime.UtcNow, ex.Message);
        }
    }

    public async Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return 1m;
        }

        var result = await GetRatesAsync(fromCurrency, cancellationToken);
        if (!result.Success)
        {
            return null;
        }

        return result.Rates.GetValueOrDefault(toCurrency.ToUpperInvariant());
    }

    private record OxrResponse(
        string? Disclaimer,
        string? License,
        long Timestamp,
        string? Base,
        Dictionary<string, decimal> Rates);
}
```

---

## Example 3: Provider with Multiple Configuration Options

```csharp
public class CurrencyLayerProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<CurrencyLayerProvider> logger) : IExchangeRateProvider
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    private string? _accessKey;
    private bool _useHttps;
    private string _source = "USD";

    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "currency-layer",
        DisplayName: "Currency Layer",
        Icon: "icon-layers",
        Description: "Real-time exchange rates from currencylayer.com. Supports 168 currencies.",
        SupportsHistoricalRates: true,
        SupportedCurrencies: []);

    public ValueTask<IEnumerable<ExchangeRateProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ExchangeRateProviderConfigurationField>>(
        [
            new()
            {
                Key = "accessKey",
                Label = "Access Key",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Description = "Your currencylayer.com API access key"
            },
            new()
            {
                Key = "useHttps",
                Label = "Use HTTPS (Paid Plans Only)",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "false",
                Description = "Enable HTTPS for API requests. Requires a paid subscription."
            },
            new()
            {
                Key = "source",
                Label = "Source Currency",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "USD",
                Description = "Default source currency (free plan only supports USD)"
            },
            new()
            {
                Key = "cacheMinutes",
                Label = "Cache Duration (Minutes)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "60",
                Description = "How long to cache rates locally (reduces API calls)"
            }
        ]);
    }

    public ValueTask ConfigureAsync(
        ExchangeRateProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        _accessKey = configuration?.GetValue("accessKey");
        _useHttps = string.Equals(configuration?.GetValue("useHttps"), "true", StringComparison.OrdinalIgnoreCase);
        _source = configuration?.GetValue("source") ?? "USD";
        return ValueTask.CompletedTask;
    }

    public async Task<ExchangeRateResult> GetRatesAsync(
        string baseCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_accessKey))
        {
            return new ExchangeRateResult(false, baseCurrency, new(), DateTime.UtcNow, "Access key not configured.");
        }

        try
        {
            var protocol = _useHttps ? "https" : "http";
            var url = $"{protocol}://apilayer.net/api/live?access_key={_accessKey}&source={baseCurrency.ToUpperInvariant()}";

            var response = await _httpClient.GetAsync(url, cancellationToken);
            var data = await response.Content.ReadFromJsonAsync<CurrencyLayerResponse>(cancellationToken: cancellationToken);

            if (data?.Success != true)
            {
                return new ExchangeRateResult(
                    false,
                    baseCurrency.ToUpperInvariant(),
                    new(),
                    DateTime.UtcNow,
                    data?.Error?.Info ?? "Unknown error");
            }

            // Currency Layer returns rates prefixed with source currency, e.g., "USDEUR"
            // We need to strip the prefix to get just the target currency code
            var normalizedRates = new Dictionary<string, decimal>();
            var prefix = data.Source?.ToUpperInvariant() ?? baseCurrency.ToUpperInvariant();

            foreach (var (key, value) in data.Quotes ?? new())
            {
                if (key.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    var targetCurrency = key[prefix.Length..];
                    normalizedRates[targetCurrency] = value;
                }
            }

            var timestamp = DateTimeOffset.FromUnixTimeSeconds(data.Timestamp).UtcDateTime;

            return new ExchangeRateResult(
                true,
                prefix,
                normalizedRates,
                timestamp,
                null);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "CurrencyLayer GetRatesAsync failed for base {BaseCurrency}", baseCurrency);
            return new ExchangeRateResult(false, baseCurrency.ToUpperInvariant(), new(), DateTime.UtcNow, ex.Message);
        }
    }

    public async Task<decimal?> GetRateAsync(
        string fromCurrency,
        string toCurrency,
        CancellationToken cancellationToken = default)
    {
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return 1m;
        }

        var result = await GetRatesAsync(fromCurrency, cancellationToken);
        return result.Success ? result.Rates.GetValueOrDefault(toCurrency.ToUpperInvariant()) : null;
    }

    private record CurrencyLayerResponse(
        bool Success,
        string? Terms,
        string? Privacy,
        long Timestamp,
        string? Source,
        Dictionary<string, decimal>? Quotes,
        CurrencyLayerError? Error);

    private record CurrencyLayerError(int Code, string? Type, string? Info);
}
```

---

## How Merchello Uses Exchange Rates

Exchange rates are used internally by Merchello for:

1. **Multi-Currency Checkout**: Converting basket totals when customer currency differs from store currency
2. **Live Shipping Rates**: Converting carrier rates (often in USD) to customer's currency
3. **Reporting**: Converting historical orders to a common currency for analytics

### Rate Caching

Rates are cached via `IExchangeRateCache` with configurable duration (default: 1 hour). The cache:
- Stores the full rate snapshot from the active provider
- Supports cross-rate calculation (e.g., GBP→EUR via GBP→USD→EUR)
- Auto-refreshes on cache expiry
- Can be manually refreshed via backoffice

### Cross-Rate Calculation

When a direct rate isn't available, the cache calculates cross-rates:

```
GBP → EUR = (GBP → USD) × (USD → EUR)
         = 0.80 × 1.10 = 0.88
```

This happens automatically - providers only need to return rates relative to their base currency.

---

## Testing Your Provider

The backoffice includes a **Test** button for exchange rate providers. When clicked:

1. Calls `GetRatesAsync()` with the store's base currency
2. Shows success/failure status
3. Displays sample rates (common currencies like EUR, GBP, JPY)
4. Shows rate timestamp and total available currencies

### Test Modal Shows

- **Success/Failure**: Did the API call succeed?
- **Base Currency**: Which currency rates are relative to
- **Sample Rates**: 10 common currency conversions
- **Rate Timestamp**: When the provider reports rates were last updated
- **Total Rates**: How many currencies are available

---

## Backoffice Integration

Exchange rate providers appear in **Merchello → Settings → Providers → Exchange Rates**:

```
┌─────────────────────────────────────────────────────────────┐
│ Current Status                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Active: Frankfurter (ECB Rates)                         │ │
│ │ Base Currency: USD                                       │ │
│ │ Last Updated: Dec 13, 2025 2:30 PM                      │ │
│ │ Rates: 32 currencies                     [Refresh Now]  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Available Providers                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ● Frankfurter (ECB Rates)              [Test] [Config]  │ │
│ │   Free exchange rates from the ECB                      │ │
│ │   ✓ Active                                              │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ○ Open Exchange Rates                   [Test] [Config] │ │
│ │   Commercial rates with 168 currencies                  │ │
│ │   Requires API key                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependency Injection

Providers can use constructor injection for required services:

```csharp
public class MyExchangeRateProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<MyExchangeRateProvider> logger,
    IMemoryCache cache) : IExchangeRateProvider
{
    // ...
}
```

Common injected services:
- `IHttpClientFactory` - For HTTP requests to external APIs
- `ILogger<T>` - For logging errors and warnings
- `IMemoryCache` - For local caching (if needed beyond Merchello's cache)
- `IOptions<T>` - For accessing configuration

---

## Best Practices

### Error Handling

```csharp
public async Task<ExchangeRateResult> GetRatesAsync(string baseCurrency, CancellationToken ct)
{
    try
    {
        // API call...
    }
    catch (HttpRequestException ex)
    {
        logger.LogWarning(ex, "HTTP error fetching rates");
        return new ExchangeRateResult(false, baseCurrency, new(), DateTime.UtcNow, "Network error");
    }
    catch (TaskCanceledException ex) when (ex.CancellationToken == ct)
    {
        // Request was cancelled - rethrow
        throw;
    }
    catch (TaskCanceledException ex)
    {
        logger.LogWarning(ex, "Request timeout");
        return new ExchangeRateResult(false, baseCurrency, new(), DateTime.UtcNow, "Request timeout");
    }
    catch (JsonException ex)
    {
        logger.LogWarning(ex, "Invalid JSON response");
        return new ExchangeRateResult(false, baseCurrency, new(), DateTime.UtcNow, "Invalid response format");
    }
}
```

### Currency Code Normalization

Always normalize currency codes to uppercase:

```csharp
baseCurrency = baseCurrency?.ToUpperInvariant() ?? "USD";
```

### Same Currency Check

Always handle same-currency requests efficiently:

```csharp
public async Task<decimal?> GetRateAsync(string from, string to, CancellationToken ct)
{
    if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
    {
        return 1m;
    }
    // ... fetch from API
}
```

### Rate Validation

Validate rates before returning:

```csharp
// Filter out invalid rates
var validRates = apiRates
    .Where(r => r.Value > 0 && r.Value < 1_000_000) // Sanity check
    .ToDictionary(r => r.Key.ToUpperInvariant(), r => r.Value);
```

---

## Notes

- Providers are discovered via `ExtensionManager` from the assemblies captured by `AddMerchello(...)`; no explicit provider DI registration is required
- Only one provider can be active at a time (radio button selection in UI)
- Sensitive config values (API keys) are stored encrypted at rest
- Consider rate limiting to avoid exceeding API quotas
- Return meaningful error messages - they're shown in the backoffice Test modal
- The `SupportedCurrencies` array can be empty to indicate "all currencies supported"
- Use `IHttpClientFactory` instead of creating `HttpClient` instances directly
- Always log warnings for API failures to help with troubleshooting
