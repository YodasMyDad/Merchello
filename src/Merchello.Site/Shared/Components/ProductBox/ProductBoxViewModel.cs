using Merchello.Core.Products.Models;

namespace Merchello.Site.Shared.Components.ProductBox;

public class ProductBoxViewModel
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? PreviousPrice { get; set; }
    public bool OnSale { get; set; }
    public string? ImageUrl { get; set; }
    public string ProductUrl { get; set; } = string.Empty;

    /// <summary>
    /// Calculated display price in customer's currency, optionally including tax.
    /// Includes amount, currency info, and tax details.
    /// </summary>
    public ProductDisplayPrice? DisplayPrice { get; set; }
}
