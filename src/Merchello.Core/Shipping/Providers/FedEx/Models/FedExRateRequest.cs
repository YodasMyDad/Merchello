using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

/// <summary>
/// FedEx Rate API request body.
/// </summary>
public class FedExRateRequest
{
    [JsonPropertyName("accountNumber")]
    public FedExAccountNumber AccountNumber { get; set; } = null!;

    /// <summary>
    /// Requests transit-day and estimated-delivery metadata in rate responses.
    /// Required for downstream DaysFrom/DaysTo and fulfilment service-category mapping.
    /// </summary>
    [JsonPropertyName("returnTransitTimes")]
    public bool ReturnTransitTimes { get; set; } = true;

    [JsonPropertyName("requestedShipment")]
    public FedExRequestedShipment RequestedShipment { get; set; } = null!;
}
