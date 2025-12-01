using System.Threading;
using System.Threading.Tasks;

namespace Merchello.Core.Shipping.Providers;

public interface IShippingProviderManager
{
    Task<IReadOnlyCollection<RegisteredShippingProvider>> GetProvidersAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<RegisteredShippingProvider>> GetEnabledProvidersAsync(CancellationToken cancellationToken = default);

    Task<RegisteredShippingProvider?> GetProviderAsync(string providerKey, bool requireEnabled = true, CancellationToken cancellationToken = default);
}
