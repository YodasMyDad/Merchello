using Merchello.Core.Accounting.Models;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.DigitalProducts.Notifications;

/// <summary>
/// Published when digital product download links are ready for delivery.
/// </summary>
public class DigitalProductDeliveredNotification(
    Invoice invoice,
    List<DownloadLink> downloadLinks) : MerchelloNotification
{
    /// <summary>
    /// Gets the invoice containing digital products.
    /// </summary>
    public Invoice Invoice { get; } = invoice;

    /// <summary>
    /// Gets the download links generated for the digital products.
    /// </summary>
    public List<DownloadLink> DownloadLinks { get; } = downloadLinks;
}
