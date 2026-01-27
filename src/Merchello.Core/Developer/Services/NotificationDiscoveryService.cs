using System.Collections.Concurrent;
using System.Reflection;
using Merchello.Core.Developer.Dtos;
using Merchello.Core.Developer.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Base;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Developer.Services;

/// <summary>
/// Discovers notification types and their registered handlers via reflection and DI.
/// Results are cached since notification registration is static at runtime.
/// </summary>
public class NotificationDiscoveryService(IServiceProvider serviceProvider) : INotificationDiscoveryService
{
    private static NotificationDiscoveryResultDto? _cachedResult;
    private static readonly object CacheLock = new();
    private static readonly ConcurrentDictionary<Type, int> PriorityCache = new();

    public Task<NotificationDiscoveryResultDto> GetNotificationMetadataAsync(CancellationToken ct = default)
    {
        if (_cachedResult != null)
            return Task.FromResult(_cachedResult);

        lock (CacheLock)
        {
            if (_cachedResult != null)
                return Task.FromResult(_cachedResult);

            _cachedResult = DiscoverNotifications();
        }

        return Task.FromResult(_cachedResult);
    }

    private NotificationDiscoveryResultDto DiscoverNotifications()
    {
        // Find all Merchello notification types
        var notificationTypes = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => a.FullName?.StartsWith("Merchello", StringComparison.OrdinalIgnoreCase) == true)
            .SelectMany(SafeGetExportedTypes)
            .Where(t => t.IsClass && !t.IsAbstract && IsNotificationType(t))
            .OrderBy(t => t.Name)
            .ToList();

        // Group by domain and build result
        var groups = new Dictionary<string, NotificationDomainGroupDto>();
        var totalHandlers = 0;

        foreach (var notificationType in notificationTypes)
        {
            var domain = ExtractDomain(notificationType);
            var handlers = FindHandlersForNotification(notificationType);
            totalHandlers += handlers.Count;

            var notificationInfo = new NotificationInfoDto
            {
                TypeName = notificationType.Name,
                FullTypeName = notificationType.FullName ?? notificationType.Name,
                Domain = domain,
                IsCancelable = IsCancelableNotification(notificationType),
                Handlers = handlers,
                HasHandlers = handlers.Count > 0
            };

            if (!groups.TryGetValue(domain, out var group))
            {
                group = new NotificationDomainGroupDto
                {
                    Domain = domain,
                    Notifications = []
                };
                groups[domain] = group;
            }

            group.Notifications.Add(notificationInfo);
        }

        return new NotificationDiscoveryResultDto
        {
            Domains = groups.Values.OrderBy(g => g.Domain).ToList(),
            TotalNotifications = notificationTypes.Count,
            TotalHandlers = totalHandlers
        };
    }

    private static IEnumerable<Type> SafeGetExportedTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetExportedTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            return ex.Types.Where(t => t != null)!;
        }
        catch
        {
            return [];
        }
    }

    private static bool IsNotificationType(Type type)
    {
        // Check if type inherits from MerchelloNotification (directly or indirectly)
        var baseType = type.BaseType;
        while (baseType != null)
        {
            if (baseType == typeof(MerchelloNotification))
                return true;

            // Check for generic base type MerchelloCancelableNotification<T>
            if (baseType.IsGenericType &&
                baseType.GetGenericTypeDefinition() == typeof(MerchelloCancelableNotification<>))
                return true;

            if (baseType == typeof(MerchelloSimpleCancelableNotification))
                return true;

            baseType = baseType.BaseType;
        }

        return false;
    }

    private static bool IsCancelableNotification(Type type)
    {
        return typeof(ICancelableNotification).IsAssignableFrom(type);
    }

    private List<NotificationHandlerInfoDto> FindHandlersForNotification(Type notificationType)
    {
        // Build the INotificationAsyncHandler<TNotification> type
        var handlerInterfaceType = typeof(INotificationAsyncHandler<>).MakeGenericType(notificationType);

        try
        {
            using var scope = serviceProvider.CreateScope();
            var handlers = scope.ServiceProvider.GetServices(handlerInterfaceType).ToList();

            var result = new List<NotificationHandlerInfoDto>();
            var executionOrder = 1;

            foreach (var handler in handlers.OrderBy(h => GetHandlerPriority(h!.GetType())))
            {
                if (handler == null) continue;

                var handlerType = handler.GetType();
                var priority = GetHandlerPriority(handlerType);

                result.Add(new NotificationHandlerInfoDto
                {
                    TypeName = handlerType.Name,
                    FullTypeName = handlerType.FullName ?? handlerType.Name,
                    AssemblyName = GetExternalAssemblyName(handlerType),
                    Priority = priority,
                    PriorityCategory = GetPriorityCategory(priority),
                    ExecutionOrder = executionOrder++
                });
            }

            // Detect handlers sharing the same priority within this notification
            var duplicatePriorities = result
                .GroupBy(h => h.Priority)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToHashSet();

            if (duplicatePriorities.Count > 0)
            {
                result = result.Select(h => h with
                {
                    HasDuplicatePriority = duplicatePriorities.Contains(h.Priority)
                }).ToList();
            }

            return result;
        }
        catch
        {
            // If we can't resolve handlers, return empty list
            return [];
        }
    }

    private static int GetHandlerPriority(Type handlerType)
    {
        return PriorityCache.GetOrAdd(handlerType, type =>
        {
            var attribute = type.GetCustomAttribute<NotificationHandlerPriorityAttribute>();
            return attribute?.Priority ?? NotificationHandlerPriorityAttribute.DefaultPriority;
        });
    }

    private static string? GetExternalAssemblyName(Type handlerType)
    {
        var assemblyName = handlerType.Assembly.GetName().Name;

        // Only show assembly name for external handlers (not core Merchello)
        if (assemblyName != null &&
            !assemblyName.StartsWith("Merchello.Core", StringComparison.OrdinalIgnoreCase) &&
            !assemblyName.Equals("Merchello", StringComparison.OrdinalIgnoreCase))
        {
            return assemblyName;
        }

        return null;
    }

    private static string ExtractDomain(Type notificationType)
    {
        var ns = notificationType.Namespace ?? "";

        // Handle standard Merchello.Core.Notifications.{Domain} pattern
        // e.g., Merchello.Core.Notifications.Order -> "Order"
        if (ns.Contains(".Notifications."))
        {
            var parts = ns.Split('.');
            var notificationsIndex = Array.IndexOf(parts, "Notifications");
            if (notificationsIndex >= 0 && notificationsIndex < parts.Length - 1)
            {
                var domain = parts[notificationsIndex + 1];
                // Clean up common suffixes
                return domain.Replace("Notifications", "");
            }
        }

        // Handle feature-specific patterns
        // e.g., Merchello.Core.Fulfilment.Notifications -> "Fulfilment"
        var featurePatterns = new[]
        {
            ("Fulfilment", "Fulfilment"),
            ("DigitalProducts", "DigitalProducts"),
            ("Protocols", "Protocols"),
            ("Checkout", "Checkout"),
            ("Basket", "Basket")
        };

        foreach (var (pattern, domain) in featurePatterns)
        {
            if (ns.Contains($".{pattern}.", StringComparison.OrdinalIgnoreCase) ||
                ns.EndsWith($".{pattern}", StringComparison.OrdinalIgnoreCase))
            {
                return domain;
            }
        }

        // Fallback: try to extract from type name
        var typeName = notificationType.Name;
        if (typeName.EndsWith("Notification"))
        {
            // Try common prefixes
            var prefixes = new[] { "Order", "Invoice", "Payment", "Shipment", "Customer", "Product", "Discount", "Stock", "Checkout", "Basket" };
            foreach (var prefix in prefixes)
            {
                if (typeName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    return prefix;
            }
        }

        return "Other";
    }

    private static string GetPriorityCategory(int priority)
    {
        return priority switch
        {
            < 500 => "Validation",
            < 1000 => "Early Processing",
            1000 => "Default",
            < 1500 => "Core Processing",
            < 2000 => "Business Rules",
            _ => "Late / External"
        };
    }
}
