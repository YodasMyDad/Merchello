using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for storing upsell impressions in the checkout session.
/// </summary>
public class AddUpsellImpressionsParameters
{
    public Guid BasketId { get; set; }
    public List<UpsellImpressionRecord> Impressions { get; set; } = [];
}
