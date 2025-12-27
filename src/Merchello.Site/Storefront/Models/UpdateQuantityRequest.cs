namespace Merchello.Site.Storefront.Models;

public class UpdateQuantityRequest
{
    public Guid LineItemId { get; set; }
    public int Quantity { get; set; }
}
