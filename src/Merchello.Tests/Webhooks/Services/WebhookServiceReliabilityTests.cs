using System.Net;
using System.Reflection;
using Merchello.Core;
using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Webhooks.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Webhooks.Services;

[Collection("Integration")]
public class WebhookServiceReliabilityTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IWebhookService _webhookService;
    private readonly MockHttpMessageHandler _httpHandler;

    public WebhookServiceReliabilityTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();

        _webhookService = fixture.GetService<IWebhookService>();
        _httpHandler = fixture.GetService<MockHttpMessageHandler>();
    }

    [Fact]
    public async Task DeliverAsync_FirstFailure_UsesFirstRetryDelayAndAttemptOne()
    {
        _httpHandler.ExceptionToThrow = new HttpRequestException("simulated failure");
        var subscription = await CreateSubscriptionAsync(Constants.WebhookTopics.OrderCreated);

        var deliveryId = await _webhookService.QueueDeliveryAsync(
            Constants.WebhookTopics.OrderCreated,
            new { id = Guid.NewGuid() });

        var delivery = await _webhookService.GetDeliveryAsync(deliveryId);
        delivery.ShouldNotBeNull();
        delivery.Status.ShouldBe(OutboundDeliveryStatus.Retrying);
        delivery.AttemptNumber.ShouldBe(1);
        delivery.NextRetryUtc.ShouldNotBeNull();

        var secondsUntilRetry = (delivery.NextRetryUtc!.Value - DateTime.UtcNow).TotalSeconds;
        secondsUntilRetry.ShouldBeGreaterThanOrEqualTo(50);
        secondsUntilRetry.ShouldBeLessThanOrEqualTo(70);
    }

    [Fact]
    public async Task DeliverAsync_AttemptNumberIncrementsAcrossFailures()
    {
        _httpHandler.ExceptionToThrow = new HttpRequestException("simulated failure");
        await CreateSubscriptionAsync(Constants.WebhookTopics.OrderUpdated);

        var deliveryId = await _webhookService.QueueDeliveryAsync(
            Constants.WebhookTopics.OrderUpdated,
            new { id = Guid.NewGuid() });

        var firstAttempt = await _webhookService.GetDeliveryAsync(deliveryId);
        firstAttempt.ShouldNotBeNull();
        firstAttempt.AttemptNumber.ShouldBe(1);
        firstAttempt.Status.ShouldBe(OutboundDeliveryStatus.Retrying);

        await _webhookService.RetryDeliveryAsync(deliveryId);

        var secondAttempt = await _webhookService.GetDeliveryAsync(deliveryId);
        secondAttempt.ShouldNotBeNull();
        secondAttempt.AttemptNumber.ShouldBe(2);
        secondAttempt.Status.ShouldBe(OutboundDeliveryStatus.Retrying);
    }

    [Fact]
    public async Task DeliverAsync_MissingSubscription_DoesNotThrowAndMarksAbandoned()
    {
        var subscription = await CreateSubscriptionAsync(Constants.WebhookTopics.CustomerUpdated);
        var delivery = new OutboundDelivery
        {
            Id = Guid.NewGuid(),
            DeliveryType = OutboundDeliveryType.Webhook,
            ConfigurationId = subscription.Id,
            Topic = subscription.Topic,
            TargetUrl = subscription.TargetUrl,
            RequestBody = """{"test":true}""",
            RequestHeaders = "{}",
            Status = OutboundDeliveryStatus.Pending,
            AttemptNumber = 0,
            DateCreated = DateTime.UtcNow
        };

        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();
        await _webhookService.DeleteSubscriptionAsync(subscription.Id);

        var result = await _webhookService.DeliverAsync(delivery.Id);

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("Subscription");

        var persisted = await _webhookService.GetDeliveryAsync(delivery.Id);
        persisted.ShouldNotBeNull();
        persisted.Status.ShouldBe(OutboundDeliveryStatus.Abandoned);
        persisted.DateCompleted.ShouldNotBeNull();
        persisted.ErrorMessage.ShouldNotBeNull();
        persisted.ErrorMessage.ShouldContain("Subscription");
    }

    [Fact]
    public async Task ProcessPendingRetriesAsync_ProcessesPendingWebhookRows()
    {
        _httpHandler.ResponseStatusCode = HttpStatusCode.OK;
        var subscription = await CreateSubscriptionAsync(Constants.WebhookTopics.ProductUpdated);

        var delivery = new OutboundDelivery
        {
            Id = Guid.NewGuid(),
            DeliveryType = OutboundDeliveryType.Webhook,
            ConfigurationId = subscription.Id,
            Topic = subscription.Topic,
            TargetUrl = subscription.TargetUrl,
            RequestBody = """{"id":"abc"}""",
            RequestHeaders = "{}",
            Status = OutboundDeliveryStatus.Pending,
            AttemptNumber = 0,
            DateCreated = DateTime.UtcNow.AddMinutes(-5)
        };

        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        await _webhookService.ProcessPendingRetriesAsync();

        var persisted = await _webhookService.GetDeliveryAsync(delivery.Id);
        persisted.ShouldNotBeNull();
        persisted.Status.ShouldBe(OutboundDeliveryStatus.Succeeded);
    }

    [Fact]
    public async Task ProcessPendingRetriesAsync_RequeuesStaleSendingRows()
    {
        _httpHandler.ResponseStatusCode = HttpStatusCode.OK;
        var subscription = await CreateSubscriptionAsync(Constants.WebhookTopics.ProductUpdated);

        var delivery = new OutboundDelivery
        {
            Id = Guid.NewGuid(),
            DeliveryType = OutboundDeliveryType.Webhook,
            ConfigurationId = subscription.Id,
            Topic = subscription.Topic,
            TargetUrl = subscription.TargetUrl,
            RequestBody = """{"id":"stale-sending"}""",
            RequestHeaders = "{}",
            Status = OutboundDeliveryStatus.Sending,
            AttemptNumber = 1,
            DateCreated = DateTime.UtcNow.AddMinutes(-20),
            DateSent = DateTime.UtcNow.AddMinutes(-20)
        };

        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        await _webhookService.ProcessPendingRetriesAsync();

        var persisted = await _webhookService.GetDeliveryAsync(delivery.Id);
        persisted.ShouldNotBeNull();
        persisted.Status.ShouldBe(OutboundDeliveryStatus.Succeeded);
        persisted.AttemptNumber.ShouldBe(2);
        _httpHandler.ReceivedRequests.Count.ShouldBe(1);
    }

    [Fact]
    public async Task DeliverAsync_ConcurrentCalls_DoNotSendDuplicateRequests()
    {
        _httpHandler.ResponseStatusCode = HttpStatusCode.OK;
        var subscription = await CreateSubscriptionAsync(Constants.WebhookTopics.InventoryAdjusted);
        var delivery = new OutboundDelivery
        {
            Id = Guid.NewGuid(),
            DeliveryType = OutboundDeliveryType.Webhook,
            ConfigurationId = subscription.Id,
            Topic = subscription.Topic,
            TargetUrl = subscription.TargetUrl,
            RequestBody = """{"sku":"ABC"}""",
            RequestHeaders = "{}",
            Status = OutboundDeliveryStatus.Pending,
            AttemptNumber = 0,
            DateCreated = DateTime.UtcNow
        };

        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        await Task.WhenAll(
            _webhookService.DeliverAsync(delivery.Id),
            _webhookService.DeliverAsync(delivery.Id));

        _httpHandler.ReceivedRequests.Count.ShouldBe(1);
        var persisted = await _webhookService.GetDeliveryAsync(delivery.Id);
        persisted.ShouldNotBeNull();
        persisted.Status.ShouldBe(OutboundDeliveryStatus.Succeeded);
    }

    [Fact]
    public async Task QueueDeliveryAsync_PayloadOverLimit_IsRejectedWithoutSending()
    {
        var subscription = await CreateSubscriptionAsync(Constants.WebhookTopics.DiscountUpdated);
        var oversizedPayload = new { content = new string('x', 1_100_000) };

        var deliveryId = await _webhookService.QueueDeliveryAsync(
            subscription.Topic,
            oversizedPayload,
            Guid.NewGuid(),
            "Discount");

        deliveryId.ShouldNotBe(Guid.Empty);
        _httpHandler.ReceivedRequests.Count.ShouldBe(0);

        var delivery = await _webhookService.GetDeliveryAsync(deliveryId);
        delivery.ShouldNotBeNull();
        delivery.Status.ShouldBe(OutboundDeliveryStatus.Abandoned);
        delivery.ErrorMessage.ShouldNotBeNull();
        delivery.ErrorMessage.ShouldContain("Payload exceeds max size");
    }

    [Fact]
    public async Task OutboundDeliveryCleanup_RemovesOnlyOldTerminalRows()
    {
        var now = DateTime.UtcNow;
        _fixture.DbContext.OutboundDeliveries.AddRange(
            new OutboundDelivery
            {
                Id = Guid.NewGuid(),
                DeliveryType = OutboundDeliveryType.Webhook,
                ConfigurationId = Guid.NewGuid(),
                Topic = "webhook.old.succeeded",
                Status = OutboundDeliveryStatus.Succeeded,
                DateCreated = now.AddDays(-40),
                DateCompleted = now.AddDays(-40)
            },
            new OutboundDelivery
            {
                Id = Guid.NewGuid(),
                DeliveryType = OutboundDeliveryType.Webhook,
                ConfigurationId = Guid.NewGuid(),
                Topic = "webhook.old.retrying",
                Status = OutboundDeliveryStatus.Retrying,
                NextRetryUtc = now.AddMinutes(5),
                DateCreated = now.AddDays(-40)
            },
            new OutboundDelivery
            {
                Id = Guid.NewGuid(),
                DeliveryType = OutboundDeliveryType.Email,
                ConfigurationId = Guid.NewGuid(),
                Topic = "email.old.failed",
                Status = OutboundDeliveryStatus.Failed,
                DateCreated = now.AddDays(-40),
                DateCompleted = now.AddDays(-40)
            },
            new OutboundDelivery
            {
                Id = Guid.NewGuid(),
                DeliveryType = OutboundDeliveryType.Email,
                ConfigurationId = Guid.NewGuid(),
                Topic = "email.old.pending",
                Status = OutboundDeliveryStatus.Pending,
                DateCreated = now.AddDays(-40)
            },
            new OutboundDelivery
            {
                Id = Guid.NewGuid(),
                DeliveryType = OutboundDeliveryType.Webhook,
                ConfigurationId = Guid.NewGuid(),
                Topic = "webhook.recent.succeeded",
                Status = OutboundDeliveryStatus.Succeeded,
                DateCreated = now.AddDays(-2),
                DateCompleted = now.AddDays(-2)
            });

        await _fixture.DbContext.SaveChangesAsync();

        var seedDataState = new Mock<ISeedDataInstallationState>();
        seedDataState.SetupGet(x => x.IsInstalling).Returns(false);

        var job = new OutboundDeliveryJob(
            _fixture.GetService<IServiceScopeFactory>(),
            seedDataState.Object,
            _fixture.GetService<IOptions<WebhookSettings>>(),
            _fixture.GetService<IOptions<EmailSettings>>(),
            new Mock<Umbraco.Cms.Core.Services.IRuntimeState>().Object,
            NullLogger<OutboundDeliveryJob>.Instance);

        var cleanupMethod = typeof(OutboundDeliveryJob).GetMethod(
            "CleanupOldDeliveriesAsync",
            BindingFlags.Instance | BindingFlags.NonPublic);
        cleanupMethod.ShouldNotBeNull();

        var cleanupTask = cleanupMethod!.Invoke(job, [CancellationToken.None]) as Task;
        Assert.NotNull(cleanupTask);
        await cleanupTask!;

        using var verifyContext = _fixture.CreateDbContext();
        var remainingTopics = await verifyContext.OutboundDeliveries
            .AsNoTracking()
            .Select(x => x.Topic)
            .ToListAsync();

        remainingTopics.ShouldNotContain("webhook.old.succeeded");
        remainingTopics.ShouldNotContain("email.old.failed");
        remainingTopics.ShouldContain("webhook.old.retrying");
        remainingTopics.ShouldContain("email.old.pending");
        remainingTopics.ShouldContain("webhook.recent.succeeded");
    }

    private async Task<WebhookSubscription> CreateSubscriptionAsync(string topic)
    {
        var result = await _webhookService.CreateSubscriptionAsync(new CreateWebhookSubscriptionParameters
        {
            Name = $"Test {topic}",
            Topic = topic,
            TargetUrl = "https://example.com/webhook"
        });

        result.ResultObject.ShouldNotBeNull();
        return result.ResultObject!;
    }
}
