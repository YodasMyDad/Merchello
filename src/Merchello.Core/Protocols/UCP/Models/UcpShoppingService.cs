namespace Merchello.Core.Protocols.UCP.Models;

public record UcpShoppingService
{
    public required UcpRestEndpoint Rest { get; init; }
}
