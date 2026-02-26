using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Models;

/// <summary>
/// Wrapper model provided to email Razor templates.
/// Contains the notification data plus store context.
/// </summary>
/// <typeparam name="TNotification">The notification type that triggered the email.</typeparam>
public class EmailModel<TNotification> where TNotification : MerchelloNotification
{
    /// <summary>
    /// The notification that triggered this email.
    /// Access notification-specific data (e.g., Order, Customer, Shipment).
    /// </summary>
    public required TNotification Notification { get; init; }

    /// <summary>
    /// Store context with common store information.
    /// </summary>
    public required EmailStoreContext Store { get; init; }

    /// <summary>
    /// The email configuration used to send this email.
    /// </summary>
    public required EmailConfiguration Configuration { get; init; }

    /// <summary>
    /// When this email was generated.
    /// </summary>
    public DateTime GeneratedAtUtc { get; init; } = DateTime.UtcNow;
}
