using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments.Services;

public class PaymentLinkServiceTests
{
    private readonly Mock<IEFCoreScopeProvider<MerchelloDbContext>> _scopeProviderMock;
    private readonly Mock<IPaymentProviderManager> _providerManagerMock;
    private readonly Mock<IPaymentService> _paymentServiceMock;
    private readonly Mock<ILogger<PaymentLinkService>> _loggerMock;

    public PaymentLinkServiceTests()
    {
        _scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        _providerManagerMock = new Mock<IPaymentProviderManager>();
        _paymentServiceMock = new Mock<IPaymentService>();
        _loggerMock = new Mock<ILogger<PaymentLinkService>>();
    }

    private PaymentLinkService CreateService() =>
        new(_scopeProviderMock.Object, _providerManagerMock.Object, _paymentServiceMock.Object, _loggerMock.Object);

    #region CreatePaymentLinkAsync

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenProviderNotFound()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        _providerManagerMock
            .Setup(m => m.GetProviderAsync("nonexistent", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredPaymentProvider?)null);

        var service = CreateService();

        // Act
        var result = await service.CreatePaymentLinkAsync(invoiceId, "nonexistent", "admin");

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("not found or not enabled"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenProviderDoesNotSupportPaymentLinks()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "manual",
            DisplayName = "Manual Payment",
            SupportsPaymentLinks = false
        });

        var setting = new PaymentProviderSetting { ProviderAlias = "manual", DisplayName = "Manual Payment", IsEnabled = true };
        var registeredProvider = new RegisteredPaymentProvider(mockProvider.Object, setting);

        _providerManagerMock
            .Setup(m => m.GetProviderAsync("manual", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        var service = CreateService();

        // Act
        var result = await service.CreatePaymentLinkAsync(invoiceId, "manual", "admin");

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("does not support payment links"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenInvoiceNotFound()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "stripe",
            DisplayName = "Stripe",
            SupportsPaymentLinks = true
        });

        var setting = new PaymentProviderSetting { ProviderAlias = "stripe", DisplayName = "Stripe", IsEnabled = true };
        var registeredProvider = new RegisteredPaymentProvider(mockProvider.Object, setting);

        _providerManagerMock
            .Setup(m => m.GetProviderAsync("stripe", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Invoice?>>>()))
            .ReturnsAsync((Invoice?)null);
        scopeMock.Setup(s => s.Complete());
        _scopeProviderMock.Setup(p => p.CreateScope()).Returns(scopeMock.Object);

        var service = CreateService();

        // Act
        var result = await service.CreatePaymentLinkAsync(invoiceId, "stripe", "admin");

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("Invoice not found"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenInvoiceAlreadyPaid()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var invoice = new Invoice
        {
            Id = invoiceId,
            Total = 100m,
            CurrencyCode = "USD",
            InvoiceNumber = "INV-001",
            BillingAddress = new Address { Email = "test@test.com", Name = "Test Customer" },
            ExtendedData = new Dictionary<string, object>()
        };

        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "stripe",
            DisplayName = "Stripe",
            SupportsPaymentLinks = true
        });

        var setting = new PaymentProviderSetting { ProviderAlias = "stripe", DisplayName = "Stripe", IsEnabled = true };
        var registeredProvider = new RegisteredPaymentProvider(mockProvider.Object, setting);

        _providerManagerMock
            .Setup(m => m.GetProviderAsync("stripe", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Invoice?>>>()))
            .ReturnsAsync(invoice);
        scopeMock.Setup(s => s.Complete());
        _scopeProviderMock.Setup(p => p.CreateScope()).Returns(scopeMock.Object);

        _paymentServiceMock
            .Setup(s => s.GetInvoicePaymentStatusAsync(invoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(InvoicePaymentStatus.Paid);

        var service = CreateService();

        // Act
        var result = await service.CreatePaymentLinkAsync(invoiceId, "stripe", "admin");

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("already paid"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_Succeeds_AndReturnsPaymentLinkInfo()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var invoice = new Invoice
        {
            Id = invoiceId,
            Total = 250.50m,
            CurrencyCode = "GBP",
            InvoiceNumber = "INV-042",
            CustomerId = Guid.NewGuid(),
            BillingAddress = new Address { Email = "customer@example.com", Name = "Jane Doe" },
            ExtendedData = new Dictionary<string, object>()
        };

        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "stripe",
            DisplayName = "Stripe",
            SupportsPaymentLinks = true,
            IconHtml = "<svg>stripe</svg>"
        });
        mockProvider
            .Setup(p => p.CreatePaymentLinkAsync(It.IsAny<PaymentLinkRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentLinkResult
            {
                Success = true,
                PaymentUrl = "https://pay.stripe.com/link_abc123",
                ProviderLinkId = "link_abc123"
            });

        var setting = new PaymentProviderSetting { ProviderAlias = "stripe", DisplayName = "Stripe", IsEnabled = true };
        var registeredProvider = new RegisteredPaymentProvider(mockProvider.Object, setting);

        _providerManagerMock
            .Setup(m => m.GetProviderAsync("stripe", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        _paymentServiceMock
            .Setup(s => s.GetInvoicePaymentStatusAsync(invoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(InvoicePaymentStatus.Unpaid);

        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Invoice?>>>()))
            .ReturnsAsync(invoice);
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync<Task>(It.IsAny<Func<MerchelloDbContext, Task>>()))
            .Returns(Task.CompletedTask);
        scopeMock.Setup(s => s.Complete());
        _scopeProviderMock.Setup(p => p.CreateScope()).Returns(scopeMock.Object);

        var service = CreateService();

        // Act
        var result = await service.CreatePaymentLinkAsync(invoiceId, "stripe", "admin_user");

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject!.PaymentUrl.ShouldBe("https://pay.stripe.com/link_abc123");
        result.ResultObject.ProviderLinkId.ShouldBe("link_abc123");
        result.ResultObject.ProviderAlias.ShouldBe("stripe");
        result.ResultObject.ProviderDisplayName.ShouldBe("Stripe");
        result.ResultObject.CreatedBy.ShouldBe("admin_user");
        result.ResultObject.IsPaid.ShouldBeFalse();
        result.ResultObject.CreatedAt.ShouldNotBeNull();

        // Verify the provider was called with correct request data
        mockProvider.Verify(p => p.CreatePaymentLinkAsync(
            It.Is<PaymentLinkRequest>(r =>
                r.InvoiceId == invoiceId &&
                r.Amount == 250.50m &&
                r.Currency == "GBP" &&
                r.CustomerEmail == "customer@example.com" &&
                r.CustomerName == "Jane Doe"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region DeactivatePaymentLinkAsync

    [Fact]
    public async Task DeactivatePaymentLinkAsync_ReturnsError_WhenInvoiceNotFound()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();

        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Invoice?>>>()))
            .ReturnsAsync((Invoice?)null);
        scopeMock.Setup(s => s.Complete());
        _scopeProviderMock.Setup(p => p.CreateScope()).Returns(scopeMock.Object);

        var service = CreateService();

        // Act
        var result = await service.DeactivatePaymentLinkAsync(invoiceId);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("Invoice not found"));
    }

    [Fact]
    public async Task DeactivatePaymentLinkAsync_ReturnsError_WhenNoActiveLink()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var invoice = new Invoice
        {
            Id = invoiceId,
            Total = 50m,
            CurrencyCode = "USD",
            InvoiceNumber = "INV-099",
            BillingAddress = new Address { Email = "test@test.com", Name = "Test" },
            ExtendedData = new Dictionary<string, object>()
        };

        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Invoice?>>>()))
            .ReturnsAsync(invoice);
        scopeMock.Setup(s => s.Complete());
        _scopeProviderMock.Setup(p => p.CreateScope()).Returns(scopeMock.Object);

        var service = CreateService();

        // Act
        var result = await service.DeactivatePaymentLinkAsync(invoiceId);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message.Contains("No active payment link"));
    }

    #endregion

    #region GetPaymentLinkProvidersAsync

    [Fact]
    public async Task GetPaymentLinkProvidersAsync_ReturnsOnlyProvidersSupportingPaymentLinks()
    {
        // Arrange
        var stripeProvider = new Mock<IPaymentProvider>();
        stripeProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "stripe",
            DisplayName = "Stripe",
            SupportsPaymentLinks = true,
            IconHtml = "<svg>stripe</svg>"
        });

        var paypalProvider = new Mock<IPaymentProvider>();
        paypalProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "paypal",
            DisplayName = "PayPal",
            SupportsPaymentLinks = true,
            IconHtml = "<svg>paypal</svg>"
        });

        var manualProvider = new Mock<IPaymentProvider>();
        manualProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "manual",
            DisplayName = "Manual Payment",
            SupportsPaymentLinks = false
        });

        var stripeSetting = new PaymentProviderSetting { ProviderAlias = "stripe", DisplayName = "Stripe", IsEnabled = true };
        var paypalSetting = new PaymentProviderSetting { ProviderAlias = "paypal", DisplayName = "PayPal", IsEnabled = true };
        var manualSetting = new PaymentProviderSetting { ProviderAlias = "manual", DisplayName = "Manual Payment", IsEnabled = true };

        var registeredProviders = new List<RegisteredPaymentProvider>
        {
            new(stripeProvider.Object, stripeSetting),
            new(paypalProvider.Object, paypalSetting),
            new(manualProvider.Object, manualSetting)
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProviders);

        var service = CreateService();

        // Act
        var result = await service.GetPaymentLinkProvidersAsync();

        // Assert
        result.Count.ShouldBe(2);
        result.ShouldContain(p => p.Alias == "stripe" && p.DisplayName == "Stripe" && p.IconHtml == "<svg>stripe</svg>");
        result.ShouldContain(p => p.Alias == "paypal" && p.DisplayName == "PayPal" && p.IconHtml == "<svg>paypal</svg>");
        result.ShouldNotContain(p => p.Alias == "manual");
    }

    #endregion
}
