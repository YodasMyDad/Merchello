using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Extensions;

/// <summary>
/// Extension methods for ShipmentStatus enum to provide display values.
/// Centralizes status-to-display logic to avoid duplication in frontend.
/// </summary>
public static class ShipmentStatusExtensions
{
    /// <summary>
    /// Gets the human-readable label for a shipment status.
    /// </summary>
    public static string ToLabel(this ShipmentStatus status) => status switch
    {
        ShipmentStatus.Preparing => "Preparing",
        ShipmentStatus.Shipped => "Shipped",
        ShipmentStatus.Delivered => "Delivered",
        ShipmentStatus.Cancelled => "Cancelled",
        _ => "Unknown"
    };

    /// <summary>
    /// Gets the CSS class for styling shipment status badges.
    /// </summary>
    public static string ToCssClass(this ShipmentStatus status) => status switch
    {
        ShipmentStatus.Cancelled => "cancelled",
        ShipmentStatus.Delivered => "delivered",
        ShipmentStatus.Shipped => "shipped",
        ShipmentStatus.Preparing => "preparing",
        _ => "unknown"
    };

    /// <summary>
    /// Checks if a status transition is valid.
    /// </summary>
    public static bool CanTransitionTo(this ShipmentStatus current, ShipmentStatus target)
    {
        // Same status is always valid (no-op)
        if (current == target) return true;

        return (current, target) switch
        {
            // From Preparing: can go to Shipped or Cancelled
            (ShipmentStatus.Preparing, ShipmentStatus.Shipped) => true,
            (ShipmentStatus.Preparing, ShipmentStatus.Cancelled) => true,

            // From Shipped: can go to Delivered or Cancelled
            (ShipmentStatus.Shipped, ShipmentStatus.Delivered) => true,
            (ShipmentStatus.Shipped, ShipmentStatus.Cancelled) => true,

            // Delivered and Cancelled are terminal states
            _ => false
        };
    }
}
