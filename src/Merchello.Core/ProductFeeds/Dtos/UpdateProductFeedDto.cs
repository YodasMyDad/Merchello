namespace Merchello.Core.ProductFeeds.Dtos;

public class UpdateProductFeedDto
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public bool IsEnabled { get; set; } = true;
    public string CountryCode { get; set; } = "US";
    public string CurrencyCode { get; set; } = "USD";
    public string LanguageCode { get; set; } = "en";
    public bool? IncludeTaxInPrice { get; set; }

    public ProductFeedFilterConfigDto FilterConfig { get; set; } = new();
    public List<ProductFeedCustomLabelDto> CustomLabels { get; set; } = [];
    public List<ProductFeedCustomFieldDto> CustomFields { get; set; } = [];
    public List<ProductFeedManualPromotionDto> ManualPromotions { get; set; } = [];
}
