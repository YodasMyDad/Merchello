using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerNotifications;

/// <summary>
/// Notification published when a customer requests a password reset.
/// Used to trigger password reset emails.
/// </summary>
public class CustomerPasswordResetRequestedNotification(
    Customer customer,
    string resetToken,
    string resetUrl,
    DateTime expiresUtc) : MerchelloNotification
{
    /// <summary>
    /// The customer requesting the password reset.
    /// </summary>
    public Customer Customer { get; } = customer;

    /// <summary>
    /// The secure reset token.
    /// </summary>
    public string ResetToken { get; } = resetToken;

    /// <summary>
    /// The full URL to the password reset page (includes token).
    /// </summary>
    public string ResetUrl { get; } = resetUrl;

    /// <summary>
    /// When this reset link expires.
    /// </summary>
    public DateTime ExpiresUtc { get; } = expiresUtc;

    /// <summary>
    /// The customer's email address (convenience property).
    /// </summary>
    public string CustomerEmail => Customer.Email;

    /// <summary>
    /// The customer's name (convenience property).
    /// </summary>
    public string CustomerName => $"{Customer.FirstName} {Customer.LastName}".Trim();
}
