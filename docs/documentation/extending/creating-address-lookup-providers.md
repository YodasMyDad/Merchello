# Creating Custom Address Lookup Providers

Address lookup providers power the address autocomplete and validation features in Merchello's checkout. Merchello ships with a built-in getAddress.io provider for UK addresses, but you can create your own for services like Google Places, Loqate, SmartyStreets, or any regional address API.

## Quick Overview

To create an address lookup provider, you need to:

1. Create a class that extends `AddressLookupProviderBase`
2. Implement `Metadata`, `GetSuggestionsAsync()`, and `GetAddressAsync()`
3. Optionally implement `ValidateConfigurationAsync()` to test API credentials

## How It Works

The address lookup flow is a two-step process:

```
1. Customer types in the address box
   -> GetSuggestionsAsync() returns a list of matching suggestions

2. Customer selects a suggestion
   -> GetAddressAsync() resolves the selected suggestion into a full address
```

## Full Example

```csharp
using Merchello.Core.AddressLookup.Providers;
using Merchello.Core.AddressLookup.Providers.Models;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

public class AcmeAddressProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<AcmeAddressProvider> logger) : AddressLookupProviderBase
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    // 1. Metadata
    public override AddressLookupProviderMetadata Metadata => new(
        Alias: "acme-address",                // Unique, immutable
        DisplayName: "Acme Address Lookup",
        Icon: "icon-map-location",
        Description: "Address autocomplete powered by Acme",
        RequiresApiCredentials: true,
        SupportedCountries: null,              // null = all countries, or ["US", "CA"]
        SetupInstructions: "Enter your Acme API key to enable address lookup."
    );

    // 2. Configuration fields
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
                IsSensitive = true,
                Placeholder = "your-api-key"
            }
        ]);
    }

    // 3. Get suggestions (autocomplete)
    public override async Task<AddressLookupSuggestionsResult> GetSuggestionsAsync(
        AddressLookupSuggestionsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return AddressLookupSuggestionsResult.Fail("Query is required.");

        try
        {
            var apiKey = GetRequiredConfigValue("apiKey");
            var url = $"https://api.acme.com/suggest?q={Uri.EscapeDataString(request.Query)}&key={apiKey}";

            if (request.Limit.HasValue)
                url += $"&limit={request.Limit.Value}";

            if (!string.IsNullOrEmpty(request.CountryCode))
                url += $"&country={request.CountryCode}";

            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return AddressLookupSuggestionsResult.Fail($"API returned {response.StatusCode}");

            var data = await response.Content.ReadFromJsonAsync<AcmeSuggestResponse>(
                cancellationToken: cancellationToken);

            var suggestions = data!.Results
                .Select(r => new AddressLookupSuggestion(
                    Id: r.PlaceId,             // Unique ID to resolve later
                    DisplayText: r.Description  // Shown in the dropdown
                ))
                .ToList();

            return AddressLookupSuggestionsResult.Ok(suggestions);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Address suggestions failed for query {Query}", request.Query);
            return AddressLookupSuggestionsResult.Fail(ex.Message);
        }
    }

    // 4. Resolve a suggestion into a full address
    public override async Task<AddressLookupAddressResult> GetAddressAsync(
        AddressLookupResolveRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
            return AddressLookupAddressResult.Fail("Address ID is required.");

        try
        {
            var apiKey = GetRequiredConfigValue("apiKey");
            var url = $"https://api.acme.com/resolve/{Uri.EscapeDataString(request.Id)}?key={apiKey}";

            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return AddressLookupAddressResult.Fail($"API returned {response.StatusCode}");

            var data = await response.Content.ReadFromJsonAsync<AcmeAddressResponse>(
                cancellationToken: cancellationToken);

            // Map to Merchello's canonical address field names
            var address = new AddressLookupAddress
            {
                AddressOne = data!.Line1,           // NOT "address1" or "street"
                AddressTwo = data.Line2,             // NOT "line2"
                TownCity = data.City,                // NOT "city" or "locality"
                CountyState = data.State,            // NOT "state" or "province"
                PostalCode = data.PostalCode,
                Country = data.CountryName,
                CountryCode = request.CountryCode    // Pass through from the request
            };

            return AddressLookupAddressResult.Ok(address);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Address resolve failed for id {Id}", request.Id);
            return AddressLookupAddressResult.Fail(ex.Message);
        }
    }

    // 5. Validate configuration (optional but recommended)
    public override async Task<AddressLookupProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var apiKey = GetRequiredConfigValue("apiKey");

            // Make a lightweight test call
            var url = $"https://api.acme.com/suggest?q=test&key={apiKey}&limit=1";
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
                return AddressLookupProviderValidationResult.Invalid($"API returned {response.StatusCode}");

            return AddressLookupProviderValidationResult.Valid();
        }
        catch (Exception ex)
        {
            return AddressLookupProviderValidationResult.Invalid(ex.Message);
        }
    }
}
```

## Address Field Naming

When mapping external API responses to `AddressLookupAddress`, use Merchello's canonical field names:

| Merchello Field | What It Means | NOT |
|---|---|---|
| `AddressOne` | First line of street address | `address1`, `line1`, `street` |
| `AddressTwo` | Second line (apt, suite, etc.) | `address2`, `line2` |
| `TownCity` | City/town name | `city`, `locality` |
| `CountyState` | State, county, or province | `state`, `county`, `province` |
| `PostalCode` | ZIP/postal code | `zip`, `zipCode` |
| `Country` | Full country name | -- |
| `CountryCode` | ISO 2-letter code | -- |

> **Warning:** Using incorrect field names will cause mismatches between backend and frontend. Always use the canonical names from the table above.

## Base Class Helpers

`AddressLookupProviderBase` provides these helper methods for working with configuration:

```csharp
// Get a config value (returns null if missing)
var value = GetConfigValue("apiKey");

// Get a required value (throws if missing)
var required = GetRequiredConfigValue("apiKey");

// Get typed values
var enabled = GetConfigBool("enabled", defaultValue: true);
var limit = GetConfigInt("maxResults", defaultValue: 10);
```

## API Controller

Merchello exposes address lookup functionality through `AddressLookupProvidersApiController`, which handles:

- Listing available providers and their configuration
- Proxying suggestion and resolve requests to the active provider
- Provider configuration management

You don't need to create any controllers -- your provider is called automatically.

## Dependency Injection

> **Warning:** Use **constructor injection only**. `ExtensionManager` activates address lookup providers via `ActivatorUtilities.CreateInstance`; setter injection and post-construction configuration hooks are not supported. See [Extension Manager](extension-manager.md).

## Built-in Provider for Reference

| Provider | Location | Notes |
|---|---|---|
| getAddress | [GetAddressLookupProvider.cs](../../../src/Merchello.Core/AddressLookup/Providers/BuiltIn/GetAddressLookupProvider.cs) | UK address lookup, uses getAddress.io API |

Base class: [AddressLookupProviderBase.cs](../../../src/Merchello.Core/AddressLookup/Providers/AddressLookupProviderBase.cs). Interface: [IAddressLookupProvider.cs](../../../src/Merchello.Core/AddressLookup/Providers/Interfaces/IAddressLookupProvider.cs).
