namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to record a manual/offline payment
/// </summary>
public class RecordManualPaymentDto
{
    /// <summary>
    /// Payment amount
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Payment method description (e.g., "Cash", "Check", "Bank Transfer")
    /// </summary>
    public required string PaymentMethod { get; set; }

    /// <summary>
    /// Optional description/notes
    /// </summary>
    public string? Description { get; set; }
}
