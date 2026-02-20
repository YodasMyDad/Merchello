namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestCompleteSessionPayloadDto
{
    public string? PaymentHandlerId { get; set; }

    public UcpFlowTestPaymentInstrumentDto? PaymentInstrument { get; set; }
}
