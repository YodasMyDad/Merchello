namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for loading checkout shipping regions for a country.
/// </summary>
public class GetAvailableShippingRegionsParameters
{
    /// <summary>
    /// ISO country code.
    /// </summary>
    public required string CountryCode { get; init; }
}
