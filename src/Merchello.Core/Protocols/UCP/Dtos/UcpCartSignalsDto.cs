using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP Cart signals for environment data per UCP draft spec.
/// </summary>
public class UcpCartSignalsDto
{
    [JsonPropertyName("dev.ucp.buyer_ip")]
    public string? BuyerIp { get; set; }

    [JsonPropertyName("dev.ucp.user_agent")]
    public string? UserAgent { get; set; }
}
