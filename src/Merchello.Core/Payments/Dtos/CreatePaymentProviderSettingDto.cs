namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to create/enable a payment provider
/// </summary>
public class CreatePaymentProviderSettingDto
{
    /// <summary>
    /// The provider alias to enable
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// Display name override (optional, defaults to provider's display name)
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether to enable immediately
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Whether the provider is in test/sandbox mode
    /// </summary>
    public bool IsTestMode { get; set; } = true;

    /// <summary>
    /// Configuration values (key-value pairs)
    /// </summary>
    public Dictionary<string, string>? Configuration { get; set; }
}
