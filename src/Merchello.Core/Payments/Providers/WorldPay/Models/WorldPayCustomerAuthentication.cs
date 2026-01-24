using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

/// <summary>
/// Customer authentication data for 3DS in authorization requests.
/// </summary>
internal class WorldPayCustomerAuthentication
{
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = "3DS";

    [JsonPropertyName("eci")]
    public string? Eci { get; set; }

    [JsonPropertyName("authenticationValue")]
    public string? AuthenticationValue { get; set; }

    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }
}
