namespace Merchello.Core.Notifications.Aggregate;

/// <summary>
/// The entity type that triggered the aggregate change.
/// </summary>
public enum AggregateChangeSource
{
    /// <summary>
    /// The invoice itself was changed.
    /// </summary>
    Invoice,

    /// <summary>
    /// An order within the invoice was changed.
    /// </summary>
    Order,

    /// <summary>
    /// A line item within an order was changed.
    /// </summary>
    LineItem,

    /// <summary>
    /// A payment on the invoice was changed.
    /// </summary>
    Payment,

    /// <summary>
    /// A shipment on an order was changed.
    /// </summary>
    Shipment
}
