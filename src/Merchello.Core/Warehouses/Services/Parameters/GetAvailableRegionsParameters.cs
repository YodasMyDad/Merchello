namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for loading globally available shipping regions for a country.
/// </summary>
public class GetAvailableRegionsParameters
{
    /// <summary>
    /// ISO country code.
    /// </summary>
    public required string CountryCode { get; init; }
}
