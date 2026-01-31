using Merchello.Core.Customers.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Subscriptions.Models;

public class Subscription
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid CustomerId { get; set; }
    public virtual Customer? Customer { get; set; }

    // Product reference
    public Guid ProductId { get; set; }
    public virtual Product? Product { get; set; }
    public string PlanName { get; set; } = string.Empty;

    // Provider tracking
    public string PaymentProviderAlias { get; set; } = string.Empty;
    public string ProviderSubscriptionId { get; set; } = string.Empty;
    public string? ProviderCustomerId { get; set; }
    public string? ProviderPlanId { get; set; }

    // Subscription terms
    public SubscriptionStatus Status { get; set; }
    public BillingInterval BillingInterval { get; set; }
    public int BillingIntervalCount { get; set; }

    // Pricing
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public decimal? AmountInStoreCurrency { get; set; }
    public int Quantity { get; set; } = 1;

    // Trial period
    public bool HasTrial { get; set; }
    public DateTime? TrialEndsAt { get; set; }

    // Lifecycle dates
    public DateTime? CurrentPeriodStart { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime? NextBillingDate { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? CancellationReason { get; set; }

    // Pause support
    public bool IsPaused { get; set; }
    public DateTime? PausedAt { get; set; }
    public DateTime? ResumeAt { get; set; }

    // Timestamps
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ICollection<SubscriptionInvoice>? SubscriptionInvoices { get; set; }

    // Extended data
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
