namespace Merchello.Core.Protocols;

/// <summary>
/// Error details for protocol responses.
/// </summary>
public class ProtocolError
{
    public required string Code { get; init; }
    public required string Message { get; init; }
    public IReadOnlyDictionary<string, string[]>? Details { get; init; }
}
