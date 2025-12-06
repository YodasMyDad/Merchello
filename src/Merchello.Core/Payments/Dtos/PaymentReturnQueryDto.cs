namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Query parameters for payment return/cancel handling
/// </summary>
public class PaymentReturnQueryDto
{
    /// <summary>
    /// Invoice ID
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Transaction ID from the provider
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Session ID (provider-specific)
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// Provider alias
    /// </summary>
    public string? Provider { get; set; }
}
