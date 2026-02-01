using Merchello.Core.AddressLookup.Dtos;
using Merchello.Core.AddressLookup.Providers.Interfaces;
using Merchello.Core.AddressLookup.Providers.Models;
using Merchello.Core.AddressLookup.Services.Interfaces;
using Merchello.Core.AddressLookup.Services.Parameters;
using Merchello.Core.Locality.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.AddressLookup.Services;

public class AddressLookupService(
    IAddressLookupProviderManager providerManager,
    ILocalityCatalog localityCatalog,
    ILogger<AddressLookupService> logger) : IAddressLookupService
{
    private const int DefaultMinQueryLength = 3;
    private const int DefaultMaxSuggestions = 6;
    private const int MaxSuggestionsLimit = 20;

    public async Task<AddressLookupClientConfigDto> GetClientConfigAsync(
        GetAddressLookupClientConfigParameters? parameters = null,
        CancellationToken cancellationToken = default)
    {
        var active = await providerManager.GetActiveProviderAsync(cancellationToken);
        if (active == null)
        {
            return new AddressLookupClientConfigDto
            {
                IsEnabled = false,
                MinQueryLength = DefaultMinQueryLength,
                MaxSuggestions = DefaultMaxSuggestions
            };
        }

        var supportedCountries = NormalizeCountryCodes(active.Metadata.SupportedCountries);

        return new AddressLookupClientConfigDto
        {
            IsEnabled = true,
            ProviderAlias = active.Metadata.Alias,
            ProviderName = active.Metadata.DisplayName,
            ProviderDescription = active.Metadata.Description,
            SupportedCountries = supportedCountries,
            MinQueryLength = DefaultMinQueryLength,
            MaxSuggestions = DefaultMaxSuggestions
        };
    }

    public async Task<AddressLookupSuggestionsResult> GetSuggestionsAsync(
        AddressLookupSuggestionsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var active = await providerManager.GetActiveProviderAsync(cancellationToken);
        if (active == null)
        {
            return AddressLookupSuggestionsResult.Fail("Address lookup is not configured.");
        }

        if (string.IsNullOrWhiteSpace(parameters.Query))
        {
            return AddressLookupSuggestionsResult.Fail("Query is required.");
        }

        var trimmedQuery = parameters.Query.Trim();
        if (trimmedQuery.Length < DefaultMinQueryLength)
        {
            return AddressLookupSuggestionsResult.Ok(Array.Empty<AddressLookupSuggestion>());
        }

        if (!IsCountrySupported(active.Metadata, parameters.CountryCode))
        {
            return AddressLookupSuggestionsResult.Fail("Address lookup is not available for the selected country.");
        }

        var limit = parameters.Limit ?? DefaultMaxSuggestions;
        if (limit <= 0)
        {
            limit = DefaultMaxSuggestions;
        }
        if (limit > MaxSuggestionsLimit)
        {
            limit = MaxSuggestionsLimit;
        }

        var request = new AddressLookupSuggestionsRequest
        {
            Query = trimmedQuery,
            CountryCode = parameters.CountryCode,
            Limit = limit,
            SessionId = parameters.SessionId
        };

        try
        {
            var result = await active.Provider.GetSuggestionsAsync(request, cancellationToken);
            if (!result.Success)
            {
                return result;
            }

            var limited = result.Suggestions
                .Take(limit)
                .ToList();

            return AddressLookupSuggestionsResult.Ok(limited);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Address lookup suggestions failed for provider {Alias}", active.Metadata.Alias);
            return AddressLookupSuggestionsResult.Fail("Unable to retrieve address suggestions.");
        }
    }

    public async Task<AddressLookupAddressResult> ResolveAddressAsync(
        AddressLookupResolveParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var active = await providerManager.GetActiveProviderAsync(cancellationToken);
        if (active == null)
        {
            return AddressLookupAddressResult.Fail("Address lookup is not configured.");
        }

        if (string.IsNullOrWhiteSpace(parameters.Id))
        {
            return AddressLookupAddressResult.Fail("Address id is required.");
        }

        if (!IsCountrySupported(active.Metadata, parameters.CountryCode))
        {
            return AddressLookupAddressResult.Fail("Address lookup is not available for the selected country.");
        }

        var request = new AddressLookupResolveRequest
        {
            Id = parameters.Id,
            CountryCode = parameters.CountryCode,
            SessionId = parameters.SessionId
        };

        try
        {
            var result = await active.Provider.GetAddressAsync(request, cancellationToken);
            if (!result.Success || result.Address == null)
            {
                return result;
            }

            var address = result.Address;
            if (!string.IsNullOrWhiteSpace(parameters.CountryCode) && string.IsNullOrWhiteSpace(address.CountryCode))
            {
                address.CountryCode = parameters.CountryCode;
            }

            if (!string.IsNullOrWhiteSpace(address.CountryCode) && string.IsNullOrWhiteSpace(address.Country))
            {
                var countryName = await localityCatalog.TryGetCountryNameAsync(address.CountryCode, cancellationToken);
                if (!string.IsNullOrWhiteSpace(countryName))
                {
                    address.Country = countryName;
                }
            }

            return AddressLookupAddressResult.Ok(address);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Address lookup resolve failed for provider {Alias}", active.Metadata.Alias);
            return AddressLookupAddressResult.Fail("Unable to resolve the selected address.");
        }
    }

    private static bool IsCountrySupported(AddressLookupProviderMetadata metadata, string? countryCode)
    {
        if (metadata.SupportedCountries == null || metadata.SupportedCountries.Count == 0)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return false;
        }

        foreach (var code in metadata.SupportedCountries)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                continue;
            }

            if (code == "*")
            {
                return true;
            }

            if (string.Equals(code, countryCode, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static IReadOnlyCollection<string>? NormalizeCountryCodes(IReadOnlyCollection<string>? countries)
    {
        if (countries == null || countries.Count == 0)
        {
            return countries;
        }

        return countries
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}
