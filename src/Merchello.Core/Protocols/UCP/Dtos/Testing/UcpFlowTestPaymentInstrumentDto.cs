namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestPaymentInstrumentDto
{
    public string? Type { get; set; }

    public string? Token { get; set; }

    public Dictionary<string, object>? Data { get; set; }
}
