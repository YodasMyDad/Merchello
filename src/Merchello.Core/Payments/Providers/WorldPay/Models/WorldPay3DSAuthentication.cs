using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSAuthentication
{
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    [JsonPropertyName("authenticationValue")]
    public string? AuthenticationValue { get; set; }

    [JsonPropertyName("eci")]
    public string? Eci { get; set; }

    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }
}
