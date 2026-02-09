namespace Merchello.Core.Accounting;

/// <summary>
/// Configuration settings for invoice payment reminders.
/// </summary>
public class InvoiceReminderSettings
{
    /// <summary>
    /// Number of days before due date to send a reminder.
    /// </summary>
    public int ReminderDaysBeforeDue { get; set; } = 7;

    /// <summary>
    /// Interval in days between overdue reminders.
    /// </summary>
    public int OverdueReminderIntervalDays { get; set; } = 7;

    /// <summary>
    /// Maximum number of overdue reminders to send per invoice.
    /// </summary>
    public int MaxOverdueReminders { get; set; } = 3;

    /// <summary>
    /// How often the job checks for invoices needing reminders (in hours).
    /// </summary>
    public int CheckIntervalHours { get; set; } = 24;
}
