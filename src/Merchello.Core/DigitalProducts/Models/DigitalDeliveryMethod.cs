namespace Merchello.Core.DigitalProducts.Models;

/// <summary>
/// Defines how digital products are delivered to customers.
/// </summary>
public enum DigitalDeliveryMethod
{
    /// <summary>
    /// Download links shown on order confirmation page and sent via email.
    /// Customer sees links immediately after purchase.
    /// </summary>
    InstantDownload = 0,

    /// <summary>
    /// Download links sent via email only.
    /// Use for license keys, time-sensitive content, or controlled delivery.
    /// </summary>
    EmailDelivered = 1
}
