namespace Merchello.Core.Protocols.UCP.Models;

public record UcpServices
{
    public required UcpShoppingService Shopping { get; init; }
}
