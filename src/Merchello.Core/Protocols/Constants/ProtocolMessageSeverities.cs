namespace Merchello.Core.Protocols;

/// <summary>
/// Protocol message severity levels.
/// </summary>
public static class ProtocolMessageSeverities
{
    public const string Recoverable = "recoverable";
    public const string RequiresBuyerInput = "requires_buyer_input";
    public const string RequiresBuyerReview = "requires_buyer_review";
}
