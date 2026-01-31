using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Returns.Models;

public class Return
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid InvoiceId { get; set; }
    public virtual Invoice? Invoice { get; set; }
    public Guid? OrderId { get; set; }
    public virtual Order? Order { get; set; }
    public Guid CustomerId { get; set; }

    // RMA tracking
    public string RmaNumber { get; set; } = string.Empty;
    public ReturnStatus Status { get; set; } = ReturnStatus.Requested;
    public ReturnType ReturnType { get; set; } = ReturnType.Refund;

    // Request details
    public string CustomerNotes { get; set; } = string.Empty;
    public string? StaffNotes { get; set; }

    // Processing details
    public string? ApprovedBy { get; set; }
    public string? RejectionReason { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }

    // Financial
    public decimal RefundAmount { get; set; }
    public decimal RestockingFee { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public decimal? RefundAmountInStoreCurrency { get; set; }

    // Related records
    public Guid? RefundPaymentId { get; set; }
    public virtual Payment? RefundPayment { get; set; }
    public Guid? GiftCardId { get; set; }

    // Line items
    public virtual ICollection<ReturnLineItem>? LineItems { get; set; }

    // Dates
    public DateTime DateRequested { get; set; } = DateTime.UtcNow;
    public DateTime? DateApproved { get; set; }
    public DateTime? DateRejected { get; set; }
    public DateTime? DateReceived { get; set; }
    public DateTime? DateCompleted { get; set; }
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
