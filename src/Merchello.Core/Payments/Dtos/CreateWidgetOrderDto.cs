namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to create a widget order for payment flows that use the create-order/capture pattern.
/// Used by providers like PayPal, Klarna, and other BNPL solutions.
/// </summary>
public class CreateWidgetOrderDto
{
    /// <summary>
    /// The payment session ID from the payment session creation.
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// Optional method alias to use for the payment.
    /// If not provided, defaults to the provider's primary method.
    /// </summary>
    public string? MethodAlias { get; set; }
}
