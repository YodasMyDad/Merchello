using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP Complete Session request per UCP spec.
/// </summary>
public class UcpCompleteSessionRequestDto
{
    [JsonPropertyName("payment_handler_id")]
    public string? PaymentHandlerId { get; set; }

    [JsonPropertyName("payment_instrument")]
    public UcpPaymentInstrumentDto? PaymentInstrument { get; set; }
}
