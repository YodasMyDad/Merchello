namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Result of processing invoice reminders.
/// </summary>
public record InvoiceReminderResult(int DueSoonRemindersSent, int OverdueRemindersSent);
