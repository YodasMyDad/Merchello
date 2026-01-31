namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Tracks an auto-added upsell product the customer explicitly removed.
/// Stored in CheckoutSession to prevent re-addition during the same session.
/// </summary>
public class RemovedAutoAddRecord
{
    public Guid UpsellRuleId { get; set; }
    public Guid ProductId { get; set; }
}
