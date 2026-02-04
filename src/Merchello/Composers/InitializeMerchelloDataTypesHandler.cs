using Merchello.Core.Data;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;

namespace Merchello.Composers;

/// <summary>
/// Ensures required Merchello data types exist when the application starts.
/// </summary>
public class InitializeMerchelloDataTypesHandler(
    MerchelloDataTypeInitializer initializer,
    ILogger<InitializeMerchelloDataTypesHandler> logger,
    IRuntimeState runtimeState)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        if (runtimeState.Level != RuntimeLevel.Run)
        {
            logger.LogDebug("Skipping DataType initialization - Umbraco runtime level is {Level}", runtimeState.Level);
            return;
        }

        try
        {
            var dataTypeKey = await initializer.EnsureProductDescriptionDataTypeExistsAsync(cancellationToken);
            logger.LogInformation("Merchello DataTypes initialized. Product Description DataType: {Key}", dataTypeKey);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to initialize Merchello DataTypes");
        }
    }
}
