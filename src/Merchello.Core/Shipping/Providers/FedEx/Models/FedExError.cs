using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExError
{
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("parameterList")]
    public List<FedExErrorParameter>? ParameterList { get; set; }
}
