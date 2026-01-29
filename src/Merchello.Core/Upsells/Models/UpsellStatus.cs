using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// The current status of an upsell rule.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UpsellStatus
{
    /// <summary>
    /// Upsell rule is in draft mode and not yet active.
    /// </summary>
    Draft,

    /// <summary>
    /// Upsell rule is currently active and being evaluated.
    /// </summary>
    Active,

    /// <summary>
    /// Upsell rule is scheduled to become active in the future.
    /// </summary>
    Scheduled,

    /// <summary>
    /// Upsell rule has expired and is no longer evaluated.
    /// </summary>
    Expired,

    /// <summary>
    /// Upsell rule has been manually disabled.
    /// </summary>
    Disabled
}
