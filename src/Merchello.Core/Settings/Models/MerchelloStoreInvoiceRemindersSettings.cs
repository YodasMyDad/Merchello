namespace Merchello.Core.Settings.Models;

public class MerchelloStoreInvoiceRemindersSettings
{
    public int ReminderDaysBeforeDue { get; set; } = 7;

    public int OverdueReminderIntervalDays { get; set; } = 7;

    public int MaxOverdueReminders { get; set; } = 3;

    public int CheckIntervalHours { get; set; } = 24;
}
