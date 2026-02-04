namespace Merchello.Core.Protocols;

/// <summary>
/// HTTP headers used by protocols.
/// </summary>
public static class ProtocolHeaders
{
    public const string UcpAgent = "UCP-Agent";
    public const string ContentType = "Content-Type";
    public const string IdempotencyKey = "Idempotency-Key";
    public const string RequestSignature = "Request-Signature";
    public const string RequestId = "Request-Id";
    public const string ApiKey = "X-API-Key";
}
