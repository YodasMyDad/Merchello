namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for loading checkout billing regions for a country.
/// </summary>
public class GetAvailableBillingRegionsParameters
{
    /// <summary>
    /// ISO country code.
    /// </summary>
    public required string CountryCode { get; init; }
}
