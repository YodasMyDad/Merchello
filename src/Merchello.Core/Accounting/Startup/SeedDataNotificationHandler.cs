using Merchello.Core.Accounting.ExtensionMethods;
using Merchello.Core.Data;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Startup;

/// <summary>
/// Seeds sample invoice/order data on application startup for development purposes.
/// Only runs if no invoices exist in the database.
/// </summary>
public class SeedDataNotificationHandler(
    IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
    IOptions<MerchSettings> settings,
    ILogger<SeedDataNotificationHandler> logger)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        logger.LogInformation("Merchello seed data: Checking if seed data is needed...");

        try
        {
            using var scope = scopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<Task>(async db =>
            {
                // Only seed if no invoices exist (idempotent)
                var hasInvoices = await db.Invoices.AnyAsync(cancellationToken);
                if (hasInvoices)
                {
                    logger.LogInformation("Merchello seed data: Invoices already exist, skipping seed");
                    return;
                }

                logger.LogInformation("Merchello seed data: Seeding sample invoice data...");

                // Get invoice prefix from settings
                var prefix = settings.Value.InvoiceNumberPrefix ?? "INV-";

                // Seed sample invoices
                db.SeedSampleInvoices(prefix);

                await db.SaveChangesAsync(cancellationToken);

                var count = await db.Invoices.CountAsync(cancellationToken);
                logger.LogInformation("Merchello seed data: Created {Count} sample invoices", count);
            });
            scope.Complete();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Merchello seed data: Failed to seed sample data");
        }
    }
}
