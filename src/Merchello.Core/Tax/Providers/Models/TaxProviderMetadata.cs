namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Metadata describing a tax provider's capabilities and display information.
/// </summary>
public record TaxProviderMetadata(
    string Alias,
    string DisplayName,
    string? Icon,
    string? Description,
    bool SupportsRealTimeCalculation,
    bool RequiresApiCredentials,
    string? SetupInstructions = null,
    string? IconSvg = null);
