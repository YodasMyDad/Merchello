using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSBillingAddress
{
    [JsonPropertyName("address1")]
    public string? Address1 { get; set; }

    [JsonPropertyName("address2")]
    public string? Address2 { get; set; }

    [JsonPropertyName("address3")]
    public string? Address3 { get; set; }

    [JsonPropertyName("postalCode")]
    public string? PostalCode { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("countryCode")]
    public string? CountryCode { get; set; }
}
