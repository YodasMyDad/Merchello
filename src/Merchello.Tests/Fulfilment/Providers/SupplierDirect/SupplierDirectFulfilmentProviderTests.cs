using Merchello.Core;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.SupplierDirect;

public class SupplierDirectFulfilmentProviderTests
{
    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsNoProviderLevelFields()
    {
        var provider = CreateProvider(
            new Mock<IEmailConfigurationService>().Object,
            new Mock<IEmailService>().Object,
            new Mock<IFtpClientFactory>().Object);

        var fields = (await provider.GetConfigurationFieldsAsync()).ToList();

        fields.ShouldBeEmpty();
    }

    [Fact]
    public async Task SubmitOrderAsync_Email_ReturnsEmailReferenceWithOutboundDeliveryId()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();
        var deliveryId = Guid.NewGuid();

        emailConfigurationService
            .Setup(x => x.GetEnabledByTopicAsync(Constants.EmailTopics.FulfilmentSupplierOrder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new EmailConfiguration
                {
                    Id = Guid.NewGuid(),
                    Name = "Supplier Order",
                    Topic = Constants.EmailTopics.FulfilmentSupplierOrder,
                    Enabled = true,
                    TemplatePath = "SupplierOrder.cshtml",
                    ToExpression = "placeholder@example.com",
                    SubjectExpression = "placeholder"
                }
            ]);

        emailService
            .Setup(x => x.QueueDeliveryAsync(
                It.Is<EmailConfiguration>(c => c.ToExpression == "orders@supplier.test"),
                It.IsAny<SupplierOrderNotification>(),
                It.IsAny<Guid?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OutboundDelivery
            {
                Id = deliveryId,
                Status = OutboundDeliveryStatus.Pending
            });

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var request = CreateRequest();
        request.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = CreateEmailProfile("orders@supplier.test").ToJson();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeTrue();
        result.ProviderReference.ShouldBe($"email:{deliveryId}");
    }

    [Fact]
    public async Task SubmitOrderAsync_Ftp_UsesTransportAndReturnsFtpReference()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();
        var ftpClient = new Mock<IFtpClient>();

        ftpClientFactory
            .Setup(x => x.CreateClientAsync(
                It.Is<FtpConnectionSettings>(settings =>
                    !settings.UseSftp &&
                    settings.Host == "ftp.supplier.test" &&
                    settings.UseTls &&
                    settings.UsePassiveMode &&
                    settings.TimeoutSeconds == SupplierDirectProviderDefaults.DefaultTimeoutSeconds),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.UploadFileAsync(It.IsAny<string>(), It.IsAny<byte[]>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var request = CreateRequest();
        request.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = CreateFtpProfile().ToJson();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeTrue();
        result.ProviderReference.ShouldNotBeNull();
        result.ProviderReference.ShouldStartWith("ftp:/orders/");

        ftpClient.Verify(
            x => x.UploadFileAsync(
                It.Is<string>(path => path.StartsWith("/orders/") && path.EndsWith(".csv")),
                It.Is<byte[]>(content => content.Length > 0),
                false,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SubmitOrderAsync_Ftp_WhenFileAlreadyExists_TreatsAsIdempotentSuccess()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();
        var ftpClient = new Mock<IFtpClient>();

        ftpClientFactory
            .Setup(x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.UploadFileAsync(It.IsAny<string>(), It.IsAny<byte[]>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        ftpClient
            .Setup(x => x.FileExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var request = CreateRequest();
        request.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = CreateFtpProfile().ToJson();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeTrue();
        result.ProviderReference.ShouldStartWith("ftp:/orders/");
        ftpClient.Verify(x => x.FileExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitOrderAsync_Ftp_WhenUploadFailsAndFileMissing_ReturnsFailure()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();
        var ftpClient = new Mock<IFtpClient>();

        ftpClientFactory
            .Setup(x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.UploadFileAsync(It.IsAny<string>(), It.IsAny<byte[]>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        ftpClient
            .Setup(x => x.FileExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var request = CreateRequest();
        request.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = CreateFtpProfile().ToJson();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("Failed to upload supplier order file");
    }

    [Fact]
    public async Task SubmitOrderAsync_UsesSupplierProfileOverride_WhenPresent()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();
        var ftpClient = new Mock<IFtpClient>();

        ftpClientFactory
            .Setup(x => x.CreateClientAsync(
                It.Is<FtpConnectionSettings>(settings => settings.UseSftp && settings.Host == "sftp.supplier.test"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.UploadFileAsync(It.IsAny<string>(), It.IsAny<byte[]>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var request = CreateRequest();
        request.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = CreateSftpProfile().ToJson();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeTrue();
        result.ProviderReference.ShouldStartWith("sftp:/sftp-orders/");
    }

    [Fact]
    public async Task TestConnectionAsync_ReturnsSuccessWithoutEmailTopicConfiguration()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();

        emailConfigurationService
            .Setup(x => x.GetEnabledByTopicAsync(Constants.EmailTopics.FulfilmentSupplierOrder, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var result = await provider.TestConnectionAsync();

        result.Success.ShouldBeTrue();
        result.AccountName.ShouldNotBeNull();
        result.AccountName.ShouldContain("per-supplier only");
    }

    [Fact]
    public async Task SubmitOrderAsync_Email_ReturnsConfigurationErrorWhenNoRecipientCanBeResolved()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var request = CreateRequest();
        request.ExtendedData["SupplierContactEmail"] = string.Empty;
        request.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = CreateEmailProfile(null).ToJson();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeFalse();
        result.ErrorCode.ShouldBe(ErrorClassification.ConfigurationError.ToString());
        emailConfigurationService.Verify(
            x => x.GetEnabledByTopicAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SubmitOrderAsync_ReturnsConfigurationErrorWhenSupplierProfileMissing()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();

        var provider = CreateProvider(emailConfigurationService.Object, emailService.Object, ftpClientFactory.Object);
        await ConfigureProviderAsync(provider);

        var request = CreateRequest();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeFalse();
        result.ErrorCode.ShouldBe(ErrorClassification.ConfigurationError.ToString());
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("missing a Supplier Direct delivery profile");
        emailConfigurationService.Verify(
            x => x.GetEnabledByTopicAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        ftpClientFactory.Verify(
            x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static SupplierDirectFulfilmentProvider CreateProvider(
        IEmailConfigurationService emailConfigurationService,
        IEmailService emailService,
        IFtpClientFactory ftpClientFactory)
    {
        return new SupplierDirectFulfilmentProvider(
            emailConfigurationService,
            emailService,
            ftpClientFactory,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);
    }

    private static async Task ConfigureProviderAsync(SupplierDirectFulfilmentProvider provider)
    {
        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey
        });
    }

    private static SupplierDirectProfile CreateEmailProfile(string? recipientEmail)
    {
        return new SupplierDirectProfile
        {
            DeliveryMethod = SupplierDirectDeliveryMethod.Email,
            EmailSettings = new EmailDeliverySettings
            {
                RecipientEmail = recipientEmail
            }
        };
    }

    private static SupplierDirectProfile CreateFtpProfile()
    {
        return new SupplierDirectProfile
        {
            DeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
            FtpSettings = new FtpDeliverySettings
            {
                Host = "ftp.supplier.test",
                Username = "ftp-user",
                Password = "ftp-pass",
                RemotePath = "/orders",
                Port = 21,
                UseSftp = false
            }
        };
    }

    private static SupplierDirectProfile CreateSftpProfile()
    {
        return new SupplierDirectProfile
        {
            DeliveryMethod = SupplierDirectDeliveryMethod.Sftp,
            FtpSettings = new FtpDeliverySettings
            {
                Host = "sftp.supplier.test",
                Username = "sftp-user",
                Password = "sftp-pass",
                RemotePath = "/sftp-orders",
                Port = 22,
                UseSftp = true
            }
        };
    }

    private static FulfilmentOrderRequest CreateRequest()
    {
        return new FulfilmentOrderRequest
        {
            OrderId = Guid.NewGuid(),
            OrderNumber = "ORD-1001",
            ShippingAddress = new FulfilmentAddress
            {
                Name = "Test Customer",
                AddressOne = "123 Test Street",
                TownCity = "London",
                PostalCode = "SW1A 1AA",
                CountryCode = "GB"
            },
            LineItems =
            [
                new FulfilmentLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    Sku = "SKU-001",
                    Name = "Product A",
                    Quantity = 2,
                    UnitPrice = 19.99m
                }
            ],
            ExtendedData = new Dictionary<string, object>
            {
                ["SupplierName"] = "Supplier Inc",
                ["SupplierContactEmail"] = "orders@supplier.test"
            }
        };
    }
}
