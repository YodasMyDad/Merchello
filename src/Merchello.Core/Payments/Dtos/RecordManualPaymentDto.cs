using System.ComponentModel.DataAnnotations;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to record a manual/offline payment
/// </summary>
public class RecordManualPaymentDto
{
    /// <summary>
    /// Payment amount
    /// </summary>
    [Range(0.01, (double)decimal.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }

    /// <summary>
    /// Payment method description (e.g., "Cash", "Check", "Bank Transfer")
    /// </summary>
    public required string PaymentMethod { get; set; }

    /// <summary>
    /// Optional description/notes
    /// </summary>
    [StringLength(500)]
    public string? Description { get; set; }
}
