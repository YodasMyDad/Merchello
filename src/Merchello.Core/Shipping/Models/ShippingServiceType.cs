namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Represents a concrete shipping service type offered by a provider.
/// </summary>
/// <remarks>
/// This model provides type-safe service type information instead of magic strings.
/// External providers (FedEx, UPS, etc.) declare their supported service types via
/// <see cref="Providers.IShippingProvider.GetSupportedServiceTypesAsync"/>.
/// </remarks>
public record ShippingServiceType
{
    /// <summary>
    /// The unique service type code used by the carrier API (e.g., "FEDEX_GROUND", "UPS_NEXT_DAY_AIR").
    /// This code is stored in <see cref="ShippingOption.ServiceType"/> and used for filtering.
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// Human-readable display name shown to users (e.g., "FedEx Ground", "UPS Next Day Air").
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional description providing additional details about the service.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// The provider key that owns this service type (e.g., "fedex", "ups").
    /// </summary>
    public required string ProviderKey { get; init; }
}

