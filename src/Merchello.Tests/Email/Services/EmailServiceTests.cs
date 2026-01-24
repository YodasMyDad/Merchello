using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Mail;
using Umbraco.Cms.Core.Models.Email;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Email.Services;

public class EmailServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly MerchelloDbContext _db;
    private readonly Mock<IEmailConfigurationService> _configServiceMock;
    private readonly Mock<IEmailTokenResolver> _tokenResolverMock;
    private readonly Mock<IEmailAttachmentResolver> _attachmentResolverMock;
    private readonly Mock<IEmailSender> _emailSenderMock;
    private readonly EmailService _service;

    public EmailServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<MerchelloDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new MerchelloDbContext(options);
        _db.Database.EnsureCreated();

        var scopeProvider = CreateScopeProvider(_db);

        _configServiceMock = new Mock<IEmailConfigurationService>();
        _tokenResolverMock = new Mock<IEmailTokenResolver>();
        _attachmentResolverMock = new Mock<IEmailAttachmentResolver>();
        _emailSenderMock = new Mock<IEmailSender>();

        // Default token resolver behavior
        _tokenResolverMock
            .Setup(x => x.ResolveTokens<TestOrderNotification>(It.IsAny<string>(), It.IsAny<EmailModel<TestOrderNotification>>()))
            .Returns((string template, EmailModel<TestOrderNotification> _) => template);

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

        var logger = new Mock<ILogger<EmailService>>();

        _service = new EmailService(
            scopeProvider,
            _configServiceMock.Object,
            _tokenResolverMock.Object,
            _attachmentResolverMock.Object,
            _emailSenderMock.Object,
            emailSettings,
            logger.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    #region QueueDeliveryAsync

    [Fact]
    public async Task QueueDelivery_WithTemplateRenderer_CreatesPendingDelivery()
    {
        _service.SetTemplateRenderer((_, _, _) => Task.FromResult("<html>Body</html>"));
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
        var saved = await _db.OutboundDeliveries.FirstOrDefaultAsync(d => d.Id == delivery.Id);
        saved.ShouldNotBeNull();
    }

    [Fact]
    public async Task QueueDelivery_WithoutRenderer_CreatesFailedDelivery()
    {
        // No template renderer set
        var config = CreateEmailConfig();
        var notification = new TestOrderNotification { OrderNumber = "ORD-001" };

        var delivery = await _service.QueueDeliveryAsync(config, notification);

        delivery.Status.ShouldBe(OutboundDeliveryStatus.Failed);
        delivery.ErrorMessage.ShouldNotBeNull();
        delivery.ErrorMessage.ShouldContain("renderer not configured");
    }

    [Fact]
    public async Task QueueDelivery_TemplateRenderError_CreatesFailedDelivery()
    {
        _service.SetTemplateRenderer((_, _, _) => throw new Exception("Template not found"));

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
        _service.SetTemplateRenderer((_, _, _) => Task.FromResult("<html>Body</html>"));

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
        _db.OutboundDeliveries.Add(delivery);
        await _db.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .Returns(Task.CompletedTask);

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeTrue();
        var updated = await _db.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Succeeded);
        updated.DateCompleted.ShouldNotBeNull();
    }

    [Fact]
    public async Task Deliver_SendFails_MarksAsRetrying()
    {
        var delivery = CreatePendingDelivery();
        _db.OutboundDeliveries.Add(delivery);
        await _db.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .ThrowsAsync(new Exception("SMTP timeout"));

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeFalse();
        var updated = await _db.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
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
        _db.OutboundDeliveries.Add(delivery);
        await _db.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .ThrowsAsync(new Exception("Permanent failure"));

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeFalse();
        var updated = await _db.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
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
        _db.OutboundDeliveries.Add(delivery);
        await _db.SaveChangesAsync();

        var result = await _service.DeliverAsync(delivery.Id);

        result.ShouldBeFalse();
    }

    [Fact]
    public async Task Deliver_MissingBody_FailsImmediately()
    {
        var delivery = CreatePendingDelivery();
        delivery.EmailBody = null;
        _db.OutboundDeliveries.Add(delivery);
        await _db.SaveChangesAsync();

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
        _db.OutboundDeliveries.Add(delivery);
        await _db.SaveChangesAsync();

        _emailSenderMock
            .Setup(x => x.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<string>(), true, null))
            .Returns(Task.CompletedTask);

        await _service.ProcessPendingRetriesAsync();

        var updated = await _db.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Succeeded);
    }

    [Fact]
    public async Task ProcessPendingRetries_SkipsFutureRetries()
    {
        var delivery = CreatePendingDelivery();
        delivery.Status = OutboundDeliveryStatus.Retrying;
        delivery.NextRetryUtc = DateTime.UtcNow.AddMinutes(30); // Future
        delivery.AttemptNumber = 1;
        _db.OutboundDeliveries.Add(delivery);
        await _db.SaveChangesAsync();

        await _service.ProcessPendingRetriesAsync();

        var updated = await _db.OutboundDeliveries.FirstAsync(d => d.Id == delivery.Id);
        updated.Status.ShouldBe(OutboundDeliveryStatus.Retrying); // Unchanged
    }

    #endregion

    #region SendImmediateAsync

    [Fact]
    public async Task SendImmediate_Success_ReturnsTrue()
    {
        _service.SetTemplateRenderer((_, _, _) => Task.FromResult("<html>Body</html>"));

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
    public async Task SendImmediate_WithoutRenderer_ReturnsFalse()
    {
        var config = CreateEmailConfig();
        var notification = new TestOrderNotification { OrderNumber = "ORD-001" };

        var result = await _service.SendImmediateAsync(config, notification);

        result.ShouldBeFalse();
    }

    [Fact]
    public async Task SendImmediate_SendFailure_ReturnsFalse()
    {
        _service.SetTemplateRenderer((_, _, _) => Task.FromResult("<html>Body</html>"));

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
        _db.WebhookSubscriptions.Add(new WebhookSubscription
        {
            Id = id,
            Name = "Test Subscription",
            Topic = "order.created",
            TargetUrl = "https://example.com/webhook",
            Secret = "test-secret",
            IsActive = true
        });
        _db.SaveChanges();
    }

    private static IEFCoreScopeProvider<MerchelloDbContext> CreateScopeProvider(MerchelloDbContext db)
    {
        var mock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        mock.Setup(p => p.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

                scopeMock.Setup(s => s.ExecuteWithContextAsync<Task>(It.IsAny<Func<MerchelloDbContext, Task>>()))
                    .Returns((Func<MerchelloDbContext, Task> func) => func(db));

                scopeMock.Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<OutboundDelivery?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<OutboundDelivery?>> func) => func(db));

                scopeMock.Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<OutboundDelivery>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<OutboundDelivery>>> func) => func(db));

                scopeMock.Setup(s => s.Complete()).Returns(true);
                scopeMock.Setup(s => s.Dispose());

                return scopeMock.Object;
            });

        return mock.Object;
    }

    private class TestOrderNotification : MerchelloNotification
    {
        public string OrderNumber { get; set; } = "";
        public string CustomerEmail { get; set; } = "customer@test.com";
    }

    #endregion
}
