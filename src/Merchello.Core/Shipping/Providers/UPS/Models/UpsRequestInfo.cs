using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsRequestInfo
{
    [JsonPropertyName("SubVersion")]
    public string? SubVersion { get; set; } = "2409";

    [JsonPropertyName("TransactionReference")]
    public UpsTransactionReference? TransactionReference { get; set; }
}
