using Merchello.Core;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Email.Services;

[Collection("Integration Tests")]
public class EmailTopicRegistryTests : IClassFixture<ServiceTestFixture>
{
    private readonly IEmailTopicRegistry _topicRegistry;

    public EmailTopicRegistryTests(ServiceTestFixture fixture)
    {
        _topicRegistry = fixture.GetService<IEmailTopicRegistry>();
    }

    [Fact]
    public void FulfilmentSupplierOrderTopic_IsRegisteredWithExpectedNotificationType()
    {
        _topicRegistry.TopicExists(Constants.EmailTopics.FulfilmentSupplierOrder).ShouldBeTrue();

        var topic = _topicRegistry.GetTopic(Constants.EmailTopics.FulfilmentSupplierOrder);
        topic.ShouldNotBeNull();
        topic!.Category.ShouldBe("Fulfilment");
        topic.NotificationType.ShouldBe(typeof(SupplierOrderNotification));
    }
}
