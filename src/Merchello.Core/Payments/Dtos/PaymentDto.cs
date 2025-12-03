using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Payment record DTO
/// </summary>
public class PaymentDto
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? PaymentProviderAlias { get; set; }
    public PaymentType PaymentType { get; set; }
    public string? TransactionId { get; set; }
    public string? Description { get; set; }
    public bool PaymentSuccess { get; set; }
    public string? RefundReason { get; set; }
    public Guid? ParentPaymentId { get; set; }
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Child refund payments (if any)
    /// </summary>
    public List<PaymentDto>? Refunds { get; set; }

    /// <summary>
    /// Calculated refundable amount (original amount minus existing refunds)
    /// </summary>
    public decimal RefundableAmount { get; set; }
}
