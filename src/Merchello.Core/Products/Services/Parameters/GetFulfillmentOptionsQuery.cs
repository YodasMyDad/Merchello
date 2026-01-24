namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Query parameters for getting fulfillment options for a product variant.
/// </summary>
public class GetFulfillmentOptionsQuery
{
    /// <summary>
    /// Country code for the shipping destination.
    /// </summary>
    public required string DestinationCountryCode { get; init; }

    /// <summary>
    /// Optional state/region code for the shipping destination.
    /// </summary>
    public string? DestinationStateCode { get; init; }
}
