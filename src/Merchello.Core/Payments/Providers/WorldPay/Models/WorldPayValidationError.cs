using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayValidationError
{
    [JsonPropertyName("errorName")]
    public string? ErrorName { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("jsonPath")]
    public string? JsonPath { get; set; }
}
