namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string CountryCode { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string LanguageCode { get; set; } = string.Empty;
    public bool IncludeTaxInPrice { get; set; }

    public ProductFeedFilterConfigDto FilterConfig { get; set; } = new();
    public List<ProductFeedCustomLabelDto> CustomLabels { get; set; } = [];
    public List<ProductFeedCustomFieldDto> CustomFields { get; set; } = [];
    public List<ProductFeedManualPromotionDto> ManualPromotions { get; set; } = [];

    public DateTime? LastGeneratedUtc { get; set; }
    public string? LastGenerationError { get; set; }
    public bool HasProductSnapshot { get; set; }
    public bool HasPromotionsSnapshot { get; set; }
}
