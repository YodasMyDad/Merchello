namespace Merchello.Core.Settings.Models;

public class MerchelloStoreAbandonedCheckoutSettings
{
    public double AbandonmentThresholdHours { get; set; } = 1.0;

    public int RecoveryExpiryDays { get; set; } = 30;

    public int CheckIntervalMinutes { get; set; } = 15;

    public int FirstEmailDelayHours { get; set; } = 1;

    public int ReminderEmailDelayHours { get; set; } = 24;

    public int FinalEmailDelayHours { get; set; } = 48;

    public int MaxRecoveryEmails { get; set; } = 3;
}
