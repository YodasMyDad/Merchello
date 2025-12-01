using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Shipping.Services.Interfaces;

public interface IShippingQuoteService
{
    Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesAsync(Basket basket, string countryCode, string? stateOrProvinceCode = null, CancellationToken cancellationToken = default);
}
