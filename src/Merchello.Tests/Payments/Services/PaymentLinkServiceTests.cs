using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments.Services;

[Collection("Integration Tests")]
public class PaymentLinkServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IPaymentService _paymentService;

    public PaymentLinkServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _paymentService = fixture.GetService<IPaymentService>();
    }

    /// <summary>
    /// Creates a PaymentLinkService with the fixture's real scope provider and payment service,
    /// plus a per-test mock provider manager for payment provider behaviour.
    /// </summary>
    private PaymentLinkService CreateService(Mock<IPaymentProviderManager>? providerManagerMock = null)
    {
        providerManagerMock ??= new Mock<IPaymentProviderManager>();
        return new PaymentLinkService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            providerManagerMock.Object,
            _paymentService,
            NullLogger<PaymentLinkService>.Instance);
    }

    /// <summary>
    /// Creates a mock provider manager with a provider that supports payment links.
    /// </summary>
    private static Mock<IPaymentProviderManager> CreatePaymentLinkProviderMock(
        string alias,
        PaymentLinkResult? linkResult = null)
    {
        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = alias,
            DisplayName = alias,
            SupportsPaymentLinks = true,
            IconHtml = $"<svg>{alias}</svg>"
        });

        if (linkResult != null)
        {
            mockProvider
                .Setup(p => p.CreatePaymentLinkAsync(It.IsAny<PaymentLinkRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(linkResult);
        }

        var setting = new PaymentProviderSetting { ProviderAlias = alias, DisplayName = alias, IsEnabled = true };
        var registered = new RegisteredPaymentProvider(mockProvider.Object, setting);

        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetProviderAsync(alias, true, It.IsAny<CancellationToken>()))
              .ReturnsAsync(registered);

        return pmMock;
    }

    #region CreatePaymentLinkAsync

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenProviderNotFound()
    {
        // Arrange - provider manager returns null for unknown alias
        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetProviderAsync("nonexistent", true, It.IsAny<CancellationToken>()))
              .ReturnsAsync((RegisteredPaymentProvider?)null);

        var service = CreateService(pmMock);

        // Act
        var result = await service.CreatePaymentLinkAsync(Guid.NewGuid(), "nonexistent", "admin");

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("not found or not enabled"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenProviderDoesNotSupportPaymentLinks()
    {
        // Arrange - provider with SupportsPaymentLinks = false
        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "manual",
            DisplayName = "Manual Payment",
            SupportsPaymentLinks = false
        });

        var setting = new PaymentProviderSetting { ProviderAlias = "manual", DisplayName = "Manual Payment", IsEnabled = true };
        var registered = new RegisteredPaymentProvider(mockProvider.Object, setting);

        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetProviderAsync("manual", true, It.IsAny<CancellationToken>()))
              .ReturnsAsync(registered);

        var service = CreateService(pmMock);

        // Act
        var result = await service.CreatePaymentLinkAsync(Guid.NewGuid(), "manual", "admin");

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("does not support payment links"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenInvoiceNotFound()
    {
        // Arrange - provider supports links, but invoice doesn't exist in DB
        var pmMock = CreatePaymentLinkProviderMock("stripe");
        var service = CreateService(pmMock);

        // Act - use a non-existent invoice ID; real DB returns null
        var result = await service.CreatePaymentLinkAsync(Guid.NewGuid(), "stripe", "admin");

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Invoice not found"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_ReturnsError_WhenInvoiceAlreadyPaid()
    {
        // Arrange - create real invoice and pay it in full
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        var pmMock = CreatePaymentLinkProviderMock("stripe");
        var service = CreateService(pmMock);

        // Act
        var result = await service.CreatePaymentLinkAsync(invoice.Id, "stripe", "admin");

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("already paid"));
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_Succeeds_AndReturnsPaymentLinkInfo()
    {
        // Arrange - create real unpaid invoice in DB
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 250.50m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Setup provider mock that returns a successful payment link
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
        var registered = new RegisteredPaymentProvider(mockProvider.Object, setting);
        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetProviderAsync("stripe", true, It.IsAny<CancellationToken>()))
              .ReturnsAsync(registered);

        var service = CreateService(pmMock);

        // Act
        var result = await service.CreatePaymentLinkAsync(invoice.Id, "stripe", "admin_user");

        // Assert
        result.Success.ShouldBeTrue();
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
                r.InvoiceId == invoice.Id &&
                r.Amount == 250.50m),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreatePaymentLinkAsync_UsesBalanceDue_WhenInvoicePartiallyPaid()
    {
        // Arrange - create invoice for 250.50 and pay 100
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 250.50m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Setup provider mock
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
                PaymentUrl = "https://pay.stripe.com/link_partial",
                ProviderLinkId = "link_partial"
            });

        var setting = new PaymentProviderSetting { ProviderAlias = "stripe", DisplayName = "Stripe", IsEnabled = true };
        var registered = new RegisteredPaymentProvider(mockProvider.Object, setting);
        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetProviderAsync("stripe", true, It.IsAny<CancellationToken>()))
              .ReturnsAsync(registered);

        var service = CreateService(pmMock);

        // Act
        var result = await service.CreatePaymentLinkAsync(invoice.Id, "stripe", "admin");

        // Assert - should charge 150.50 (balance due), NOT 250.50 (full total)
        result.Success.ShouldBeTrue();
        mockProvider.Verify(p => p.CreatePaymentLinkAsync(
            It.Is<PaymentLinkRequest>(r =>
                r.InvoiceId == invoice.Id &&
                r.Amount == 150.50m),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region DeactivatePaymentLinkAsync

    [Fact]
    public async Task DeactivatePaymentLinkAsync_ReturnsError_WhenInvoiceNotFound()
    {
        // Arrange - use a non-existent invoice ID; real DB returns null
        var service = CreateService();

        // Act
        var result = await service.DeactivatePaymentLinkAsync(Guid.NewGuid());

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Invoice not found"));
    }

    [Fact]
    public async Task DeactivatePaymentLinkAsync_ReturnsError_WhenNoActiveLink()
    {
        // Arrange - create real invoice with no payment link data
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 50m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateService();

        // Act
        var result = await service.DeactivatePaymentLinkAsync(invoice.Id);

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("No active payment link"));
    }

    #endregion

    #region GetPaymentLinkProvidersAsync

    [Fact]
    public async Task GetPaymentLinkProvidersAsync_ReturnsOnlyProvidersSupportingPaymentLinks()
    {
        // Arrange - mock provider manager with mixed support
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

        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(registeredProviders);

        var service = CreateService(pmMock);

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
