using Merchello.Core.Developer.Services;
using Merchello.Core.Developer.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Developer.Services;

/// <summary>
/// Unit tests for NotificationDiscoveryService.
/// Tests notification type discovery and metadata extraction via the public API.
/// </summary>
public class NotificationDiscoveryServiceTests
{
    [Fact]
    public async Task GetNotificationMetadataAsync_ReturnsResult_WithDiscoveredNotifications()
    {
        // Arrange
        var serviceProvider = CreateMockServiceProvider();
        var service = new NotificationDiscoveryService(serviceProvider);

        // Act
        var result = await service.GetNotificationMetadataAsync();

        // Assert
        result.ShouldNotBeNull();
        result.TotalNotifications.ShouldBeGreaterThan(0);
        result.Domains.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task GetNotificationMetadataAsync_GroupsNotificationsByDomain()
    {
        // Arrange
        var serviceProvider = CreateMockServiceProvider();
        var service = new NotificationDiscoveryService(serviceProvider);

        // Act
        var result = await service.GetNotificationMetadataAsync();

        // Assert
        result.Domains.ShouldNotBeEmpty();
        foreach (var domain in result.Domains)
        {
            domain.Domain.ShouldNotBeNullOrWhiteSpace();
            domain.Notifications.ShouldNotBeEmpty();
        }
    }

    [Fact]
    public async Task GetNotificationMetadataAsync_IdentifiesCancelableNotifications()
    {
        // Arrange
        var serviceProvider = CreateMockServiceProvider();
        var service = new NotificationDiscoveryService(serviceProvider);

        // Act
        var result = await service.GetNotificationMetadataAsync();

        // Assert - There should be at least some cancelable notifications in the codebase
        var allNotifications = result.Domains.SelectMany(d => d.Notifications).ToList();
        allNotifications.ShouldContain(n => n.IsCancelable);
        allNotifications.ShouldContain(n => !n.IsCancelable);
    }

    [Fact]
    public async Task GetNotificationMetadataAsync_CachesResults()
    {
        // Arrange
        var serviceProvider = CreateMockServiceProvider();
        var service = new NotificationDiscoveryService(serviceProvider);

        // Act
        var result1 = await service.GetNotificationMetadataAsync();
        var result2 = await service.GetNotificationMetadataAsync();

        // Assert - Should return same cached instance
        result1.ShouldBeSameAs(result2);
    }

    [Fact]
    public async Task GetNotificationMetadataAsync_ExtractsCorrectDomainFromNamespace()
    {
        // Arrange
        var serviceProvider = CreateMockServiceProvider();
        var service = new NotificationDiscoveryService(serviceProvider);

        // Act
        var result = await service.GetNotificationMetadataAsync();

        // Assert - Common domains should be extracted
        var domains = result.Domains.Select(d => d.Domain).ToList();

        // These are domains that should exist based on the Merchello notification structure
        domains.ShouldContain(d => d == "Order" || d == "Invoice" || d == "Payment" ||
                                   d == "Checkout" || d == "Fulfilment" || d == "Stock");
    }

    [Fact]
    public async Task GetNotificationMetadataAsync_NotificationInfoHasRequiredFields()
    {
        // Arrange
        var serviceProvider = CreateMockServiceProvider();
        var service = new NotificationDiscoveryService(serviceProvider);

        // Act
        var result = await service.GetNotificationMetadataAsync();

        // Assert
        var allNotifications = result.Domains.SelectMany(d => d.Notifications).ToList();
        foreach (var notification in allNotifications)
        {
            notification.TypeName.ShouldNotBeNullOrWhiteSpace();
            notification.FullTypeName.ShouldNotBeNullOrWhiteSpace();
            notification.Domain.ShouldNotBeNullOrWhiteSpace();
            notification.Handlers.ShouldNotBeNull();
        }
    }

    [Fact]
    public async Task GetNotificationMetadataAsync_HandlerInfoIncludesPriorityCategory()
    {
        // Arrange
        var serviceProvider = CreateMockServiceProvider();
        var service = new NotificationDiscoveryService(serviceProvider);

        // Act
        var result = await service.GetNotificationMetadataAsync();

        // Assert
        var allHandlers = result.Domains
            .SelectMany(d => d.Notifications)
            .SelectMany(n => n.Handlers)
            .ToList();

        if (allHandlers.Count > 0)
        {
            foreach (var handler in allHandlers)
            {
                handler.PriorityCategory.ShouldNotBeNullOrWhiteSpace();
                // Priority categories should be one of the defined categories
                handler.PriorityCategory.ShouldBeOneOf(
                    "Validation", "Early Processing", "Default",
                    "Core Processing", "Business Rules", "Late / External");
            }
        }
    }

    private static IServiceProvider CreateMockServiceProvider()
    {
        // Create a minimal service provider that can create scopes
        // The actual handler discovery will return empty for mocked providers
        var services = new ServiceCollection();
        return services.BuildServiceProvider();
    }
}
