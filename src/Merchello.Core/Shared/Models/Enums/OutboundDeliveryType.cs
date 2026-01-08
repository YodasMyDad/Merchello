namespace Merchello.Core.Shared.Models.Enums;

/// <summary>
/// Type of outbound delivery.
/// </summary>
public enum OutboundDeliveryType
{
    /// <summary>
    /// HTTP webhook delivery.
    /// </summary>
    Webhook = 0,

    /// <summary>
    /// Email delivery.
    /// </summary>
    Email = 1
}
