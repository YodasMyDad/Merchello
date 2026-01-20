using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// The current status of a discount.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountStatus
{
    /// <summary>
    /// Discount is in draft mode and not yet active.
    /// </summary>
    Draft,

    /// <summary>
    /// Discount is currently active and can be used.
    /// </summary>
    Active,

    /// <summary>
    /// Discount is scheduled to become active in the future.
    /// </summary>
    Scheduled,

    /// <summary>
    /// Discount has expired and can no longer be used.
    /// </summary>
    Expired,

    /// <summary>
    /// Discount has been manually disabled.
    /// </summary>
    Disabled
}
