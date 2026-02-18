using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeed
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;

    public string CountryCode { get; set; } = "US";
    public string CurrencyCode { get; set; } = "USD";
    public string LanguageCode { get; set; } = "en";
    public bool? IncludeTaxInPrice { get; set; }

    public string? FilterConfigJson { get; set; }
    public string? CustomLabelsJson { get; set; }
    public string? CustomFieldsJson { get; set; }
    public string? ManualPromotionsJson { get; set; }

    public string? LastSuccessfulProductFeedXml { get; set; }
    public string? LastSuccessfulPromotionsFeedXml { get; set; }
    public DateTime? LastGeneratedUtc { get; set; }
    public string? LastGenerationError { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
