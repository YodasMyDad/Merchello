namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to initiate a payment
/// </summary>
public class InitiatePaymentDto
{
    /// <summary>
    /// The payment provider alias to use
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// URL to redirect to after successful payment
    /// </summary>
    public required string ReturnUrl { get; set; }

    /// <summary>
    /// URL to redirect to if payment is cancelled
    /// </summary>
    public required string CancelUrl { get; set; }
}
