namespace Merchello.Site.Storefront.Models;

public class SetCountryRequest
{
    public required string CountryCode { get; set; }
    public string? RegionCode { get; set; }
}

public class CountryResponse
{
    public required string CountryCode { get; set; }
    public required string CountryName { get; set; }
}

public class ShippingCountriesResponse
{
    public required List<CountryResponse> Countries { get; set; }
    public required CountryResponse Current { get; set; }
}

public class RegionResponse
{
    public required string RegionCode { get; set; }
    public required string RegionName { get; set; }
}

public class ProductAvailabilityResponse
{
    public bool CanShipToCountry { get; set; }
    public bool HasStock { get; set; }
    public int AvailableStock { get; set; }
    public string? Message { get; set; }
    public bool ShowStockLevels { get; set; }
}

public class BasketAvailabilityResponse
{
    public bool AllItemsAvailable { get; set; }
    public required List<BasketItemAvailability> Items { get; set; }
}

public class BasketItemAvailability
{
    public Guid LineItemId { get; set; }
    public Guid ProductId { get; set; }
    public bool CanShipToCountry { get; set; }
    public bool HasStock { get; set; }
    public string? Message { get; set; }
}
