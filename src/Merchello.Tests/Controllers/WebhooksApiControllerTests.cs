using Merchello.Controllers;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Webhooks.Services.Parameters;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Controllers;

public class WebhooksApiControllerTests
{
    [Fact]
    public async Task SendTest_WithMissingSubscription_ReturnsNotFound()
    {
        var webhookServiceMock = new Mock<IWebhookService>();
        webhookServiceMock
            .Setup(x => x.GetSubscriptionAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WebhookSubscription?)null);

        var topicRegistryMock = new Mock<IWebhookTopicRegistry>();
        var controller = new WebhooksApiController(webhookServiceMock.Object, topicRegistryMock.Object);

        var result = await controller.SendTest(Guid.NewGuid(), CancellationToken.None);

        result.ShouldBeOfType<NotFoundResult>();
        webhookServiceMock.Verify(
            x => x.SendTestAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetDeliveries_WithStatusesFilter_PassesMultiStatusQueryParameters()
    {
        var capturedParameters = default(OutboundDeliveryQueryParameters);
        var webhookServiceMock = new Mock<IWebhookService>();
        webhookServiceMock
            .Setup(x => x.QueryDeliveriesAsync(It.IsAny<OutboundDeliveryQueryParameters>(), It.IsAny<CancellationToken>()))
            .Callback<OutboundDeliveryQueryParameters, CancellationToken>((parameters, _) => capturedParameters = parameters)
            .ReturnsAsync(new PaginatedList<OutboundDelivery>([], 0, 1, 20));

        var topicRegistryMock = new Mock<IWebhookTopicRegistry>();
        var controller = new WebhooksApiController(webhookServiceMock.Object, topicRegistryMock.Object);

        var subscriptionId = Guid.NewGuid();
        var result = await controller.GetDeliveries(
            subscriptionId,
            OutboundDeliveryStatus.Pending,
            [OutboundDeliveryStatus.Failed, OutboundDeliveryStatus.Abandoned],
            1,
            20,
            CancellationToken.None);

        result.ShouldNotBeNull();
        capturedParameters.ShouldNotBeNull();
        capturedParameters!.ConfigurationId.ShouldBe(subscriptionId);
        capturedParameters.DeliveryType.ShouldBe(OutboundDeliveryType.Webhook);
        capturedParameters.Statuses.ShouldNotBeNull();
        capturedParameters.Statuses!.Count.ShouldBe(2);
        capturedParameters.Statuses.ShouldContain(OutboundDeliveryStatus.Failed);
        capturedParameters.Statuses.ShouldContain(OutboundDeliveryStatus.Abandoned);
    }
}
