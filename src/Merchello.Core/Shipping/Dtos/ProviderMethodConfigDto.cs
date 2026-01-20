namespace Merchello.Core.Shipping.Dtos;

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
