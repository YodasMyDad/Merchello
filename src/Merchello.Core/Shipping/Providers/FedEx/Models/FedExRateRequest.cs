using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

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
