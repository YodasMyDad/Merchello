using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Models;

/// <summary>
/// Non-generic version for scenarios where notification type is not known at compile time.
/// </summary>
public class EmailModel
{
    /// <summary>
    /// The notification that triggered this email (cast to specific type as needed).
    /// </summary>
    public required MerchelloNotification Notification { get; init; }

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
