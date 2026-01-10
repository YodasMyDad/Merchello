using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.ShippingTaxOverride;

/// <summary>
/// Notification published after a ShippingTaxOverride has been deleted.
/// </summary>
public class ShippingTaxOverrideDeletedNotification(Guid shippingTaxOverrideId, string countryCode, string? stateOrProvinceCode) : MerchelloNotification
{
    /// <summary>
    /// The ID of the shipping tax override that was deleted.
    /// </summary>
    public Guid ShippingTaxOverrideId { get; } = shippingTaxOverrideId;

    /// <summary>
    /// The country code of the deleted override (for logging/audit purposes).
    /// </summary>
    public string CountryCode { get; } = countryCode;

    /// <summary>
    /// The state/province code of the deleted override (for logging/audit purposes).
    /// </summary>
    public string? StateOrProvinceCode { get; } = stateOrProvinceCode;
}
