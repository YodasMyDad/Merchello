using Merchello.Core;
using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Email;

[Collection("Integration")]
public class EmailNotificationBridgeTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IMerchelloNotificationPublisher _notificationPublisher;

    public EmailNotificationBridgeTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
        _notificationPublisher = fixture.GetService<IMerchelloNotificationPublisher>();
    }

    [Fact]
    public async Task CustomerSavedNotification_QueuesCustomerUpdatedEmailTopic()
    {
        await CreateEmailConfigurationAsync(Constants.EmailTopics.CustomerUpdated, "Customer Updated");
        var customer = _fixture.CreateDataBuilder().CreateCustomer(email: "customer.updated@example.com");
        await _fixture.DbContext.SaveChangesAsync();

        await _notificationPublisher.PublishAsync(new CustomerSavedNotification(customer));

        using var verifyContext = _fixture.CreateDbContext();
        var deliveries = await verifyContext.OutboundDeliveries
            .AsNoTracking()
            .Where(x => x.DeliveryType == OutboundDeliveryType.Email)
            .ToListAsync();

        deliveries.Count.ShouldBe(1);
        deliveries[0].Topic.ShouldBe(Constants.EmailTopics.CustomerUpdated);
    }

    [Fact]
    public async Task ShipmentCreatedNotification_QueuesShipmentCreatedAndPreparingTopics()
    {
        await CreateEmailConfigurationAsync(Constants.EmailTopics.ShipmentCreated, "Shipment Created");
        await CreateEmailConfigurationAsync(Constants.EmailTopics.ShipmentPreparing, "Shipment Preparing");

        var builder = _fixture.CreateDataBuilder();
        var order = builder.CreateOrder();
        var shipment = builder.CreateShipment(order);
        await builder.SaveChangesAsync();

        await _notificationPublisher.PublishAsync(new ShipmentCreatedNotification(shipment));

        using var verifyContext = _fixture.CreateDbContext();
        var topics = await verifyContext.OutboundDeliveries
            .AsNoTracking()
            .Where(x => x.DeliveryType == OutboundDeliveryType.Email)
            .Select(x => x.Topic)
            .ToListAsync();

        topics.ShouldContain(Constants.EmailTopics.ShipmentCreated);
        topics.ShouldContain(Constants.EmailTopics.ShipmentPreparing);
    }

    private async Task CreateEmailConfigurationAsync(string topic, string name)
    {
        _fixture.DbContext.EmailConfigurations.Add(new EmailConfiguration
        {
            Id = Guid.NewGuid(),
            Name = name,
            Topic = topic,
            Enabled = true,
            TemplatePath = "TestTemplate.cshtml",
            ToExpression = "test@example.com",
            SubjectExpression = "Test Subject"
        });

        await _fixture.DbContext.SaveChangesAsync();
    }
}
