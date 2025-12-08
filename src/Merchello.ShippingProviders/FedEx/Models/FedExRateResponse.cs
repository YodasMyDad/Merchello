using System.Text.Json.Serialization;

namespace Merchello.ShippingProviders.FedEx.Models;

/// <summary>
/// FedEx Rate API response.
/// </summary>
public class FedExRateResponse
{
    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }

    [JsonPropertyName("output")]
    public FedExRateOutput? Output { get; set; }

    [JsonPropertyName("errors")]
    public List<FedExError>? Errors { get; set; }
}

public class FedExRateOutput
{
    [JsonPropertyName("rateReplyDetails")]
    public List<FedExRateReplyDetail>? RateReplyDetails { get; set; }
}

public class FedExRateReplyDetail
{
    [JsonPropertyName("serviceType")]
    public string ServiceType { get; set; } = null!;

    [JsonPropertyName("serviceName")]
    public string? ServiceName { get; set; }

    [JsonPropertyName("packagingType")]
    public string? PackagingType { get; set; }

    [JsonPropertyName("ratedShipmentDetails")]
    public List<FedExRatedShipmentDetail>? RatedShipmentDetails { get; set; }

    [JsonPropertyName("commit")]
    public FedExCommit? Commit { get; set; }
}

public class FedExRatedShipmentDetail
{
    [JsonPropertyName("rateType")]
    public string? RateType { get; set; }

    [JsonPropertyName("ratedWeightMethod")]
    public string? RatedWeightMethod { get; set; }

    [JsonPropertyName("totalBaseCharge")]
    public decimal? TotalBaseCharge { get; set; }

    [JsonPropertyName("totalNetCharge")]
    public decimal? TotalNetCharge { get; set; }

    [JsonPropertyName("totalNetFedExCharge")]
    public decimal? TotalNetFedExCharge { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("shipmentRateDetail")]
    public FedExShipmentRateDetail? ShipmentRateDetail { get; set; }
}

public class FedExShipmentRateDetail
{
    [JsonPropertyName("totalBaseCharge")]
    public decimal? TotalBaseCharge { get; set; }

    [JsonPropertyName("totalNetCharge")]
    public decimal? TotalNetCharge { get; set; }

    [JsonPropertyName("totalBillingWeight")]
    public FedExWeight? TotalBillingWeight { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }
}

public class FedExCommit
{
    [JsonPropertyName("dateDetail")]
    public FedExDateDetail? DateDetail { get; set; }

    [JsonPropertyName("transitDays")]
    public string? TransitDays { get; set; }
}

public class FedExDateDetail
{
    [JsonPropertyName("dayOfWeek")]
    public string? DayOfWeek { get; set; }

    [JsonPropertyName("dayCxsFormat")]
    public string? DayCxsFormat { get; set; }
}

public class FedExError
{
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
