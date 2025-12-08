using System.Text.Json.Serialization;

namespace Merchello.ShippingProviders.FedEx.Models;

/// <summary>
/// FedEx Rate API request body.
/// </summary>
public class FedExRateRequest
{
    [JsonPropertyName("accountNumber")]
    public FedExAccountNumber AccountNumber { get; set; } = null!;

    [JsonPropertyName("requestedShipment")]
    public FedExRequestedShipment RequestedShipment { get; set; } = null!;
}

public class FedExAccountNumber
{
    [JsonPropertyName("value")]
    public string Value { get; set; } = null!;
}

public class FedExRequestedShipment
{
    [JsonPropertyName("shipper")]
    public FedExParty Shipper { get; set; } = null!;

    [JsonPropertyName("recipient")]
    public FedExParty Recipient { get; set; } = null!;

    [JsonPropertyName("pickupType")]
    public string PickupType { get; set; } = "DROPOFF_AT_FEDEX_LOCATION";

    [JsonPropertyName("serviceType")]
    public string? ServiceType { get; set; }

    [JsonPropertyName("packagingType")]
    public string PackagingType { get; set; } = "YOUR_PACKAGING";

    [JsonPropertyName("rateRequestType")]
    public List<string> RateRequestType { get; set; } = ["ACCOUNT", "LIST"];

    [JsonPropertyName("requestedPackageLineItems")]
    public List<FedExPackageLineItem> RequestedPackageLineItems { get; set; } = [];
}

public class FedExParty
{
    [JsonPropertyName("address")]
    public FedExAddress Address { get; set; } = null!;
}

public class FedExAddress
{
    [JsonPropertyName("streetLines")]
    public List<string>? StreetLines { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("stateOrProvinceCode")]
    public string? StateOrProvinceCode { get; set; }

    [JsonPropertyName("postalCode")]
    public string PostalCode { get; set; } = null!;

    [JsonPropertyName("countryCode")]
    public string CountryCode { get; set; } = null!;

    [JsonPropertyName("residential")]
    public bool? Residential { get; set; }
}

public class FedExPackageLineItem
{
    [JsonPropertyName("weight")]
    public FedExWeight Weight { get; set; } = null!;

    [JsonPropertyName("dimensions")]
    public FedExDimensions? Dimensions { get; set; }
}

public class FedExWeight
{
    [JsonPropertyName("units")]
    public string Units { get; set; } = "KG";

    [JsonPropertyName("value")]
    public decimal Value { get; set; }
}

public class FedExDimensions
{
    [JsonPropertyName("length")]
    public int Length { get; set; }

    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("height")]
    public int Height { get; set; }

    [JsonPropertyName("units")]
    public string Units { get; set; } = "CM";
}
