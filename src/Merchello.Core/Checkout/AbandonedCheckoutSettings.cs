namespace Merchello.Core.Checkout;

/// <summary>
/// Configuration settings for abandoned cart recovery feature.
/// </summary>
public class AbandonedCheckoutSettings
{
    /// <summary>
    /// Hours of inactivity before a checkout is considered abandoned.
    /// </summary>
    public double AbandonmentThresholdHours { get; set; } = 1.0;

    /// <summary>
    /// Days after which recovery tokens expire.
    /// </summary>
    public int RecoveryExpiryDays { get; set; } = 30;

    /// <summary>
    /// Interval in minutes between detection job runs.
    /// </summary>
    public int CheckIntervalMinutes { get; set; } = 15;

    /// <summary>
    /// Base URL path for recovery links (customer-facing checkout page).
    /// </summary>
    public string RecoveryUrlBase { get; set; } = "/checkout/recover";

    /// <summary>
    /// Hours to wait after abandonment before sending first recovery email.
    /// </summary>
    public int FirstEmailDelayHours { get; set; } = 1;

    /// <summary>
    /// Hours to wait after first email before sending reminder email.
    /// </summary>
    public int ReminderEmailDelayHours { get; set; } = 24;

    /// <summary>
    /// Hours to wait after reminder email before sending final email.
    /// </summary>
    public int FinalEmailDelayHours { get; set; } = 48;

    /// <summary>
    /// Maximum number of recovery emails to send per abandoned checkout.
    /// </summary>
    public int MaxRecoveryEmails { get; set; } = 3;
}
