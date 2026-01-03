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

    // Display prices in customer's selected currency
    public decimal DisplayPrice { get; set; }
    public decimal? DisplayPreviousPrice { get; set; }
    public string CurrencyCode { get; set; } = "GBP";
    public string CurrencySymbol { get; set; } = "£";
    public int DecimalPlaces { get; set; } = 2;
}
