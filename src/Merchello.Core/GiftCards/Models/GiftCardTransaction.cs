using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.GiftCards.Models;

public class GiftCardTransaction
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid GiftCardId { get; set; }
    public virtual GiftCard? GiftCard { get; set; }

    public GiftCardTransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }

    // Reference to related entities
    public Guid? InvoiceId { get; set; }
    public Guid? PaymentId { get; set; }
    public Guid? ReturnId { get; set; }

    public string? Description { get; set; }
    public string? TransactionReference { get; set; }
    public string? PerformedBy { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
