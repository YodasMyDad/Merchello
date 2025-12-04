namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Request to create/enable a shipping provider
/// </summary>
public class CreateShippingProviderConfigurationDto
{
    /// <summary>
    /// The provider key to enable
    /// </summary>
    public required string ProviderKey { get; set; }

    /// <summary>
    /// Display name override (optional, defaults to provider's display name)
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether to enable immediately
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Configuration values (key-value pairs)
    /// </summary>
    public Dictionary<string, string>? Configuration { get; set; }
}
