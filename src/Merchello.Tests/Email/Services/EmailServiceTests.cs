using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Mail;
using Umbraco.Cms.Core.Models.Email;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Email.Services;

/// <summary>
/// Integration tests for EmailService using the shared ServiceTestFixture
/// with a real SQLite database and Moq for email-specific dependencies.
/// </summary>
[Collection("Integration Tests")]
public class EmailServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly Mock<IEmailConfigurationService> _configServiceMock;
    private readonly Mock<IEmailTokenResolver> _tokenResolverMock;
    private readonly Mock<IEmailAttachmentResolver> _attachmentResolverMock;
    private readonly Mock<IEmailAttachmentStorageService> _attachmentStorageServiceMock;
    private readonly Mock<IEmailTemplateRenderer> _templateRendererMock;
    private readonly Mock<IEmailSender> _emailSenderMock;
    private readonly Mock<ISampleNotificationFactory> _sampleNotificationFactoryMock;
    private readonly EmailService _service;

    public EmailServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _configServiceMock = new Mock<IEmailConfigurationService>();
        _tokenResolverMock = new Mock<IEmailTokenResolver>();
        _attachmentResolverMock = new Mock<IEmailAttachmentResolver>();
        _attachmentStorageServiceMock = new Mock<IEmailAttachmentStorageService>();
        _templateRendererMock = new Mock<IEmailTemplateRenderer>();
        _emailSenderMock = new Mock<IEmailSender>();
        _sampleNotificationFactoryMock = new Mock<ISampleNotificationFactory>();

        // Default token resolver behavior
        _tokenResolverMock
            .Setup(x => x.ResolveTokens<TestOrderNotification>(It.IsAny<string>(), It.IsAny<EmailModel<TestOrderNotification>>()))
            .Returns((string template, EmailModel<TestOrderNotification> _) => template);

        // Default template renderer behavior
        _templateRendererMock
            .Setup(x => x.RenderAsync(It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("<html>Body</html>");

        var emailSettings = Options.Create(new EmailSettings
        {
            Enabled = true,
            DefaultFromAddress = "noreply@store.com",
            MaxRetries = 3,
            RetryDelaysSeconds = [60, 300, 900],
            Store = new EmailStoreSettings
            {
                Name = "Test Store",
                Email = "store@example.com"
            }
        });

        _service = new EmailService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _configServiceMock.Object,
            _tokenResolverMock.Object,
            _attachmentResolverMock.Object,
            _attachmentStorageServiceMock.Object,
            _templateRendererMock.Object,
            _emailSenderMock.Object,
            _sampleNotificationFactoryMock.Object,
            emailSettings,
            NullLogger<EmailService>.Instance);
    }

    #region QueueDeliveryAsync

    [Fact]
    public async Task QueueDelivery_CreatesPendingDelivery()
    {
        _tokenResolverMock
            .Setup(x => x.ResolveTokens<TestOrderNotification>("{{customer.email}}", It.IsAny<EmailModel<TestOrderNotification>>()))
            .Returns("customer@test.com");
        _tokenResolverMock
            .Setup(x => x.ResolveTokens<TestOrderNotification>("Order Confirmation", It.IsAny<EmailModel<TestOrderNotification>>()))
            .Returns("Order Confirmation");

        var config = CreateEmailConfig();
        var notification = new TestOrderNotification { OrderNumber = "ORD-001" };

        var delivery = await _service.QueueDeliveryAsync(config, notification);

        delivery.ShouldNotBeNull();
        delivery.Status.ShouldBe(OutboundDeliveryStatus.Pending);
        delivery.EmailSubject.ShouldBe("Order Confirmation");
        delivery.EmailBody.ShouldBe("<html>Body</html>");
        delivery.DeliveryType.ShouldBe(OutboundDeliveryType.Email);

        // Verify persisted to DB
        _fixture.DbContext.ChangeTracker.Clear();
        var saved = await _fixture.DbContext.OutboundDeliveries.FirstOrDefaultAsync(d => d.Id == delivery.Id);
        saved.ShouldNotBeNull();
    }

    [Fact]
    public async Task QueueDelivery_TemplateRenderError_CreatesFailedDelivery()
    {
        _templateRendererMock
            .Setup(x => x.RenderAsync(It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Template not found"));

        var config = CreateEmailConfig();
        var notification = new TestOrderNotification { OrderNumber = "ORD-001" };

        var delivery = await _service.QueueDeliveryAsync(config, notification);

        delivery.Status.ShouldBe(OutboundDeliveryStatus.Failed);
        delivery.ErrorMessage.ShouldNotBeNull();
        delivery.ErrorMessage.ShouldContain("Template render failed");
    }

    [Fact]
    public async Task QueueDelivery_UsesDefaultFromAddress_WhenNotConfigured()
    {
        var config = CreateEmailConfig();
        config.FromExpression = null; // No from expression

        var notification = new TestOrderNotification { OrderNumber = "ORD-001" };

        var delivery = await _service.QueueDeliveryAsync(config, notification);

        delivery.EmailFrom.ShouldBe("noreply@store.com");
    }

    #endregion

    #region DeliverAsync

    [Fact]
    public async Task Deliver_SuccessfulSend_UpdatesStatusToSucceeded()
    {
        var delivery = CreatePendingDelivery();
        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .Returns(Task.CompletedTask);

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();
        var updated = await _fixture.DbContext.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Succeeded);
        updated.DateCompleted.ShouldNotBeNull();
    }

    [Fact]
    public async Task Deliver_SendFails_MarksAsRetrying()
    {
        var delivery = CreatePendingDelivery();
        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .ThrowsAsync(new Exception("SMTP timeout"));

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeFalse();
        _fixture.DbContext.ChangeTracker.Clear();
        var updated = await _fixture.DbContext.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Retrying);
        updated.AttemptNumber.ShouldBe(1);
        updated.NextRetryUtc.ShouldNotBeNull();
        updated.ErrorMessage.ShouldNotBeNull();
        updated.ErrorMessage.ShouldContain("SMTP timeout");
    }

    [Fact]
    public async Task Deliver_MaxRetriesExhausted_MarksAsFailed()
    {
        var delivery = CreatePendingDelivery();
        delivery.AttemptNumber = 2; // Already tried twice, this will be attempt 3 (max)
        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .ThrowsAsync(new Exception("Permanent failure"));

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeFalse();
        _fixture.DbContext.ChangeTracker.Clear();
        var updated = await _fixture.DbContext.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Failed);
        updated.DateCompleted.ShouldNotBeNull();
    }

    [Fact]
    public async Task Deliver_NonExistentId_ReturnsFalse()
    {
        var result = await _service.DeliverAsync(Guid.NewGuid());
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task Deliver_MissingRecipients_FailsImmediately()
    {
        var delivery = CreatePendingDelivery();
        delivery.EmailRecipients = "";
        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeFalse();
    }

    [Fact]
    public async Task Deliver_MissingBody_FailsImmediately()
    {
        var delivery = CreatePendingDelivery();
        delivery.EmailBody = null;
        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeFalse();
    }

    #endregion

    #region ProcessPendingRetriesAsync

    [Fact]
    public async Task ProcessPendingRetries_RetriesEligibleDeliveries()
    {
        var delivery = CreatePendingDelivery();
        delivery.Status = OutboundDeliveryStatus.Retrying;
        delivery.NextRetryUtc = DateTime.UtcNow.AddMinutes(-5); // Past due
        delivery.AttemptNumber = 1;
        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .Returns(Task.CompletedTask);

        await _service.ProcessPendingRetriesAsync();

        _fixture.DbContext.ChangeTracker.Clear();
        var updated = await _fixture.DbContext.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Succeeded);
    }

    [Fact]
    public async Task ProcessPendingRetries_SkipsFutureRetries()
    {
        var delivery = CreatePendingDelivery();
        delivery.Status = OutboundDeliveryStatus.Retrying;
        delivery.NextRetryUtc = DateTime.UtcNow.AddMinutes(30); // Future
        delivery.AttemptNumber = 1;
        _fixture.DbContext.OutboundDeliveries.Add(delivery);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.ProcessPendingRetriesAsync();

        _fixture.DbContext.ChangeTracker.Clear();
        var updated = await _fixture.DbContext.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Retrying); // Unchanged
    }

    #endregion

    #region SendImmediateAsync

    [Fact]
    public async Task SendImmediate_Success_ReturnsTrue()
    {
        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .Returns(Task.CompletedTask);
        _configServiceMock
            .Setup(x => x.IncrementSentCountAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var config = CreateEmailConfig();
        var notification = new TestOrderNotification { OrderNumber = "ORD-001" };

        var result = await _service.SendImmediateAsync(config, notification);

        result.ShouldBeTrue();
        _emailSenderMock.Verify(x => x.SendAsync(It.IsAny<EmailMessage>(), "MerchelloEmail", true, null), Times.Once);
    }

    [Fact]
    public async Task SendImmediate_SendFailure_ReturnsFalse()
    {
        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .ThrowsAsync(new Exception("SMTP error"));
        _configServiceMock
            .Setup(x => x.IncrementFailedCountAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var config = CreateEmailConfig();
        var notification = new TestOrderNotification { OrderNumber = "ORD-001" };

        var result = await _service.SendImmediateAsync(config, notification);

        result.ShouldBeFalse();
    }

    #endregion

    #region GetStoreContext

    [Fact]
    public void GetStoreContext_ReturnsConfiguredSettings()
    {
        var context = _service.GetStoreContext();

        context.Name.ShouldBe("Test Store");
        context.Email.ShouldBe("store@example.com");
    }

    #endregion

    #region Helpers

    private EmailConfiguration CreateEmailConfig()
    {
        var id = Guid.NewGuid();
        SeedWebhookSubscription(id);
        return new EmailConfiguration
        {
            Id = id,
            Topic = "order.created",
            ToExpression = "{{customer.email}}",
            SubjectExpression = "Order Confirmation",
            TemplatePath = "/Views/Emails/OrderConfirmation.cshtml",
            Enabled = true,
            AttachmentAliases = []
        };
    }

    private OutboundDelivery CreatePendingDelivery()
    {
        var configId = Guid.NewGuid();
        SeedWebhookSubscription(configId);
        return new OutboundDelivery
        {
            Id = Guid.NewGuid(),
            DeliveryType = OutboundDeliveryType.Email,
            ConfigurationId = configId,
            Topic = "order.created",
            Status = OutboundDeliveryStatus.Pending,
            EmailRecipients = "customer@test.com",
            EmailSubject = "Test Subject",
            EmailFrom = "noreply@store.com",
            EmailBody = "<html>Test body</html>",
            DateCreated = DateTime.UtcNow,
            AttemptNumber = 0,
            ExtendedData = new Dictionary<string, object>()
        };
    }

    private void SeedWebhookSubscription(Guid id)
    {
        _fixture.DbContext.WebhookSubscriptions.Add(new WebhookSubscription
        {
            Id = id,
            Name = "Test Subscription",
            Topic = "order.created",
            TargetUrl = "https://example.com/webhook",
            Secret = "test-secret",
            IsActive = true
        });
        _fixture.DbContext.SaveChanges();
    }

    private class TestOrderNotification : MerchelloNotification
    {
        public string OrderNumber { get; set; } = "";
        public string CustomerEmail { get; set; } = "customer@test.com";
    }

    #endregion
}
