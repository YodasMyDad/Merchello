using Merchello.Core.Data.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Data.Handlers;

/// <summary>
/// Notification handler that runs Merchello EF Core migrations on Umbraco application startup.
/// Selects the correct migration provider based on the configured database provider.
/// </summary>
public class RunMerchMigration(
    IEnumerable<IMerchelloMigrationProvider> migrationProviders,
    IOptions<ConnectionStrings> connectionStrings,
    IRuntimeState runtimeState,
    ILogger<RunMerchMigration> logger)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        if (runtimeState.Level != RuntimeLevel.Run)
        {
            logger.LogDebug("Skipping Merchello migration - Umbraco runtime level is {Level}", runtimeState.Level);
            return;
        }

        var providerName = connectionStrings.Value.ProviderName;
        var providers = migrationProviders.ToList();

        logger.LogInformation("Merchello migration: ProviderName={ProviderName}, Available providers: {Providers}",
            providerName ?? "(null)",
            providers.Count > 0 ? string.Join(", ", providers.Select(p => p.ProviderName)) : "(none)");

        if (string.IsNullOrEmpty(providerName))
        {
            logger.LogWarning("Merchello migration: No database provider name configured, skipping migrations");
            return;
        }

        // Handle SQLite provider name variations
        var provider = providers.FirstOrDefault(x =>
            x.ProviderName.Equals(providerName, StringComparison.OrdinalIgnoreCase) ||
            (x.ProviderName == "Microsoft.Data.Sqlite" && providerName is "Microsoft.Data.SQLite" or "Microsoft.Data.Sqlite"));

        if (provider is not null)
        {
            logger.LogInformation("Merchello migration: Running migrations using {Provider}", provider.ProviderName);
            await provider.MigrateAsync(cancellationToken);
            logger.LogInformation("Merchello migration: Completed successfully");
        }
        else
        {
            logger.LogWarning("Merchello migration: No matching provider found for {ProviderName}", providerName);
        }
    }
}

