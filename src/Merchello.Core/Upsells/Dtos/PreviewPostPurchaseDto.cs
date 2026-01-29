using Merchello.Core.Accounting.Dtos;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// API request to preview a post-purchase upsell addition.
/// </summary>
public class PreviewPostPurchaseDto
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public List<OrderAddonDto>? Addons { get; set; }
}
