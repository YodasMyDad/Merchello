namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Metadata describing an address lookup provider's capabilities and display information.
/// </summary>
public record AddressLookupProviderMetadata(
    string Alias,
    string DisplayName,
    string? Icon,
    string? Description,
    bool RequiresApiCredentials,
    IReadOnlyCollection<string>? SupportedCountries = null,
    string? SetupInstructions = null,
    string? IconSvg = null);
