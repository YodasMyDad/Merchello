namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to update a payment provider setting
/// </summary>
public class UpdatePaymentProviderDto
{
    /// <summary>
    /// Display name override
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether the provider is enabled
    /// </summary>
    public bool? IsEnabled { get; set; }

    /// <summary>
    /// Whether the provider is in test/sandbox mode
    /// </summary>
    public bool? IsTestMode { get; set; }

    /// <summary>
    /// Whether vaulting is enabled for this provider.
    /// Only applies if the provider supports vaulted payments.
    /// </summary>
    public bool? IsVaultingEnabled { get; set; }

    /// <summary>
    /// Configuration values (key-value pairs)
    /// </summary>
    public Dictionary<string, string>? Configuration { get; set; }
}
