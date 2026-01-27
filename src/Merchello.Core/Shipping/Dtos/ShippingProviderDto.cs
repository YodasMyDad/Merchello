namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Shipping provider with metadata and enabled status
/// </summary>
public class ShippingProviderDto
{
    public required string Key { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? IconSvg { get; set; }
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
