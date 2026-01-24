using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSDeviceData
{
    [JsonPropertyName("collectionReference")]
    public string? CollectionReference { get; set; }

    [JsonPropertyName("acceptHeader")]
    public string? AcceptHeader { get; set; }

    [JsonPropertyName("userAgentHeader")]
    public string? UserAgentHeader { get; set; }

    [JsonPropertyName("browserLanguage")]
    public string? BrowserLanguage { get; set; }

    [JsonPropertyName("ipAddress")]
    public string? IpAddress { get; set; }

    [JsonPropertyName("browserScreenHeight")]
    public int? BrowserScreenHeight { get; set; }

    [JsonPropertyName("browserScreenWidth")]
    public int? BrowserScreenWidth { get; set; }

    [JsonPropertyName("browserColorDepth")]
    public string? BrowserColorDepth { get; set; }

    [JsonPropertyName("timeZone")]
    public string? TimeZone { get; set; }

    [JsonPropertyName("browserJavaEnabled")]
    public bool? BrowserJavaEnabled { get; set; }

    [JsonPropertyName("browserJavascriptEnabled")]
    public bool? BrowserJavascriptEnabled { get; set; }
}
