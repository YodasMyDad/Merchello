using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Invoice payment status response
/// </summary>
public class PaymentStatusDto
{
    public Guid InvoiceId { get; set; }
    public InvoicePaymentStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public decimal InvoiceTotal { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal TotalRefunded { get; set; }
    public decimal NetPayment { get; set; }
    public decimal BalanceDue { get; set; }
}
