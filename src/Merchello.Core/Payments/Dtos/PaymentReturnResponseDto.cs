namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Payment return/cancel response
/// </summary>
public class PaymentReturnResponseDto
{
    /// <summary>
    /// Whether the payment was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Status message
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Invoice ID if available
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Payment ID if payment was recorded
    /// </summary>
    public Guid? PaymentId { get; set; }
}
