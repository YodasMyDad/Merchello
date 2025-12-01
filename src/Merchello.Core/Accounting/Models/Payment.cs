using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

public class Payment
{
    /// <summary>
    /// Basket Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The invoice id
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// Invoice this order is part of
    /// </summary>
    public Invoice Invoice { get; set; } = default!;

    /// <summary>
    /// Amount of this payment
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Payment method
    /// </summary>
    public string? PaymentMethod { get; set; }

    /// <summary>
    /// Transaction Id
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Details and response from any built in fraud tools
    /// </summary>
    public string? FraudResponse { get; set; }

    /// <summary>
    /// Description about the payment
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this payment was a success
    /// </summary>
    public bool PaymentSuccess { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
