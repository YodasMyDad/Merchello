using System.Collections.Concurrent;
using System.Reflection;
using Merchello.Core.Notifications.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Notifications;

// NOTE: The Notifications folder uses a domain-based structure (Invoice/, Order/, Payment/, etc.)
// rather than the standard feature folder pattern. This is intentional for discoverability of
// notification types by domain area. See Developer-Guidelines.md for details.

/// <summary>
/// Priority-aware notification publisher for Merchello.
/// Resolves handlers from DI and executes them in priority order.
/// </summary>
public class MerchelloNotificationPublisher(
    IServiceProvider serviceProvider,
    ILogger<MerchelloNotificationPublisher> logger) : IMerchelloNotificationPublisher
{
    private static readonly ConcurrentDictionary<Type, int> PriorityCache = new();

    public async Task PublishAsync<TNotification>(TNotification notification, CancellationToken cancellationToken = default)
        where TNotification : INotification
    {
        // Create scope that lives for the duration of handler execution
        using var scope = serviceProvider.CreateScope();
        var handlers = GetOrderedHandlers<TNotification>(scope.ServiceProvider);

        foreach (var handler in handlers)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            try
            {
                await handler.HandleAsync(notification, cancellationToken);
            }
            catch (Exception ex)
            {
                // Log error but continue to next handler - fail gracefully
                logger.LogError(ex, "Error executing notification handler {HandlerType} for {NotificationType}. Continuing with remaining handlers.",
                    handler.GetType().Name, typeof(TNotification).Name);
            }
        }
    }

    public async Task<bool> PublishCancelableAsync<TNotification>(TNotification notification, CancellationToken cancellationToken = default)
        where TNotification : ICancelableNotification
    {
        // Create scope that lives for the duration of handler execution
        using var scope = serviceProvider.CreateScope();
        var handlers = GetOrderedHandlers<TNotification>(scope.ServiceProvider);

        foreach (var handler in handlers)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            try
            {
                await handler.HandleAsync(notification, cancellationToken);

                if (notification.Cancel)
                {
                    logger.LogInformation(
                        "Notification {NotificationType} cancelled by handler {HandlerType}",
                        typeof(TNotification).Name, handler.GetType().Name);
                    return true;
                }
            }
            catch (Exception ex)
            {
                // Log error but continue to next handler - fail gracefully
                logger.LogError(ex, "Error executing notification handler {HandlerType} for {NotificationType}. Continuing with remaining handlers.",
                    handler.GetType().Name, typeof(TNotification).Name);
            }
        }

        return notification.Cancel;
    }

    private List<INotificationAsyncHandler<TNotification>> GetOrderedHandlers<TNotification>(IServiceProvider scopedProvider)
        where TNotification : INotification
    {
        var handlers = scopedProvider.GetServices<INotificationAsyncHandler<TNotification>>().ToList();

        if (handlers.Count == 0)
            return [];

        // Sort by priority (lower values first)
        return handlers
            .OrderBy(h => GetHandlerPriority(h.GetType()))
            .ToList();
    }

    private static int GetHandlerPriority(Type handlerType)
    {
        return PriorityCache.GetOrAdd(handlerType, type =>
        {
            var attribute = type.GetCustomAttribute<NotificationHandlerPriorityAttribute>();
            return attribute?.Priority ?? NotificationHandlerPriorityAttribute.DefaultPriority;
        });
    }
}
