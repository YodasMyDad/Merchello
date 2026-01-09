using Merchello.Core.Accounting;

namespace Merchello.Core.Accounting.Services.Interfaces;

/// <summary>
/// Service for processing invoice payment reminders.
/// </summary>
public interface IInvoiceReminderService
{
    /// <summary>
    /// Process invoice reminders based on the provided settings.
    /// Sends due-soon and overdue notifications as needed.
    /// </summary>
    /// <param name="settings">The reminder settings to use</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result containing counts of reminders sent</returns>
    Task<InvoiceReminderResult> ProcessRemindersAsync(
        InvoiceReminderSettings settings,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of processing invoice reminders.
/// </summary>
public record InvoiceReminderResult(int DueSoonRemindersSent, int OverdueRemindersSent);
