namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Simple basket count response
/// </summary>
public class BasketCountDto
{
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}
