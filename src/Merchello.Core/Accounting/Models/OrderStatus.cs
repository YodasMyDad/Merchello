namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Represents the lifecycle status of an order
/// </summary>
public enum OrderStatus
{
    /// <summary>
    /// Order has been created, awaiting initial processing
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Stock has been reserved but not all items are available yet (backorder scenario)
    /// </summary>
    AwaitingStock = 10,

    /// <summary>
    /// Stock is available and reserved, order is ready for warehouse picking
    /// </summary>
    ReadyToFulfill = 20,

    /// <summary>
    /// Order is being picked and packed at the warehouse
    /// </summary>
    Processing = 30,

    /// <summary>
    /// Some items have been shipped, but not all
    /// </summary>
    PartiallyShipped = 40,

    /// <summary>
    /// All items have been shipped
    /// </summary>
    Shipped = 50,

    /// <summary>
    /// Order has been delivered to customer (based on carrier tracking)
    /// </summary>
    Completed = 60,

    /// <summary>
    /// Order has been cancelled
    /// </summary>
    Cancelled = 70,

    /// <summary>
    /// Order is on hold (payment issue, fraud check, manual review required, etc.)
    /// </summary>
    OnHold = 80
}

