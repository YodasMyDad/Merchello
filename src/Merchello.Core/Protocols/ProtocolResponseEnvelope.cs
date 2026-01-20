namespace Merchello.Core.Protocols;

/// <summary>
/// UCP spec requires every response to include version and active capabilities.
/// Wrap all protocol responses in this envelope.
/// </summary>
public class ProtocolResponseEnvelope
{
    public required UcpMetadata Ucp { get; init; }
    public required object Data { get; init; }
}
