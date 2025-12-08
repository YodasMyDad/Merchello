namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Shipping provider with metadata and enabled status
/// </summary>
public class ShippingProviderDto
{
    public required string Key { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? Description { get; set; }
    public bool SupportsRealTimeRates { get; set; }
    public bool SupportsTracking { get; set; }
    public bool SupportsLabelGeneration { get; set; }
    public bool SupportsDeliveryDateSelection { get; set; }
    public bool SupportsInternational { get; set; }
    public bool RequiresFullAddress { get; set; }

    /// <summary>
    /// Whether this provider is enabled (has a configuration with IsEnabled = true)
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// The configuration ID if configured
    /// </summary>
    public Guid? ConfigurationId { get; set; }

    /// <summary>
    /// Optional setup instructions/documentation for developers (markdown format)
    /// </summary>
    public string? SetupInstructions { get; set; }

    /// <summary>
    /// Configuration capabilities for this provider.
    /// </summary>
    public ProviderConfigCapabilitiesDto? ConfigCapabilities { get; set; }
}

/// <summary>
/// Configuration capabilities for a shipping provider.
/// </summary>
public class ProviderConfigCapabilitiesDto
{
    /// <summary>
    /// Whether this provider uses location-based cost tables.
    /// </summary>
    public bool HasLocationBasedCosts { get; set; }

    /// <summary>
    /// Whether this provider uses weight tier surcharge tables.
    /// </summary>
    public bool HasWeightTiers { get; set; }

    /// <summary>
    /// Whether this provider fetches rates from an external API.
    /// </summary>
    public bool UsesLiveRates { get; set; }

    /// <summary>
    /// Whether global configuration (API credentials) is required before use.
    /// </summary>
    public bool RequiresGlobalConfig { get; set; }
}

/// <summary>
/// Method configuration info for a shipping provider.
/// </summary>
public class ProviderMethodConfigDto
{
    /// <summary>
    /// Provider key
    /// </summary>
    public required string ProviderKey { get; set; }

    /// <summary>
    /// Display name of the provider
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Configuration fields for per-warehouse shipping method setup
    /// </summary>
    public List<ShippingProviderFieldDto> Fields { get; set; } = [];

    /// <summary>
    /// Provider capabilities for UI rendering
    /// </summary>
    public ProviderConfigCapabilitiesDto Capabilities { get; set; } = new();
}

/// <summary>
/// Provider available for adding shipping methods to a warehouse
/// </summary>
public class AvailableProviderDto
{
    /// <summary>
    /// Provider key
    /// </summary>
    public required string Key { get; set; }

    /// <summary>
    /// Display name
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Icon class
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Provider description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this provider is available (either doesn't require global config or is configured)
    /// </summary>
    public bool IsAvailable { get; set; }

    /// <summary>
    /// Whether this provider requires setup before use (needs global config but not configured yet)
    /// </summary>
    public bool RequiresSetup { get; set; }

    /// <summary>
    /// Provider capabilities
    /// </summary>
    public ProviderConfigCapabilitiesDto Capabilities { get; set; } = new();
}
