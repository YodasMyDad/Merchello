namespace Merchello.Core.Protocols;

/// <summary>
/// Protocol order adjustment types.
/// </summary>
public static class ProtocolAdjustmentTypes
{
    public const string Refund = "refund";
    public const string Return = "return";
    public const string Credit = "credit";
    public const string PriceAdjustment = "price_adjustment";
    public const string Dispute = "dispute";
    public const string Cancellation = "cancellation";
}
