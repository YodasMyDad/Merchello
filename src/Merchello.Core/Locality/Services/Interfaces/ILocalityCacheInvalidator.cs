using System.Threading;
using System.Threading.Tasks;

namespace Merchello.Core.Locality.Services.Interfaces;

public interface ILocalityCacheInvalidator
{
    Task InvalidateAllRegionsAsync(CancellationToken ct = default);
    Task InvalidateCountryRegionsAsync(string countryCode, CancellationToken ct = default);
}
