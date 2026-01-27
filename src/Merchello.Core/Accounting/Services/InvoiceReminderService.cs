using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

/// <summary>
/// Service that handles invoice reminder processing.
/// </summary>
public class InvoiceReminderService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IPaymentService paymentService,
    IMerchelloNotificationPublisher notificationPublisher,
    ILogger<InvoiceReminderService> logger) : IInvoiceReminderService
{
    // ExtendedData keys for tracking sent reminders
    private const string LastReminderSentKey = "InvoiceReminder:LastSent";
    private const string OverdueReminderCountKey = "InvoiceReminder:OverdueCount";
    private const string LastOverdueReminderSentKey = "InvoiceReminder:LastOverdueSent";

    public async Task<InvoiceReminderResult> ProcessRemindersAsync(
        InvoiceReminderSettings settings,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var reminderCutoff = now.AddDays(settings.ReminderDaysBeforeDue);

        // Get unpaid invoices with due dates
        using var scope = efCoreScopeProvider.CreateScope();
        var invoicesNeedingAttention = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .Include(i => i.Payments)
                .Where(i => !i.IsCancelled && i.DueDate != null && i.DueDate <= reminderCutoff)
                .ToListAsync(cancellationToken));

        var remindersSent = 0;
        var overdueRemindersSent = 0;

        foreach (var invoice in invoicesNeedingAttention)
        {
            // Check payment status
            var paymentStatus = await paymentService.GetInvoicePaymentStatusAsync(invoice.Id, cancellationToken);
            if (paymentStatus == InvoicePaymentStatus.Paid)
            {
                continue; // Already paid, skip
            }

            var dueDate = invoice.DueDate!.Value;
            var isOverdue = dueDate < now;

            if (isOverdue)
            {
                var sent = await TrySendOverdueReminderAsync(scope, invoice, dueDate, now, settings, cancellationToken);
                if (sent) overdueRemindersSent++;
            }
            else
            {
                var sent = await TrySendDueSoonReminderAsync(scope, invoice, dueDate, now, cancellationToken);
                if (sent) remindersSent++;
            }
        }

        scope.Complete();
        return new InvoiceReminderResult(remindersSent, overdueRemindersSent);
    }

    private async Task<bool> TrySendDueSoonReminderAsync(
        IEfCoreScope<MerchelloDbContext> scope,
        Invoice invoice,
        DateTime dueDate,
        DateTime now,
        CancellationToken cancellationToken)
    {
        // Check if we already sent a reminder for this invoice
        if (invoice.ExtendedData.TryGetValue(LastReminderSentKey, out var lastSentValue) &&
            DateTime.TryParse(lastSentValue?.ToString(), out _))
        {
            // Don't send another reminder if we already sent one
            return false;
        }

        var daysUntilDue = (int)Math.Ceiling((dueDate - now).TotalDays);

        // Publish notification
        await notificationPublisher.PublishAsync(
            new InvoiceReminderNotification(invoice, daysUntilDue),
            cancellationToken);

        // Track that we sent a reminder
        invoice.ExtendedData[LastReminderSentKey] = now.ToString("O");
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });

        logger.LogDebug("Sent due-soon reminder for invoice {InvoiceNumber} (due in {Days} days)",
            invoice.InvoiceNumber, daysUntilDue);

        return true;
    }

    private async Task<bool> TrySendOverdueReminderAsync(
        IEfCoreScope<MerchelloDbContext> scope,
        Invoice invoice,
        DateTime dueDate,
        DateTime now,
        InvoiceReminderSettings settings,
        CancellationToken cancellationToken)
    {
        // Get current overdue reminder count
        var overdueCount = 0;
        if (invoice.ExtendedData.TryGetValue(OverdueReminderCountKey, out var countValue) &&
            int.TryParse(countValue?.ToString(), out var parsedCount))
        {
            overdueCount = parsedCount;
        }

        // Check if we've hit max reminders
        if (overdueCount >= settings.MaxOverdueReminders)
        {
            return false;
        }

        // Check if enough time has passed since last overdue reminder
        if (invoice.ExtendedData.TryGetValue(LastOverdueReminderSentKey, out var lastOverdueValue) &&
            DateTime.TryParse(lastOverdueValue?.ToString(), out var lastOverdueSent))
        {
            var daysSinceLastReminder = (now - lastOverdueSent).TotalDays;
            if (daysSinceLastReminder < settings.OverdueReminderIntervalDays)
            {
                return false; // Not enough time has passed
            }
        }

        var daysOverdue = (int)Math.Floor((now - dueDate).TotalDays);
        var reminderNumber = overdueCount + 1;

        // Publish notification
        await notificationPublisher.PublishAsync(
            new InvoiceOverdueNotification(invoice, daysOverdue, reminderNumber),
            cancellationToken);

        // Track that we sent an overdue reminder
        invoice.ExtendedData[OverdueReminderCountKey] = reminderNumber.ToString();
        invoice.ExtendedData[LastOverdueReminderSentKey] = now.ToString("O");
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });

        logger.LogDebug("Sent overdue reminder #{ReminderNumber} for invoice {InvoiceNumber} ({Days} days overdue)",
            reminderNumber, invoice.InvoiceNumber, daysOverdue);

        return true;
    }
}
