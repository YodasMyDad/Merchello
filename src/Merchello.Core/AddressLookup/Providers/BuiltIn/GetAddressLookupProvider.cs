using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Merchello.Core.AddressLookup.Providers.Models;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.AddressLookup.Providers.BuiltIn;

public class GetAddressLookupProvider(
    IHttpClientFactory httpClientFactory,
    ILogger<GetAddressLookupProvider> logger) : AddressLookupProviderBase
{
    private const string BaseUrl = "https://api.getAddress.io";
    private const string ApiKeyField = "apiKey";
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    public override AddressLookupProviderMetadata Metadata => new(
        Alias: "getaddress",
        DisplayName: "getAddress",
        Icon: "icon-map-location",
        Description: "UK address lookup powered by getAddress",
        RequiresApiCredentials: true,
        SupportedCountries: ["GB"],
        SetupInstructions: "Add your getAddress API key or domain token to enable UK address lookup.");

    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = ApiKeyField,
                Label = "API Key",
                Description = "Your getAddress API key or domain token.",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = true,
                IsSensitive = true,
                Placeholder = "key_1234567890abcdef"
            }
        ]);
    }

    public override async Task<AddressLookupSuggestionsResult> GetSuggestionsAsync(
        AddressLookupSuggestionsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return AddressLookupSuggestionsResult.Fail("Query is required.");
        }

        string apiKey;
        try
        {
            apiKey = GetRequiredConfigValue(ApiKeyField);
        }
        catch (Exception ex)
        {
            return AddressLookupSuggestionsResult.Fail(ex.Message);
        }

        try
        {
            var url = $"{BaseUrl}/autocomplete/{Uri.EscapeDataString(request.Query)}?api-key={Uri.EscapeDataString(apiKey)}";
            if (request.Limit.HasValue && request.Limit.Value > 0)
            {
                url += $"&top={request.Limit.Value}";
            }

            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return AddressLookupSuggestionsResult.Fail($"API returned {response.StatusCode}");
            }

            var data = await response.Content.ReadFromJsonAsync<GetAddressAutocompleteResponse>(cancellationToken: cancellationToken);
            if (data?.Suggestions == null)
            {
                return AddressLookupSuggestionsResult.Fail("Invalid response from provider.");
            }

            var suggestions = data.Suggestions
                .Where(s => !string.IsNullOrWhiteSpace(s.Id))
                .Select(s => new AddressLookupSuggestion(s.Id!, s.Address ?? s.Id!))
                .ToList();

            return AddressLookupSuggestionsResult.Ok(suggestions);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogWarning(ex, "getAddress autocomplete failed for query {Query}", request.Query);
            return AddressLookupSuggestionsResult.Fail(ex.Message);
        }
    }

    public override async Task<AddressLookupAddressResult> GetAddressAsync(
        AddressLookupResolveRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
        {
            return AddressLookupAddressResult.Fail("Address id is required.");
        }

        string apiKey;
        try
        {
            apiKey = GetRequiredConfigValue(ApiKeyField);
        }
        catch (Exception ex)
        {
            return AddressLookupAddressResult.Fail(ex.Message);
        }

        try
        {
            var url = $"{BaseUrl}/get/{Uri.EscapeDataString(request.Id)}?api-key={Uri.EscapeDataString(apiKey)}";
            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return AddressLookupAddressResult.Fail($"API returned {response.StatusCode}");
            }

            var data = await response.Content.ReadFromJsonAsync<GetAddressAddressResponse>(cancellationToken: cancellationToken);
            if (data == null)
            {
                return AddressLookupAddressResult.Fail("Invalid response from provider.");
            }

            var formattedLines = data.FormattedAddress
                ?.Where(line => !string.IsNullOrWhiteSpace(line))
                .Select(line => line.Trim())
                .ToList() ?? [];

            var address1 = string.IsNullOrWhiteSpace(data.Line1)
                ? formattedLines.FirstOrDefault()
                : data.Line1?.Trim();

            var address2 = BuildSecondaryAddress(data.Line2, data.Line3, data.Line4);
            if (string.IsNullOrWhiteSpace(address2) && formattedLines.Count > 1)
            {
                address2 = string.Join(", ", formattedLines.Skip(1));
            }

            var address = new AddressLookupAddress
            {
                AddressOne = address1,
                AddressTwo = address2,
                TownCity = data.TownOrCity?.Trim(),
                CountyState = data.County?.Trim(),
                PostalCode = data.Postcode?.Trim(),
                Country = data.Country?.Trim(),
                CountryCode = request.CountryCode
            };

            return AddressLookupAddressResult.Ok(address);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogWarning(ex, "getAddress resolve failed for id {Id}", request.Id);
            return AddressLookupAddressResult.Fail(ex.Message);
        }
    }

    public override async Task<AddressLookupProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default)
    {
        string apiKey;
        try
        {
            apiKey = GetRequiredConfigValue(ApiKeyField);
        }
        catch (Exception ex)
        {
            return AddressLookupProviderValidationResult.Invalid(ex.Message);
        }

        try
        {
            var url = $"{BaseUrl}/autocomplete/EC1A?api-key={Uri.EscapeDataString(apiKey)}&top=1";
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return AddressLookupProviderValidationResult.Invalid($"API returned {response.StatusCode}");
            }

            return AddressLookupProviderValidationResult.Valid();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogWarning(ex, "getAddress validation failed");
            return AddressLookupProviderValidationResult.Invalid(ex.Message);
        }
    }

    private static string? BuildSecondaryAddress(params string?[] lines)
    {
        var segments = lines
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(line => line!.Trim())
            .ToList();

        return segments.Count == 0 ? null : string.Join(", ", segments);
    }
}
