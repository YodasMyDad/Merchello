using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Payments.Factories;
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

/// <summary>
/// Unit tests for SavedPaymentMethodService.
/// </summary>
[Collection("Integration Tests")]
public class SavedPaymentMethodServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ISavedPaymentMethodService _service;

    public SavedPaymentMethodServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _service = fixture.GetService<ISavedPaymentMethodService>();
    }

    /// <summary>
    /// Creates a SavedPaymentMethodService with custom dependencies for targeted testing.
    /// </summary>
    private SavedPaymentMethodService CreateServiceWithMocks(
        IPaymentProviderManager? providerManager = null,
        ICustomerService? customerService = null)
    {
        return new SavedPaymentMethodService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            providerManager ?? _fixture.GetService<IPaymentProviderManager>(),
            customerService ?? _fixture.GetService<ICustomerService>(),
            new SavedPaymentMethodFactory(),
            _fixture.GetService<IMerchelloNotificationPublisher>(),
            _fixture.GetService<IPaymentIdempotencyService>(),
            NullLogger<SavedPaymentMethodService>.Instance);
    }

    #region Query Tests

    [Fact]
    public async Task GetCustomerPaymentMethodsAsync_ReturnsEmptyList_WhenNoMethods()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var methods = await _service.GetCustomerPaymentMethodsAsync(customer.Id);

        // Assert
        methods.ShouldNotBeNull();
        methods.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetCustomerPaymentMethodsAsync_ReturnsDefaultFirst()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var method1 = dataBuilder.CreateSavedPaymentMethod(customer, isDefault: false, displayLabel: "Card 1");
        var method2 = dataBuilder.CreateSavedPaymentMethod(customer, isDefault: true, displayLabel: "Card 2");
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var methods = (await _service.GetCustomerPaymentMethodsAsync(customer.Id)).ToList();

        // Assert
        methods.Count.ShouldBe(2);
        methods[0].IsDefault.ShouldBeTrue();
        methods[0].DisplayLabel.ShouldBe("Card 2");
    }

    [Fact]
    public async Task GetPaymentMethodAsync_ReturnsNull_WhenNotFound()
    {
        // Act
        var method = await _service.GetPaymentMethodAsync(Guid.NewGuid());

        // Assert
        method.ShouldBeNull();
    }

    [Fact]
    public async Task GetPaymentMethodAsync_ReturnsMethod_WhenExists()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var savedMethod = dataBuilder.CreateSavedPaymentMethod(customer);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var method = await _service.GetPaymentMethodAsync(savedMethod.Id);

        // Assert
        method.ShouldNotBeNull();
        method.Id.ShouldBe(savedMethod.Id);
    }

    [Fact]
    public async Task GetDefaultPaymentMethodAsync_ReturnsNull_WhenNoDefault()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        dataBuilder.CreateSavedPaymentMethod(customer, isDefault: false);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var method = await _service.GetDefaultPaymentMethodAsync(customer.Id);

        // Assert
        method.ShouldBeNull();
    }

    [Fact]
    public async Task GetDefaultPaymentMethodAsync_ReturnsDefault_WhenExists()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var defaultMethod = dataBuilder.CreateSavedPaymentMethod(customer, isDefault: true);
        dataBuilder.CreateSavedPaymentMethod(customer, isDefault: false);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var method = await _service.GetDefaultPaymentMethodAsync(customer.Id);

        // Assert
        method.ShouldNotBeNull();
        method.Id.ShouldBe(defaultMethod.Id);
        method.IsDefault.ShouldBeTrue();
    }

    #endregion

    #region CreateSetupSessionAsync Tests

    [Fact]
    public async Task CreateSetupSessionAsync_ReturnsError_WhenCustomerNotFound()
    {
        // Arrange
        var parameters = new CreateVaultSetupParameters
        {
            CustomerId = Guid.NewGuid(),
            ProviderAlias = "stripe"
        };

        // Act
        var result = await _service.CreateSetupSessionAsync(parameters);

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Customer not found"));
    }

    [Fact]
    public async Task CreateSetupSessionAsync_ReturnsError_WhenProviderNotFound()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new CreateVaultSetupParameters
        {
            CustomerId = customer.Id,
            ProviderAlias = "nonexistent-provider"
        };

        // Act
        var result = await _service.CreateSetupSessionAsync(parameters);

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("not found or not enabled"));
    }

    [Fact]
    public async Task CreateSetupSessionAsync_ReturnsError_WhenProviderDoesNotSupportVault()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Mock provider that doesn't support vaulting
        var providerMock = new Mock<IPaymentProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "no-vault-provider",
            DisplayName = "No Vault Provider",
            SupportsVaultedPayments = false
        });

        var setting = new PaymentProviderSetting
        {
            ProviderAlias = "no-vault-provider",
            DisplayName = "No Vault Provider",
            IsEnabled = true,
            IsVaultingEnabled = false
        };

        var registered = new RegisteredPaymentProvider(providerMock.Object, setting);
        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetProviderAsync("no-vault-provider", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registered);

        var service = CreateServiceWithMocks(providerManager: pmMock.Object);

        var parameters = new CreateVaultSetupParameters
        {
            CustomerId = customer.Id,
            ProviderAlias = "no-vault-provider"
        };

        // Act
        var result = await service.CreateSetupSessionAsync(parameters);

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("does not support vaulted payments"));
    }

    #endregion

    #region SetDefaultAsync Tests

    [Fact]
    public async Task SetDefaultAsync_ReturnsError_WhenMethodNotFound()
    {
        // Act
        var result = await _service.SetDefaultAsync(Guid.NewGuid());

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("not found"));
    }

    [Fact]
    public async Task SetDefaultAsync_ClearsPreviousDefault()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var method1 = dataBuilder.CreateSavedPaymentMethod(customer, isDefault: true);
        var method2 = dataBuilder.CreateSavedPaymentMethod(customer, isDefault: false);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.SetDefaultAsync(method2.Id);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject!.IsDefault.ShouldBeTrue();

        // Verify previous default is cleared
        var updated1 = await _service.GetPaymentMethodAsync(method1.Id);
        updated1!.IsDefault.ShouldBeFalse();

        var updated2 = await _service.GetPaymentMethodAsync(method2.Id);
        updated2!.IsDefault.ShouldBeTrue();
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_ReturnsError_WhenMethodNotFound()
    {
        // Act
        var result = await _service.DeleteAsync(Guid.NewGuid());

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("not found"));
    }

    [Fact]
    public async Task DeleteAsync_RemovesFromDatabase()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var method = dataBuilder.CreateSavedPaymentMethod(customer);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.DeleteAsync(method.Id);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldBeTrue();

        // Verify deleted
        var deleted = await _service.GetPaymentMethodAsync(method.Id);
        deleted.ShouldBeNull();
    }

    #endregion

    #region ChargeAsync Tests

    [Fact]
    public async Task ChargeAsync_ReturnsError_WhenMethodNotFound()
    {
        // Arrange
        var parameters = new ChargeSavedMethodParameters
        {
            InvoiceId = Guid.NewGuid(),
            SavedPaymentMethodId = Guid.NewGuid()
        };

        // Act
        var result = await _service.ChargeAsync(parameters);

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Saved payment method not found"));
    }

    [Fact]
    public async Task ChargeAsync_ReturnsError_WhenInvoiceNotFound()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var method = dataBuilder.CreateSavedPaymentMethod(customer);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new ChargeSavedMethodParameters
        {
            InvoiceId = Guid.NewGuid(),
            SavedPaymentMethodId = method.Id
        };

        // Act
        var result = await _service.ChargeAsync(parameters);

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Invoice not found"));
    }

    #endregion

    #region SaveFromCheckoutAsync Tests

    [Fact]
    public async Task SaveFromCheckoutAsync_CreatesMethodWithCorrectProperties()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new SavePaymentMethodFromCheckoutParameters
        {
            CustomerId = customer.Id,
            ProviderAlias = "stripe",
            ProviderMethodId = "pm_test123",
            ProviderCustomerId = "cus_test456",
            MethodType = SavedPaymentMethodType.Card,
            CardBrand = "visa",
            Last4 = "4242",
            ExpiryMonth = 12,
            ExpiryYear = 2026,
            SetAsDefault = true,
            IpAddress = "192.168.1.1"
        };

        // Act
        var result = await _service.SaveFromCheckoutAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        var method = result.ResultObject;
        method.ShouldNotBeNull();
        method.CustomerId.ShouldBe(customer.Id);
        method.ProviderAlias.ShouldBe("stripe");
        method.ProviderMethodId.ShouldBe("pm_test123");
        method.CardBrand.ShouldBe("visa");
        method.Last4.ShouldBe("4242");
        method.IsDefault.ShouldBeTrue();
        method.DisplayLabel.ShouldBe("Visa ending in 4242");
    }

    [Fact]
    public async Task SaveFromCheckoutAsync_SetsDefault_ClearsPreviousDefault()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var existingDefault = dataBuilder.CreateSavedPaymentMethod(customer, isDefault: true);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new SavePaymentMethodFromCheckoutParameters
        {
            CustomerId = customer.Id,
            ProviderAlias = "stripe",
            ProviderMethodId = "pm_new",
            MethodType = SavedPaymentMethodType.Card,
            SetAsDefault = true
        };

        // Act
        var result = await _service.SaveFromCheckoutAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject!.IsDefault.ShouldBeTrue();

        // Verify previous default is cleared
        var updatedOld = await _service.GetPaymentMethodAsync(existingDefault.Id);
        updatedOld!.IsDefault.ShouldBeFalse();
    }

    #endregion

    #region GetOrCreateProviderCustomerIdAsync Tests

    [Fact]
    public async Task GetOrCreateProviderCustomerIdAsync_ReturnsExisting_WhenFound()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        var method = dataBuilder.CreateSavedPaymentMethod(customer, providerCustomerId: "cus_existing");
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var customerId = await _service.GetOrCreateProviderCustomerIdAsync(customer.Id, "stripe");

        // Assert
        customerId.ShouldBe("cus_existing");
    }

    [Fact]
    public async Task GetOrCreateProviderCustomerIdAsync_ReturnsNull_WhenNotFound()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var customerId = await _service.GetOrCreateProviderCustomerIdAsync(customer.Id, "stripe");

        // Assert
        customerId.ShouldBeNull();
    }

    #endregion
}
