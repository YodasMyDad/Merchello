namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Immutable metadata describing a shipping provider implementation.
/// </summary>
public record ShippingProviderMetadata
{
    /// <summary>
    /// Unique key identifying this provider (e.g., "flat-rate", "fedex", "ups").
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// Display name shown in the backoffice UI.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional icon class for UI display (e.g., "icon-truck").
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// Brief description of the provider's capabilities.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Markdown-formatted setup instructions displayed in the configuration modal.
    /// </summary>
    public string? SetupInstructions { get; init; }

    /// <summary>
    /// Whether this provider fetches real-time rates from an external API.
    /// </summary>
    public bool SupportsRealTimeRates { get; init; }

    /// <summary>
    /// Whether this provider supports package tracking.
    /// </summary>
    public bool SupportsTracking { get; init; }

    /// <summary>
    /// Whether this provider can generate shipping labels.
    /// </summary>
    public bool SupportsLabelGeneration { get; init; }

    /// <summary>
    /// Whether this provider allows customers to select delivery dates.
    /// </summary>
    public bool SupportsDeliveryDateSelection { get; init; }

    /// <summary>
    /// Whether this provider supports international shipping.
    /// </summary>
    public bool SupportsInternational { get; init; }

    /// <summary>
    /// Whether this provider requires a full address for quotes (false = supports estimate mode with just country/postal).
    /// </summary>
    public bool RequiresFullAddress { get; init; }

    /// <summary>
    /// Countries this provider is available in (null = all countries).
    /// </summary>
    public IReadOnlyCollection<string>? SupportedCountries { get; init; }

    /// <summary>
    /// Configuration capabilities for this provider.
    /// Determines what UI elements are shown when configuring shipping methods.
    /// </summary>
    public ProviderConfigCapabilities ConfigCapabilities { get; init; } = new();

    /// <summary>
    /// If true, rates returned by this provider already include tax (VAT/GST).
    /// The system will NOT add additional shipping tax to these rates.
    /// Default: false (rates are tax-exclusive - this is the standard for FedEx/UPS/DHL).
    /// </summary>
    /// <remarks>
    /// Most carrier APIs return net (tax-exclusive) rates. Only set this to true
    /// if your carrier API is configured to return gross (tax-inclusive) rates,
    /// which is uncommon for B2B shipping APIs.
    /// </remarks>
    public bool RatesIncludeTax { get; init; } = false;
}
