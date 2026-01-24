using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Serial scan settings.
/// </summary>
public sealed record ShipBobSerialScan
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; }

    [JsonPropertyName("prefix")]
    public string? Prefix { get; init; }

    [JsonPropertyName("suffix")]
    public string? Suffix { get; init; }

    [JsonPropertyName("exact_length")]
    public int? ExactLength { get; init; }
}
