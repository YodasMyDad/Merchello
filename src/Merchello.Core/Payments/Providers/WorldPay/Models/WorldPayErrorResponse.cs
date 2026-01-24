using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayErrorResponse
{
    [JsonPropertyName("errorName")]
    public string? ErrorName { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("validationErrors")]
    public List<WorldPayValidationError>? ValidationErrors { get; set; }
}
