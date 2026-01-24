using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Shipping terms for orders.
/// </summary>
public sealed record ShipBobShippingTerms
{
    [JsonPropertyName("carrier_type")]
    public string? CarrierType { get; init; }

    [JsonPropertyName("payment_term")]
    public string? PaymentTerm { get; init; }
}
