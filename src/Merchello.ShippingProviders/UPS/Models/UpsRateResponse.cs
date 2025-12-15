using System.Text.Json.Serialization;

namespace Merchello.ShippingProviders.UPS.Models;

/// <summary>
/// UPS Rating API response wrapper.
/// </summary>
public class UpsRateResponseWrapper
{
    [JsonPropertyName("RateResponse")]
    public UpsRateResponse? RateResponse { get; set; }
}

/// <summary>
/// UPS Rating API response.
/// </summary>
public class UpsRateResponse
{
    [JsonPropertyName("Response")]
    public UpsResponseInfo? Response { get; set; }

    [JsonPropertyName("RatedShipment")]
    public List<UpsRatedShipment>? RatedShipment { get; set; }
}

public class UpsResponseInfo
{
    [JsonPropertyName("ResponseStatus")]
    public UpsResponseStatus? ResponseStatus { get; set; }

    [JsonPropertyName("Alert")]
    public List<UpsAlert>? Alert { get; set; }

    [JsonPropertyName("TransactionReference")]
    public UpsTransactionReference? TransactionReference { get; set; }
}

public class UpsResponseStatus
{
    [JsonPropertyName("Code")]
    public string? Code { get; set; }

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}

public class UpsAlert
{
    [JsonPropertyName("Code")]
    public string? Code { get; set; }

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}

public class UpsRatedShipment
{
    [JsonPropertyName("Service")]
    public UpsService? Service { get; set; }

    [JsonPropertyName("RatedShipmentAlert")]
    public List<UpsAlert>? RatedShipmentAlert { get; set; }

    [JsonPropertyName("BillingWeight")]
    public UpsBillingWeight? BillingWeight { get; set; }

    [JsonPropertyName("TransportationCharges")]
    public UpsCharges? TransportationCharges { get; set; }

    [JsonPropertyName("BaseServiceCharge")]
    public UpsCharges? BaseServiceCharge { get; set; }

    [JsonPropertyName("ServiceOptionsCharges")]
    public UpsCharges? ServiceOptionsCharges { get; set; }

    [JsonPropertyName("TotalCharges")]
    public UpsCharges? TotalCharges { get; set; }

    [JsonPropertyName("NegotiatedRateCharges")]
    public UpsNegotiatedRateCharges? NegotiatedRateCharges { get; set; }

    [JsonPropertyName("GuaranteedDelivery")]
    public UpsGuaranteedDelivery? GuaranteedDelivery { get; set; }

    [JsonPropertyName("RatedPackage")]
    public List<UpsRatedPackage>? RatedPackage { get; set; }

    [JsonPropertyName("TimeInTransit")]
    public UpsTimeInTransit? TimeInTransit { get; set; }
}

public class UpsBillingWeight
{
    [JsonPropertyName("UnitOfMeasurement")]
    public UpsUnitOfMeasurement? UnitOfMeasurement { get; set; }

    [JsonPropertyName("Weight")]
    public string? Weight { get; set; }
}

public class UpsCharges
{
    [JsonPropertyName("CurrencyCode")]
    public string? CurrencyCode { get; set; }

    [JsonPropertyName("MonetaryValue")]
    public string? MonetaryValue { get; set; }
}

public class UpsNegotiatedRateCharges
{
    [JsonPropertyName("TotalCharge")]
    public UpsCharges? TotalCharge { get; set; }
}

public class UpsGuaranteedDelivery
{
    [JsonPropertyName("BusinessDaysInTransit")]
    public string? BusinessDaysInTransit { get; set; }

    [JsonPropertyName("DeliveryByTime")]
    public string? DeliveryByTime { get; set; }
}

public class UpsRatedPackage
{
    [JsonPropertyName("TransportationCharges")]
    public UpsCharges? TransportationCharges { get; set; }

    [JsonPropertyName("ServiceOptionsCharges")]
    public UpsCharges? ServiceOptionsCharges { get; set; }

    [JsonPropertyName("TotalCharges")]
    public UpsCharges? TotalCharges { get; set; }

    [JsonPropertyName("Weight")]
    public string? Weight { get; set; }

    [JsonPropertyName("BillingWeight")]
    public UpsBillingWeight? BillingWeight { get; set; }
}

public class UpsTimeInTransit
{
    [JsonPropertyName("PickupDate")]
    public string? PickupDate { get; set; }

    [JsonPropertyName("DocumentsOnlyIndicator")]
    public string? DocumentsOnlyIndicator { get; set; }

    [JsonPropertyName("PackageBillType")]
    public string? PackageBillType { get; set; }

    [JsonPropertyName("ServiceSummary")]
    public UpsServiceSummary? ServiceSummary { get; set; }
}

public class UpsServiceSummary
{
    [JsonPropertyName("Service")]
    public UpsService? Service { get; set; }

    [JsonPropertyName("EstimatedArrival")]
    public UpsEstimatedArrival? EstimatedArrival { get; set; }

    [JsonPropertyName("GuaranteedIndicator")]
    public string? GuaranteedIndicator { get; set; }

    [JsonPropertyName("SaturdayDelivery")]
    public string? SaturdayDelivery { get; set; }
}

public class UpsEstimatedArrival
{
    [JsonPropertyName("Arrival")]
    public UpsArrival? Arrival { get; set; }

    [JsonPropertyName("BusinessDaysInTransit")]
    public string? BusinessDaysInTransit { get; set; }

    [JsonPropertyName("DayOfWeek")]
    public string? DayOfWeek { get; set; }
}

public class UpsArrival
{
    /// <summary>
    /// Arrival date in YYYYMMDD format.
    /// </summary>
    [JsonPropertyName("Date")]
    public string? Date { get; set; }

    /// <summary>
    /// Arrival time in HHMMSS format.
    /// </summary>
    [JsonPropertyName("Time")]
    public string? Time { get; set; }
}

// Error response models

/// <summary>
/// UPS error response wrapper.
/// </summary>
public class UpsErrorResponse
{
    [JsonPropertyName("response")]
    public UpsErrorResponseDetail? Response { get; set; }
}

public class UpsErrorResponseDetail
{
    [JsonPropertyName("errors")]
    public List<UpsError>? Errors { get; set; }
}

public class UpsError
{
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
