using Merchello.Core.Accounting.Dtos;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// API request to add a post-purchase upsell item and charge the saved payment method.
/// </summary>
public class AddPostPurchaseUpsellDto
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public Guid UpsellRuleId { get; set; }
    public Guid SavedPaymentMethodId { get; set; }
    public string? IdempotencyKey { get; set; }
    public List<OrderAddonDto>? Addons { get; set; }
}
