using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core;
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

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Email
            }.ToJson()
        });

        var result = await provider.SubmitOrderAsync(CreateRequest());

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
            .Setup(x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.UploadFileAsync(It.IsAny<string>(), It.IsAny<byte[]>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
                AllowInsecureFtp = true,
                FtpHost = "ftp.supplier.test",
                FtpUsername = "ftp-user",
                FtpPassword = "ftp-pass",
                FtpRemotePath = "/orders"
            }.ToJson()
        });

        var result = await provider.SubmitOrderAsync(CreateRequest());

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
    public async Task SubmitOrderAsync_Ftp_FailsWhenInsecureFtpNotExplicitlyEnabled()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
                FtpUseTls = false,
                FtpHost = "ftp.supplier.test",
                FtpUsername = "ftp-user",
                FtpPassword = "ftp-pass",
                FtpRemotePath = "/orders"
            }.ToJson()
        });

        var result = await provider.SubmitOrderAsync(CreateRequest());

        result.Success.ShouldBeFalse();
        result.ErrorCode.ShouldBe(ErrorClassification.ConfigurationError.ToString());
        ftpClientFactory.Verify(
            x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SubmitOrderAsync_Ftp_WithTls_DoesNotRequireInsecureOptIn()
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
            .ReturnsAsync(true);

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
                FtpUseTls = true,
                AllowInsecureFtp = false,
                FtpHost = "ftp.supplier.test",
                FtpUsername = "ftp-user",
                FtpPassword = "ftp-pass",
                FtpRemotePath = "/orders"
            }.ToJson()
        });

        var result = await provider.SubmitOrderAsync(CreateRequest());

        result.Success.ShouldBeTrue();
        result.ProviderReference.ShouldStartWith("ftp:/orders/");
        ftpClientFactory.Verify(
            x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SubmitOrderAsync_Ftp_WhenFileAlreadyExistsAndOverwriteDisabled_TreatsAsIdempotentSuccess()
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

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
                AllowInsecureFtp = true,
                FtpHost = "ftp.supplier.test",
                FtpUsername = "ftp-user",
                FtpPassword = "ftp-pass",
                FtpRemotePath = "/orders",
                FtpOverwriteExistingFiles = false
            }.ToJson()
        });

        var result = await provider.SubmitOrderAsync(CreateRequest());

        result.Success.ShouldBeTrue();
        result.ProviderReference.ShouldStartWith("ftp:/orders/");
        ftpClient.Verify(x => x.FileExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitOrderAsync_Ftp_WhenOverwriteEnabledAndUploadFails_ReturnsFailure()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();
        var ftpClient = new Mock<IFtpClient>();

        ftpClientFactory
            .Setup(x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.UploadFileAsync(It.IsAny<string>(), It.IsAny<byte[]>(), true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        ftpClient
            .Setup(x => x.FileExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
                AllowInsecureFtp = true,
                FtpHost = "ftp.supplier.test",
                FtpUsername = "ftp-user",
                FtpPassword = "ftp-pass",
                FtpRemotePath = "/orders",
                FtpOverwriteExistingFiles = true
            }.ToJson()
        });

        var result = await provider.SubmitOrderAsync(CreateRequest());

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("Failed to upload supplier order file");
        ftpClient.Verify(x => x.FileExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
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
                It.Is<FtpConnectionSettings>(settings => settings.UseSftp),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.UploadFileAsync(It.IsAny<string>(), It.IsAny<byte[]>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Email
            }.ToJson()
        });

        var request = CreateRequest();
        var profile = new SupplierDirectProfile
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
        request.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = profile.ToJson();

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeTrue();
        result.ProviderReference.ShouldStartWith("sftp:/sftp-orders/");
    }

    [Fact]
    public async Task TestConnectionAsync_Email_ReturnsFailureWhenNoEmailTopicConfigurationExists()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();

        emailConfigurationService
            .Setup(x => x.GetEnabledByTopicAsync(Constants.EmailTopics.FulfilmentSupplierOrder, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Email
            }.ToJson()
        });

        var result = await provider.TestConnectionAsync();

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain(Constants.EmailTopics.FulfilmentSupplierOrder);
    }

    [Fact]
    public async Task SubmitOrderAsync_Email_ReturnsConfigurationErrorWhenNoRecipientCanBeResolved()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Email,
                DefaultSupplierEmail = null
            }.ToJson()
        });

        var request = CreateRequest();
        request.ExtendedData["SupplierContactEmail"] = string.Empty;

        var result = await provider.SubmitOrderAsync(request);

        result.Success.ShouldBeFalse();
        result.ErrorCode.ShouldBe(ErrorClassification.ConfigurationError.ToString());
        emailConfigurationService.Verify(
            x => x.GetEnabledByTopicAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task TestConnectionAsync_Ftp_ReturnsFailureWhenPlainFtpNotExplicitlyEnabled()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
                AllowInsecureFtp = false,
                FtpUseTls = false,
                FtpHost = "ftp.supplier.test",
                FtpUsername = "user",
                FtpPassword = "password"
            }.ToJson()
        });

        var result = await provider.TestConnectionAsync();

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("requires explicit opt-in");
        ftpClientFactory.Verify(
            x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task TestConnectionAsync_FtpWithTls_DoesNotRequireInsecureOptIn()
    {
        var emailConfigurationService = new Mock<IEmailConfigurationService>();
        var emailService = new Mock<IEmailService>();
        var ftpClientFactory = new Mock<IFtpClientFactory>();
        var ftpClient = new Mock<IFtpClient>();

        ftpClientFactory
            .Setup(x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClient.Object);

        ftpClient
            .Setup(x => x.TestConnectionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(FtpTestResult.Succeeded());

        var provider = new SupplierDirectFulfilmentProvider(
            emailConfigurationService.Object,
            emailService.Object,
            ftpClientFactory.Object,
            new Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);

        await provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = SupplierDirectProviderDefaults.ProviderKey,
            SettingsJson = new SupplierDirectSettings
            {
                DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
                FtpUseTls = true,
                AllowInsecureFtp = false,
                FtpHost = "ftp.supplier.test",
                FtpUsername = "user",
                FtpPassword = "password",
                FtpRemotePath = "/orders"
            }.ToJson()
        });

        var result = await provider.TestConnectionAsync();

        result.Success.ShouldBeTrue();
        ftpClientFactory.Verify(
            x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()),
            Times.Once);
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
