using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Contract that shipping provider plugins must implement.
/// </summary>
public interface IShippingProvider
{
    /// <summary>
    /// Static metadata describing the provider.
    /// </summary>
    ShippingProviderMetadata Metadata { get; }

    /// <summary>
    /// Applies persisted configuration for the provider.
    /// </summary>
    /// <param name="configuration">The stored configuration (if any).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    ValueTask ConfigureAsync(ShippingProviderConfiguration? configuration, CancellationToken cancellationToken = default);

    /// <summary>
    /// Determines whether the provider can service the given request before performing any heavy work.
    /// </summary>
    /// <param name="request">Quote request.</param>
    bool IsAvailableFor(ShippingQuoteRequest request);

    /// <summary>
    /// Requests live rates from the provider.
    /// </summary>
    /// <param name="request">Quote request context.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A quote with service levels, or null when no services are available.</returns>
    Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, CancellationToken cancellationToken = default);
}
