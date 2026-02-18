namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedValidationProductPreviewDto
{
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? Title { get; set; }
    public string? Price { get; set; }
    public string? Availability { get; set; }
    public string? Link { get; set; }
    public string? ImageLink { get; set; }
    public string? Brand { get; set; }
    public string? Gtin { get; set; }
    public string? Mpn { get; set; }
    public string? IdentifierExists { get; set; }
    public string? ShippingLabel { get; set; }
    public List<ProductFeedValidationPreviewFieldDto> Fields { get; set; } = [];
}
