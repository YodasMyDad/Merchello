using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP buyer information.
/// </summary>
public class UcpBuyerInfoDto
{
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("billing_address")]
    public UcpAddressDto? BillingAddress { get; set; }

    [JsonPropertyName("shipping_address")]
    public UcpAddressDto? ShippingAddress { get; set; }

    [JsonPropertyName("shipping_same_as_billing")]
    public bool? ShippingSameAsBilling { get; set; }
}
