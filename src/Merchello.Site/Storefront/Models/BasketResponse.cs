namespace Merchello.Site.Storefront.Models;

public class BasketResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}

public class BasketCountResponse
{
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}
