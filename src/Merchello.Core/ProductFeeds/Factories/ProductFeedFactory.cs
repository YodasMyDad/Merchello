using Merchello.Core.ProductFeeds.Models;

namespace Merchello.Core.ProductFeeds.Factories;

public class ProductFeedFactory
{
    public ProductFeed Create(
        string name,
        string slug,
        string countryCode,
        string currencyCode,
        string languageCode,
        bool includeTaxInPrice)
    {
        return new ProductFeed
        {
            Name = name,
            Slug = slug,
            CountryCode = countryCode,
            CurrencyCode = currencyCode,
            LanguageCode = languageCode,
            IncludeTaxInPrice = includeTaxInPrice,
            IsEnabled = true,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };
    }
}
