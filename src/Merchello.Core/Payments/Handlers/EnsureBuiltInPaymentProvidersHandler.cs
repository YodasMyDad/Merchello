using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Payments.Handlers;

/// <summary>
/// Ensures built-in payment providers (like Manual Payment) exist and are enabled on application startup.
/// Runs on every startup to guarantee core payment functionality is always available.
/// </summary>
public class EnsureBuiltInPaymentProvidersHandler(
    IServiceProvider serviceProvider,
    ILogger<EnsureBuiltInPaymentProvidersHandler> logger,
    IRuntimeState runtimeState)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        // Skip if Umbraco isn't fully installed/running (tables won't exist yet)
        if (runtimeState.Level != RuntimeLevel.Run)
        {
            logger.LogDebug("Skipping payment providers setup - Umbraco runtime level is {Level}", runtimeState.Level);
            return;
        }

        try
        {
            // Create a scope to resolve scoped services
            using var scope = serviceProvider.CreateScope();
            var providerManager = scope.ServiceProvider.GetRequiredService<IPaymentProviderManager>();
            await providerManager.EnsureBuiltInProvidersAsync(cancellationToken);

            logger.LogInformation("Built-in payment providers verified.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to ensure built-in payment providers exist.");
        }
    }
}
