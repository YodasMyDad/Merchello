using Merchello.Core.Data;
using Merchello.Core.Shared.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Accounting.Handlers;

/// <summary>
/// Seeds sample data (products, warehouses, invoices) on application startup for development purposes.
/// Delegates to DbSeeder for the actual seeding logic.
/// </summary>
public class SeedDataNotificationHandler(
    IServiceProvider serviceProvider,
    ILogger<SeedDataNotificationHandler> logger,
    IOptions<MerchelloSettings> settings,
    IRuntimeState runtimeState)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        // Skip if Umbraco isn't fully installed/running (tables won't exist yet)
        if (runtimeState.Level != RuntimeLevel.Run)
        {
            logger.LogDebug("Skipping seed data - Umbraco runtime level is {Level}", runtimeState.Level);
            return;
        }

        if (!settings.Value.InstallSeedData)
        {
            logger.LogDebug("Seed data installation disabled via configuration");
            return;
        }

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

