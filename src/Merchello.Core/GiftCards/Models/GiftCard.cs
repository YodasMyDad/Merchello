using Merchello.Core.Customers.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.GiftCards.Models;

public class GiftCard
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // Card identification
    public string Code { get; set; } = string.Empty;
    public string? Pin { get; set; }
    public GiftCardType CardType { get; set; } = GiftCardType.Digital;

    // Balance
    public decimal InitialBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public string CurrencyCode { get; set; } = "USD";

    // Status
    public GiftCardStatus Status { get; set; } = GiftCardStatus.Inactive;
    public bool IsReloadable { get; set; }

    // Ownership
    public Guid? PurchasedByCustomerId { get; set; }
    public virtual Customer? PurchasedByCustomer { get; set; }
    public Guid? IssuedToCustomerId { get; set; }
    public virtual Customer? IssuedToCustomer { get; set; }
    public string? RecipientEmail { get; set; }
    public string? RecipientName { get; set; }
    public string? PersonalMessage { get; set; }

    // Purchase info
    public Guid? SourceInvoiceId { get; set; }
    public Guid? SourceLineItemId { get; set; }

    // Validity
    public DateTime? ActivationDate { get; set; }
    public DateTime? ExpirationDate { get; set; }

    // Physical card info
    public string? PhysicalCardNumber { get; set; }
    public string? BatchNumber { get; set; }

    // Transactions
    public virtual ICollection<GiftCardTransaction>? Transactions { get; set; }

    // Dates
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
