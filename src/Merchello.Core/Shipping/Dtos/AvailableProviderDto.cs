namespace Merchello.Core.Shipping.Dtos;

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
    /// SVG markup for the provider's brand logo
    /// </summary>
    public string? IconSvg { get; set; }

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
