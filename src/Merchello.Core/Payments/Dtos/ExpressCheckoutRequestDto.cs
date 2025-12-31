namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to process an express checkout payment from the frontend.
/// </summary>
public class ExpressCheckoutRequestDto
{
    /// <summary>
    /// The payment provider alias (e.g., "stripe", "paypal").
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias (e.g., "applepay", "googlepay").
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Payment token or authorization from the provider SDK.
    /// </summary>
    public required string PaymentToken { get; set; }

    /// <summary>
    /// Customer data returned by the express checkout provider.
    /// </summary>
    public required ExpressCheckoutCustomerDataDto CustomerData { get; set; }

    /// <summary>
    /// Optional provider-specific data from the SDK callback.
    /// </summary>
    public Dictionary<string, string>? ProviderData { get; set; }
}
