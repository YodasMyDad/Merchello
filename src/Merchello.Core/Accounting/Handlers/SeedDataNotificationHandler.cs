using Merchello.Core.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Accounting.Handlers;

/// <summary>
/// Seeds sample data (products, warehouses, invoices) on application startup for development purposes.
/// Delegates to DbSeeder for the actual seeding logic.
/// </summary>
public class SeedDataNotificationHandler(
    IServiceProvider serviceProvider,
    ILogger<SeedDataNotificationHandler> logger)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        try
        {
            // Create a scope to resolve scoped services
            using var scope = serviceProvider.CreateScope();
            var dbSeeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
            await dbSeeder.SeedAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Merchello seed data: Failed to seed sample data");
        }
    }
}

