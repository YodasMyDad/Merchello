using System.Text.Json.Serialization;

namespace Merchello.ShippingProviders.UPS.Models;

/// <summary>
/// UPS Rating API request wrapper.
/// </summary>
public class UpsRateRequestWrapper
{
    [JsonPropertyName("RateRequest")]
    public UpsRateRequest RateRequest { get; set; } = null!;
}

/// <summary>
/// UPS Rating API request body.
/// </summary>
public class UpsRateRequest
{
    [JsonPropertyName("Request")]
    public UpsRequestInfo? Request { get; set; }

    [JsonPropertyName("Shipment")]
    public UpsShipment Shipment { get; set; } = null!;
}

public class UpsRequestInfo
{
    [JsonPropertyName("SubVersion")]
    public string? SubVersion { get; set; } = "2409";

    [JsonPropertyName("TransactionReference")]
    public UpsTransactionReference? TransactionReference { get; set; }
}

public class UpsTransactionReference
{
    [JsonPropertyName("CustomerContext")]
    public string? CustomerContext { get; set; }
}

public class UpsShipment
{
    [JsonPropertyName("Shipper")]
    public UpsShipper Shipper { get; set; } = null!;

    [JsonPropertyName("ShipTo")]
    public UpsShipTo ShipTo { get; set; } = null!;

    [JsonPropertyName("ShipFrom")]
    public UpsShipFrom? ShipFrom { get; set; }

    [JsonPropertyName("PaymentDetails")]
    public UpsPaymentDetails? PaymentDetails { get; set; }

    [JsonPropertyName("Service")]
    public UpsService? Service { get; set; }

    [JsonPropertyName("NumOfPieces")]
    public string? NumOfPieces { get; set; }

    [JsonPropertyName("Package")]
    public List<UpsPackage> Package { get; set; } = [];

    [JsonPropertyName("ShipmentRatingOptions")]
    public UpsShipmentRatingOptions? ShipmentRatingOptions { get; set; }

    [JsonPropertyName("DeliveryTimeInformation")]
    public UpsDeliveryTimeInformation? DeliveryTimeInformation { get; set; }
}

public class UpsShipper
{
    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("ShipperNumber")]
    public string? ShipperNumber { get; set; }

    [JsonPropertyName("Address")]
    public UpsAddress Address { get; set; } = null!;
}

public class UpsShipTo
{
    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("Address")]
    public UpsAddress Address { get; set; } = null!;
}

public class UpsShipFrom
{
    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("Address")]
    public UpsAddress Address { get; set; } = null!;
}

public class UpsAddress
{
    [JsonPropertyName("AddressLine")]
    public List<string>? AddressLine { get; set; }

    [JsonPropertyName("City")]
    public string? City { get; set; }

    [JsonPropertyName("StateProvinceCode")]
    public string? StateProvinceCode { get; set; }

    [JsonPropertyName("PostalCode")]
    public string? PostalCode { get; set; }

    [JsonPropertyName("CountryCode")]
    public string CountryCode { get; set; } = null!;

    [JsonPropertyName("ResidentialAddressIndicator")]
    public string? ResidentialAddressIndicator { get; set; }
}

public class UpsPaymentDetails
{
    [JsonPropertyName("ShipmentCharge")]
    public List<UpsShipmentCharge>? ShipmentCharge { get; set; }
}

public class UpsShipmentCharge
{
    [JsonPropertyName("Type")]
    public string? Type { get; set; }

    [JsonPropertyName("BillShipper")]
    public UpsBillShipper? BillShipper { get; set; }
}

public class UpsBillShipper
{
    [JsonPropertyName("AccountNumber")]
    public string? AccountNumber { get; set; }
}

public class UpsService
{
    [JsonPropertyName("Code")]
    public string Code { get; set; } = null!;

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}

public class UpsPackage
{
    [JsonPropertyName("PackagingType")]
    public UpsPackagingType PackagingType { get; set; } = null!;

    [JsonPropertyName("Dimensions")]
    public UpsDimensions? Dimensions { get; set; }

    [JsonPropertyName("PackageWeight")]
    public UpsPackageWeight PackageWeight { get; set; } = null!;
}

public class UpsPackagingType
{
    /// <summary>
    /// Package type code. 02 = Customer Supplied Package.
    /// </summary>
    [JsonPropertyName("Code")]
    public string Code { get; set; } = "02";

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}

public class UpsDimensions
{
    [JsonPropertyName("UnitOfMeasurement")]
    public UpsUnitOfMeasurement UnitOfMeasurement { get; set; } = null!;

    [JsonPropertyName("Length")]
    public string Length { get; set; } = null!;

    [JsonPropertyName("Width")]
    public string Width { get; set; } = null!;

    [JsonPropertyName("Height")]
    public string Height { get; set; } = null!;
}

public class UpsPackageWeight
{
    [JsonPropertyName("UnitOfMeasurement")]
    public UpsUnitOfMeasurement UnitOfMeasurement { get; set; } = null!;

    [JsonPropertyName("Weight")]
    public string Weight { get; set; } = null!;
}

public class UpsUnitOfMeasurement
{
    /// <summary>
    /// Unit code. KGS for kilograms, LBS for pounds, CM for centimeters, IN for inches.
    /// </summary>
    [JsonPropertyName("Code")]
    public string Code { get; set; } = null!;

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}

public class UpsShipmentRatingOptions
{
    [JsonPropertyName("NegotiatedRatesIndicator")]
    public string? NegotiatedRatesIndicator { get; set; }

    [JsonPropertyName("UserLevelDiscountIndicator")]
    public string? UserLevelDiscountIndicator { get; set; }
}

public class UpsDeliveryTimeInformation
{
    /// <summary>
    /// Package bill type. 03 = Non-Document.
    /// </summary>
    [JsonPropertyName("PackageBillType")]
    public string? PackageBillType { get; set; } = "03";

    [JsonPropertyName("Pickup")]
    public UpsPickup? Pickup { get; set; }
}

public class UpsPickup
{
    /// <summary>
    /// Pickup date in YYYYMMDD format.
    /// </summary>
    [JsonPropertyName("Date")]
    public string? Date { get; set; }

    /// <summary>
    /// Pickup time in HHMMSS format.
    /// </summary>
    [JsonPropertyName("Time")]
    public string? Time { get; set; }
}
