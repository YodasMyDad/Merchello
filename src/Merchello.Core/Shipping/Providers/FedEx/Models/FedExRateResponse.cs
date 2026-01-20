using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

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
