using Merchello.Core.Protocols.Models;

namespace Merchello.Core.Protocols.UCP.Models;

public record UcpPaymentInfo
{
    public required IReadOnlyList<ProtocolPaymentHandler> Handlers { get; init; }
}
