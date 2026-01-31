namespace Merchello.Core.Auditing.Models;

public enum AuditAction
{
    // Lifecycle
    Created = 10,
    Updated = 20,
    Deleted = 30,

    // Status changes
    StatusChanged = 100,
    Activated = 101,
    Deactivated = 102,
    Cancelled = 103,
    Completed = 104,

    // Financial
    PaymentReceived = 200,
    PaymentRefunded = 201,
    PriceChanged = 202,
    DiscountApplied = 203,
    DiscountRemoved = 204,

    // Inventory
    StockReserved = 300,
    StockAllocated = 301,
    StockReleased = 302,
    StockAdjusted = 303,

    // Fulfillment
    ShipmentCreated = 400,
    ShipmentUpdated = 401,
    Shipped = 402,
    Delivered = 403,

    // Access & Security
    Viewed = 500,
    Exported = 501,
    AccessGranted = 502,
    AccessRevoked = 503,

    // Custom
    Custom = 900
}
