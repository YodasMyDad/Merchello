namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Result of processing invoice reminders.
/// </summary>
public record InvoiceReminderResult(int DueSoonRemindersSent, int OverdueRemindersSent);
