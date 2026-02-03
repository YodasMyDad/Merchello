using Merchello.Core;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Email.Services;

/// <summary>
/// Tests for EmailTokenResolver - resolves {{token}} expressions in email templates.
/// </summary>
[Collection("Integration Tests")]
public class EmailTokenResolverTests : IClassFixture<ServiceTestFixture>
{
    private readonly IEmailTokenResolver _tokenResolver;
    private readonly InvoiceFactory _invoiceFactory;
    private readonly AddressFactory _addressFactory = new();

    public EmailTokenResolverTests(ServiceTestFixture fixture)
    {
        _tokenResolver = fixture.GetService<IEmailTokenResolver>();
        _invoiceFactory = new InvoiceFactory(fixture.GetService<ICurrencyService>());
    }

    #region Simple Token Resolution Tests

    [Fact]
    public void ResolveTokens_StoreNameToken_ReturnsStoreName()
    {
        // Arrange
        var model = CreateInvoiceModel(storeName: "Test Store");
        var template = "Welcome to {{store.name}}!";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Welcome to Test Store!");
    }

    [Fact]
    public void ResolveTokens_StoreEmailToken_ReturnsStoreEmail()
    {
        // Arrange
        var model = CreateInvoiceModel(storeEmail: "store@example.com");
        var template = "Contact us at {{store.email}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Contact us at store@example.com");
    }

    [Fact]
    public void ResolveTokens_MultipleTokens_ResolvesAll()
    {
        // Arrange
        var model = CreateInvoiceModel(storeName: "My Shop", storeEmail: "hello@myshop.com");
        var template = "{{store.name}} - Email: {{store.email}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("My Shop - Email: hello@myshop.com");
    }

    #endregion

    #region Nested Token Resolution Tests

    [Fact]
    public void ResolveTokens_NestedPropertyPath_ResolvesCorrectly()
    {
        // Arrange
        var model = CreateInvoiceModel(billingEmail: "customer@example.com");
        var template = "Customer email: {{invoice.billingAddress.email}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Customer email: customer@example.com");
    }

    [Fact]
    public void ResolveTokens_DeeplyNestedPath_ResolvesCorrectly()
    {
        // Arrange
        var model = CreateInvoiceModel(billingCity: "London");
        var template = "City: {{invoice.billingAddress.townCity}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("City: London");
    }

    #endregion

    #region Direct Notification Property Access Tests

    [Fact]
    public void ResolveTokens_DirectInvoiceProperty_ResolvesCorrectly()
    {
        // Arrange - access "invoice" directly from notification without "notification." prefix
        var model = CreateInvoiceModel(invoiceNumber: "INV-12345");
        var template = "Invoice #{{invoice.invoiceNumber}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Invoice #INV-12345");
    }

    #endregion

    #region Missing Token Tests

    [Fact]
    public void ResolveTokens_MissingToken_KeepsOriginal()
    {
        // Arrange
        var model = CreateInvoiceModel();
        var template = "Value: {{nonexistent.property}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Value: {{nonexistent.property}}");
    }

    [Fact]
    public void ResolveTokens_NullNestedProperty_KeepsOriginal()
    {
        // Arrange - Create with null billing address
        var invoice = _invoiceFactory.CreateManual(
            invoiceNumber: "INV-001",
            customerId: Guid.NewGuid(),
            billingAddress: _addressFactory.CreateFromFormData(
                firstName: "John",
                lastName: "Doe",
                address1: "123 Test Street",
                address2: null,
                city: "Test City",
                postalCode: "SW1A 1AA",
                countryCode: "GB",
                stateOrProvinceCode: null,
                phone: null,
                email: "customer@example.com"),
            shippingAddress: _addressFactory.CreateFromFormData(
                firstName: "John",
                lastName: "Doe",
                address1: "123 Test Street",
                address2: null,
                city: "Test City",
                postalCode: "SW1A 1AA",
                countryCode: "GB",
                stateOrProvinceCode: null,
                phone: null,
                email: null),
            currencyCode: "GBP",
            subTotal: 0m,
            tax: 0m,
            total: 0m);
        invoice.BillingAddress = null!;
        var notification = new InvoiceSavedNotification(invoice);
        var model = new EmailModel<InvoiceSavedNotification>
        {
            Notification = notification,
            Store = new EmailStoreContext { Name = "Test", Email = "test@test.com" },
            Configuration = new EmailConfiguration { Name = "Test", Topic = Constants.EmailTopics.InvoiceCreated }
        };
        var template = "Email: {{invoice.billingAddress.email}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Email: {{invoice.billingAddress.email}}");
    }

    #endregion

    #region Type Formatting Tests

    [Fact]
    public void ResolveTokens_DecimalValue_FormatsWithTwoDecimals()
    {
        // Arrange
        var model = CreateInvoiceModel(total: 123.456m);
        var template = "Total: {{invoice.total}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Total: 123.46");
    }

    [Fact]
    public void ResolveTokens_BooleanTrue_FormatsAsYes()
    {
        // Arrange
        var model = CreateInvoiceModel(isCancelled: true);
        var template = "Cancelled: {{invoice.isCancelled}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Cancelled: Yes");
    }

    [Fact]
    public void ResolveTokens_BooleanFalse_FormatsAsNo()
    {
        // Arrange
        var model = CreateInvoiceModel(isCancelled: false);
        var template = "Cancelled: {{invoice.isCancelled}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Cancelled: No");
    }

    [Fact]
    public void ResolveTokens_DateTime_FormatsCorrectly()
    {
        // Arrange
        var date = new DateTime(2024, 6, 15, 14, 30, 0, DateTimeKind.Utc);
        var model = CreateInvoiceModel(dateCreated: date);
        var template = "Created: {{invoice.dateCreated}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Created: 2024-06-15 14:30:00");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void ResolveTokens_EmptyTemplate_ReturnsEmpty()
    {
        // Arrange
        var model = CreateInvoiceModel();

        // Act
        var result = _tokenResolver.ResolveTokens("", model);

        // Assert
        result.ShouldBe("");
    }

    [Fact]
    public void ResolveTokens_NullTemplate_ReturnsNull()
    {
        // Arrange
        var model = CreateInvoiceModel();

        // Act
        var result = _tokenResolver.ResolveTokens(null!, model);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void ResolveTokens_NoTokensInTemplate_ReturnsOriginal()
    {
        // Arrange
        var model = CreateInvoiceModel();
        var template = "Plain text without tokens";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Plain text without tokens");
    }

    [Fact]
    public void ResolveTokens_MalformedTokens_IgnoresMalformed()
    {
        // Arrange
        var model = CreateInvoiceModel(storeName: "Test Store");
        // Note: Single braces are ignored, only double braces are resolved
        var template = "{store.name} {{store.name}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert - single braces kept, double braces resolved
        result.ShouldBe("{store.name} Test Store");
    }

    [Fact]
    public void ResolveTokens_EmptyTokenPath_KeepsOriginal()
    {
        // Arrange
        var model = CreateInvoiceModel();
        var template = "Value: {{}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Value: {{}}");
    }

    #endregion

    #region ResolveToken Tests

    [Fact]
    public void ResolveToken_ValidPath_ReturnsValue()
    {
        // Arrange
        var model = CreateInvoiceModel(storeName: "My Store");

        // Act
        var result = _tokenResolver.ResolveToken("store.name", model);

        // Assert
        result.ShouldBe("My Store");
    }

    [Fact]
    public void ResolveToken_InvalidPath_ReturnsNull()
    {
        // Arrange
        var model = CreateInvoiceModel();

        // Act
        var result = _tokenResolver.ResolveToken("invalid.path", model);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void ResolveToken_EmptyPath_ReturnsNull()
    {
        // Arrange
        var model = CreateInvoiceModel();

        // Act
        var result = _tokenResolver.ResolveToken("", model);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void ResolveToken_NullPath_ReturnsNull()
    {
        // Arrange
        var model = CreateInvoiceModel();

        // Act
        var result = _tokenResolver.ResolveToken(null!, model);

        // Assert
        result.ShouldBeNull();
    }

    #endregion

    #region Configuration Token Tests

    [Fact]
    public void ResolveTokens_ConfigToken_ResolvesConfiguration()
    {
        // Arrange
        var model = CreateInvoiceModel(configName: "Order Confirmation");
        var template = "Email type: {{config.name}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Email type: Order Confirmation");
    }

    [Fact]
    public void ResolveTokens_ConfigurationToken_ResolvesConfiguration()
    {
        // Arrange
        var model = CreateInvoiceModel(configName: "Order Confirmation");
        var template = "Email type: {{configuration.name}}";

        // Act
        var result = _tokenResolver.ResolveTokens(template, model);

        // Assert
        result.ShouldBe("Email type: Order Confirmation");
    }

    #endregion

    #region Available Tokens Tests

    [Fact]
    public void GetAvailableTokens_ForInvoiceNotification_IncludesStoreTokens()
    {
        // Act
        var tokens = _tokenResolver.GetAvailableTokens<InvoiceSavedNotification>();

        // Assert
        tokens.ShouldContain(t => t.Path == "store.name");
        tokens.ShouldContain(t => t.Path == "store.email");
    }

    [Fact]
    public void GetAvailableTokens_ForInvoiceNotification_IncludesInvoiceTokens()
    {
        // Act
        var tokens = _tokenResolver.GetAvailableTokens<InvoiceSavedNotification>();

        // Assert
        tokens.Any(t => t.Path.Contains("invoice", StringComparison.OrdinalIgnoreCase)).ShouldBeTrue();
    }

    [Fact]
    public void GetAvailableTokens_TokensHaveDisplayNames()
    {
        // Act
        var tokens = _tokenResolver.GetAvailableTokens<InvoiceSavedNotification>();

        // Assert
        tokens.All(t => !string.IsNullOrEmpty(t.DisplayName)).ShouldBeTrue();
    }

    [Fact]
    public void GetAvailableTokens_TokensHaveDataTypes()
    {
        // Act
        var tokens = _tokenResolver.GetAvailableTokens<InvoiceSavedNotification>();

        // Assert
        tokens.All(t => !string.IsNullOrEmpty(t.DataType)).ShouldBeTrue();
    }

    #endregion

    #region Helper Methods

    private EmailModel<InvoiceSavedNotification> CreateInvoiceModel(
        string storeName = "Test Store",
        string storeEmail = "store@test.com",
        string configName = "Test Config",
        string invoiceNumber = "INV-001",
        string? billingEmail = null,
        string? billingCity = null,
        decimal total = 100m,
        bool isCancelled = false,
        DateTime? dateCreated = null)
    {
        var billingAddress = _addressFactory.CreateFromFormData(
            firstName: "John",
            lastName: "Doe",
            address1: "123 Test Street",
            address2: null,
            city: billingCity ?? "Test City",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            stateOrProvinceCode: null,
            phone: null,
            email: billingEmail ?? "customer@example.com");

        var shippingAddress = _addressFactory.CreateFromFormData(
            firstName: "John",
            lastName: "Doe",
            address1: "123 Test Street",
            address2: null,
            city: "Test City",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            stateOrProvinceCode: null,
            phone: null,
            email: null);

        var invoice = _invoiceFactory.CreateManual(
            invoiceNumber: invoiceNumber,
            customerId: Guid.NewGuid(),
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "GBP",
            subTotal: total,
            tax: 0m,
            total: total);
        invoice.IsCancelled = isCancelled;
        invoice.DateCreated = dateCreated ?? DateTime.UtcNow;
        invoice.DateUpdated = invoice.DateCreated;

        var notification = new InvoiceSavedNotification(invoice);

        return new EmailModel<InvoiceSavedNotification>
        {
            Notification = notification,
            Store = new EmailStoreContext
            {
                Name = storeName,
                Email = storeEmail,
                WebsiteUrl = "https://example.com",
                CurrencyCode = "GBP",
                CurrencySymbol = "GBP"
            },
            Configuration = new EmailConfiguration
            {
                Id = Guid.NewGuid(),
                Name = configName,
                Topic = Constants.EmailTopics.InvoiceCreated,
                TemplatePath = "InvoiceConfirmation.cshtml",
                SubjectExpression = "Invoice Confirmation",
                ToExpression = "{{invoice.billingAddress.email}}"
            }
        };
    }

    #endregion
}
