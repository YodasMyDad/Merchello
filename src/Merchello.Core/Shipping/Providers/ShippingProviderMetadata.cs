using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Immutable metadata describing a shipping provider implementation.
/// </summary>
public readonly record struct ShippingProviderMetadata(
    string Key,
    string DisplayName,
    bool EnabledByDefault = false,
    IReadOnlyCollection<string>? SupportedCountries = null);
