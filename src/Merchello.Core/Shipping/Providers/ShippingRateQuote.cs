using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Result returned by a provider, including its service levels.
/// </summary>
public class ShippingRateQuote
{
    public required string ProviderKey { get; init; }
    public required string ProviderName { get; init; }
    public IReadOnlyCollection<ShippingServiceLevel> ServiceLevels { get; init; } = Array.Empty<ShippingServiceLevel>();
    public IDictionary<string, string>? ExtendedProperties { get; init; }
    public IReadOnlyCollection<string> Errors { get; init; } = Array.Empty<string>();
}
