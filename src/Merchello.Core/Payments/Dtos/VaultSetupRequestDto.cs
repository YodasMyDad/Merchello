namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to create a vault setup session for saving a payment method.
/// </summary>
public class VaultSetupRequestDto
{
    /// <summary>
    /// The payment provider alias.
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias (optional).
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Return URL for redirect-based flows.
    /// </summary>
    public string? ReturnUrl { get; set; }

    /// <summary>
    /// Cancel URL for redirect-based flows.
    /// </summary>
    public string? CancelUrl { get; set; }
}
