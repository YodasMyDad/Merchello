using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Shipping.Services.Parameters;

/// <summary>
/// Parameters for getting shipping quotes for a specific warehouse.
/// </summary>
public class GetWarehouseQuotesParameters
{
    /// <summary>
    /// The warehouse ID (used for cache key and provider config lookup).
    /// </summary>
    public required Guid WarehouseId { get; init; }

    /// <summary>
    /// The warehouse address (origin for carrier API calls).
    /// </summary>
    public required Address WarehouseAddress { get; init; }

    /// <summary>
    /// Package dimensions and weights for the items in this group.
    /// </summary>
    public required IReadOnlyCollection<ShipmentPackage> Packages { get; init; }

    /// <summary>
    /// Customer's country code.
    /// </summary>
    public required string DestinationCountry { get; init; }

    /// <summary>
    /// Customer's state/province code.
    /// </summary>
    public string? DestinationState { get; init; }

    /// <summary>
    /// Customer's postal code.
    /// </summary>
    public string? DestinationPostal { get; init; }

    /// <summary>
    /// The currency code for the rates.
    /// </summary>
    public required string Currency { get; init; }
}
