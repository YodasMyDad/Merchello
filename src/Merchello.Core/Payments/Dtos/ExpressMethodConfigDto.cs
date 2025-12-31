using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Configuration for a specific express checkout method.
/// </summary>
public class ExpressMethodConfigDto
{
    /// <summary>
    /// The provider alias.
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The method alias.
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Display name for the method.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// The method type (ApplePay, GooglePay, etc.).
    /// </summary>
    public PaymentMethodType? MethodType { get; set; }

    /// <summary>
    /// URL to load the provider's JavaScript SDK.
    /// </summary>
    public string? SdkUrl { get; set; }

    /// <summary>
    /// URL to load the provider's adapter script that handles button rendering and payment flow.
    /// The adapter registers with window.MerchelloExpressAdapters.
    /// </summary>
    public string? AdapterUrl { get; set; }

    /// <summary>
    /// Provider-specific SDK configuration.
    /// </summary>
    public Dictionary<string, object>? SdkConfig { get; set; }
}
