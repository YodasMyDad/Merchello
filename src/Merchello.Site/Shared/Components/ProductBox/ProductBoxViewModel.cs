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
}
