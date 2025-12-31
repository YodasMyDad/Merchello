namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to create a PayPal order for the standard Widget payment flow.
/// Called by the PayPal button's createOrder callback.
/// </summary>
public class CreatePayPalOrderDto
{
    /// <summary>
    /// The payment session ID from the payment session creation.
    /// </summary>
    public string? SessionId { get; set; }
}
