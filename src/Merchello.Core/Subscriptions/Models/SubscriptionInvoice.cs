using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Subscriptions.Models;

public class SubscriptionInvoice
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid SubscriptionId { get; set; }
    public virtual Subscription? Subscription { get; set; }
    public Guid InvoiceId { get; set; }
    public virtual Invoice? Invoice { get; set; }

    // Billing period this invoice covers
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    // Provider invoice reference
    public string? ProviderInvoiceId { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
