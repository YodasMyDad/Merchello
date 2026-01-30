namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Common shipping option fields shared across shipping DTOs.
/// </summary>
public class ShippingOptionBaseDto
{
    /// <summary>
    /// Shipping option ID.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name of the shipping option.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Provider key (e.g., "flat-rate", "fedex", "ups").
    /// </summary>
    public string ProviderKey { get; set; } = "flat-rate";

    /// <summary>
    /// Service type code for external providers.
    /// </summary>
    public string? ServiceType { get; set; }

    /// <summary>
    /// Minimum delivery days.
    /// </summary>
    public int DaysFrom { get; set; }

    /// <summary>
    /// Maximum delivery days.
    /// </summary>
    public int DaysTo { get; set; }

    /// <summary>
    /// Whether this is next-day delivery.
    /// </summary>
    public bool IsNextDay { get; set; }
}
