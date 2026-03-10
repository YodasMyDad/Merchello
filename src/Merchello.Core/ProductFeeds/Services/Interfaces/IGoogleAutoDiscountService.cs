using Merchello.Core.ProductFeeds.Models;

namespace Merchello.Core.ProductFeeds.Services.Interfaces;

public interface IGoogleAutoDiscountService
{
    Task<GoogleAutoDiscountResult?> ValidateAndParseAsync(string pv2Token, string expectedMerchantId, CancellationToken ct = default);
}
