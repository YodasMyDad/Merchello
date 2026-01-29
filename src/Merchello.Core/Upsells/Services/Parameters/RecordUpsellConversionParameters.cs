using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for recording an upsell conversion event with revenue amount.
/// </summary>
public class RecordUpsellConversionParameters
{
    public Guid UpsellRuleId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? InvoiceId { get; set; }
    public decimal? Amount { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
}
