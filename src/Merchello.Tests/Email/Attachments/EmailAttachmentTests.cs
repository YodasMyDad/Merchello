using System.Text;
using Merchello.Core;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Email.Attachments;

/// <summary>
/// Tests for Email Attachment infrastructure including CsvAttachmentHelper
/// and individual attachment generators.
/// </summary>
public class EmailAttachmentTests
{
    private static readonly ICurrencyService CurrencyService = new CurrencyService(
        Options.Create(new MerchelloSettings { DefaultRounding = MidpointRounding.AwayFromZero, StoreCurrencyCode = "USD" }));
    private static readonly InvoiceFactory InvoiceFactory = new(CurrencyService);
    private static readonly AddressFactory AddressFactory = new();
    private static readonly LineItemFactory LineItemFactory = new(CurrencyService);
    private static readonly OrderFactory OrderFactory = new();

    #region CsvAttachmentHelper Tests

    [Fact]
    public void GenerateCsv_SimpleData_GeneratesValidCsv()
    {
        // Arrange
        var headers = new[] { "Name", "Value" };
        var rows = new List<string[]>
        {
            new[] { "Item1", "100" },
            new[] { "Item2", "200" }
        };

        // Act
        var result = CsvAttachmentHelper.GenerateCsv(headers, rows);

        // Assert
        var csv = Encoding.UTF8.GetString(result);
        csv.ShouldContain("Name,Value");
        csv.ShouldContain("Item1,100");
        csv.ShouldContain("Item2,200");
    }

    [Fact]
    public void GenerateCsv_IncludesUtf8Bom()
    {
        // Arrange
        var headers = new[] { "Col1" };
        var rows = new List<string[]> { new[] { "Data" } };

        // Act
        var result = CsvAttachmentHelper.GenerateCsv(headers, rows);

        // Assert - UTF-8 BOM is EF BB BF
        result.Length.ShouldBeGreaterThan(3);
        result[0].ShouldBe((byte)0xEF);
        result[1].ShouldBe((byte)0xBB);
        result[2].ShouldBe((byte)0xBF);
    }

    [Fact]
    public void GenerateCsv_EscapesCommas()
    {
        // Arrange
        var headers = new[] { "Description" };
        var rows = new List<string[]> { new[] { "Hello, World" } };

        // Act
        var result = CsvAttachmentHelper.GenerateCsv(headers, rows);
        var csv = Encoding.UTF8.GetString(result);

        // Assert - value with comma should be quoted
        csv.ShouldContain("\"Hello, World\"");
    }

    [Fact]
    public void GenerateCsv_EscapesQuotes()
    {
        // Arrange
        var headers = new[] { "Quote" };
        var rows = new List<string[]> { new[] { "He said \"Hello\"" } };

        // Act
        var result = CsvAttachmentHelper.GenerateCsv(headers, rows);
        var csv = Encoding.UTF8.GetString(result);

        // Assert - quotes should be doubled and value quoted
        csv.ShouldContain("\"He said \"\"Hello\"\"\"");
    }

    [Fact]
    public void GenerateCsv_EscapesNewlines()
    {
        // Arrange
        var headers = new[] { "MultiLine" };
        var rows = new List<string[]> { new[] { "Line1\nLine2" } };

        // Act
        var result = CsvAttachmentHelper.GenerateCsv(headers, rows);
        var csv = Encoding.UTF8.GetString(result);

        // Assert - newlines should cause quoting
        csv.ShouldContain("\"Line1\nLine2\"");
    }

    [Fact]
    public void GenerateCsv_HandlesNullValues()
    {
        // Arrange
        var headers = new[] { "Col1", "Col2" };
        var rows = new List<string[]> { new[] { null!, "Value" } };

        // Act
        var result = CsvAttachmentHelper.GenerateCsv(headers, rows);
        var csv = Encoding.UTF8.GetString(result);

        // Assert - null becomes empty string
        csv.ShouldContain(",Value");
    }

    [Fact]
    public void GenerateCsv_EmptyRows_GeneratesHeadersOnly()
    {
        // Arrange
        var headers = new[] { "Header1", "Header2" };
        var rows = new List<string[]>();

        // Act
        var result = CsvAttachmentHelper.GenerateCsv(headers, rows);
        var csv = Encoding.UTF8.GetString(result);

        // Assert
        csv.ShouldContain("Header1,Header2");
        // Should only have headers line (with BOM at start and line ending)
        // Note: UTF-8 BOM is included at start, so we remove it for comparison
        csv.TrimStart('\uFEFF').Trim().ShouldBe("Header1,Header2");
    }

    [Fact]
    public void FormatCurrency_FormatsCorrectly()
    {
        // Act & Assert
        CsvAttachmentHelper.FormatCurrency(123.456m, "$").ShouldBe("$123.46");
        CsvAttachmentHelper.FormatCurrency(1000m, "£").ShouldBe("£1,000.00");
        CsvAttachmentHelper.FormatCurrency(0m, "€").ShouldBe("€0.00");
        CsvAttachmentHelper.FormatCurrency(-50.5m, "$").ShouldBe("$-50.50");
    }

    [Fact]
    public void FormatNumber_FormatsCorrectly()
    {
        // Act & Assert
        CsvAttachmentHelper.FormatNumber(123.456m, 2).ShouldBe("123.46");
        CsvAttachmentHelper.FormatNumber(1000m, 0).ShouldBe("1,000");
        CsvAttachmentHelper.FormatNumber(0.5m, 4).ShouldBe("0.5000");
    }

    [Fact]
    public void FormatDate_FormatsCorrectly()
    {
        // Arrange
        var date = new DateTime(2024, 6, 15);

        // Act & Assert
        CsvAttachmentHelper.FormatDate(date).ShouldBe("2024-06-15");
        CsvAttachmentHelper.FormatDate(date, "dd/MM/yyyy").ShouldBe("15/06/2024");
    }

    [Fact]
    public void FormatDateTime_FormatsCorrectly()
    {
        // Arrange
        var dateTime = new DateTime(2024, 6, 15, 14, 30, 45);

        // Act & Assert
        CsvAttachmentHelper.FormatDateTime(dateTime).ShouldBe("2024-06-15 14:30:45");
        CsvAttachmentHelper.FormatDateTime(dateTime, "dd MMM yyyy HH:mm").ShouldBe("15 Jun 2024 14:30");
    }

    #endregion

    #region OrderLineItemsCsvAttachment Tests

    [Fact]
    public async Task OrderLineItemsCsvAttachment_GeneratesValidCsv()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<OrderLineItemsCsvAttachment>>();
        var attachment = new OrderLineItemsCsvAttachment(loggerMock.Object);

        var order = CreateTestOrder();
        var model = CreateOrderEmailModel(order);

        // Act
        var result = await attachment.GenerateAsync(model);

        // Assert
        result.ShouldNotBeNull();
        result.FileName.ShouldBe("Order-INV-TEST-Items.csv");
        result.ContentType.ShouldBe("text/csv");
        result.Content.Length.ShouldBeGreaterThan(0);

        var csv = Encoding.UTF8.GetString(result.Content);
        csv.ShouldContain("SKU");
        csv.ShouldContain("Name");
        csv.ShouldContain("Quantity");
        csv.ShouldContain("TEST-001");
        csv.ShouldContain("Test Product");
    }

    [Fact]
    public async Task OrderLineItemsCsvAttachment_NoLineItems_ReturnsNull()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<OrderLineItemsCsvAttachment>>();
        var attachment = new OrderLineItemsCsvAttachment(loggerMock.Object);

        var order = CreateTestOrder();
        order.LineItems = null;
        var model = CreateOrderEmailModel(order);

        // Act
        var result = await attachment.GenerateAsync(model);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task OrderLineItemsCsvAttachment_EmptyLineItems_ReturnsNull()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<OrderLineItemsCsvAttachment>>();
        var attachment = new OrderLineItemsCsvAttachment(loggerMock.Object);

        var order = CreateTestOrder();
        order.LineItems = new List<LineItem>();
        var model = CreateOrderEmailModel(order);

        // Act
        var result = await attachment.GenerateAsync(model);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task OrderLineItemsCsvAttachment_IncludesOrderTotal()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<OrderLineItemsCsvAttachment>>();
        var attachment = new OrderLineItemsCsvAttachment(loggerMock.Object);

        var order = CreateTestOrder();
        var model = CreateOrderEmailModel(order);

        // Act
        var result = await attachment.GenerateAsync(model);

        // Assert
        result.ShouldNotBeNull();
        var csv = Encoding.UTF8.GetString(result.Content);
        csv.ShouldContain("Order Total:");
        csv.ShouldContain("$150.00"); // Total from test invoice
    }

    [Fact]
    public void OrderLineItemsCsvAttachment_HasCorrectMetadata()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<OrderLineItemsCsvAttachment>>();
        var attachment = new OrderLineItemsCsvAttachment(loggerMock.Object);

        // Assert
        attachment.Alias.ShouldBe("order-line-items-csv");
        attachment.DisplayName.ShouldBe("Line Items CSV");
        attachment.Description.ShouldNotBeNullOrWhiteSpace();
        attachment.IconSvg.ShouldNotBeNull();
        attachment.NotificationType.ShouldBe(typeof(OrderCreatedNotification));
    }

    #endregion

    #region EmailAttachmentResult Tests

    [Fact]
    public void EmailAttachmentResult_RequiredProperties_MustBeSet()
    {
        // Act
        var result = new EmailAttachmentResult
        {
            Content = new byte[] { 1, 2, 3 },
            FileName = "test.pdf",
            ContentType = "application/pdf"
        };

        // Assert
        result.Content.ShouldNotBeEmpty();
        result.FileName.ShouldNotBeNullOrEmpty();
        result.ContentType.ShouldNotBeNullOrEmpty();
    }

    #endregion

    #region EmailAttachmentInfo Tests

    [Fact]
    public void EmailAttachmentInfo_RequiredProperties()
    {
        // Act
        var info = new EmailAttachmentInfo
        {
            Alias = "test-attachment",
            DisplayName = "Test Attachment",
            Description = "A test attachment",
            IconSvg = "<svg></svg>",
            NotificationType = typeof(OrderCreatedNotification),
            NotificationTypeName = nameof(OrderCreatedNotification),
            Topic = Constants.EmailTopics.OrderCreated
        };

        // Assert
        info.Alias.ShouldBe("test-attachment");
        info.DisplayName.ShouldBe("Test Attachment");
        info.NotificationType.ShouldBe(typeof(OrderCreatedNotification));
        info.Topic.ShouldBe(Constants.EmailTopics.OrderCreated);
    }

    #endregion

    #region Alias Validation Tests

    [Theory]
    [InlineData("valid-alias", true)]
    [InlineData("order-invoice-pdf", true)]
    [InlineData("a", true)]
    [InlineData("test123", true)]
    [InlineData("multi-part-alias-name", true)]
    [InlineData("InvalidAlias", false)] // Uppercase not allowed
    [InlineData("invalid_alias", false)] // Underscore not allowed
    [InlineData("-invalid", false)] // Cannot start with hyphen
    [InlineData("invalid-", false)] // Cannot end with hyphen (technically matches but pattern requires content after hyphen)
    [InlineData("", false)]
    [InlineData("123-start", false)] // Cannot start with number
    public void AliasPattern_ValidatesCorrectly(string alias, bool shouldBeValid)
    {
        // The alias pattern from EmailAttachmentResolver
        var pattern = new System.Text.RegularExpressions.Regex(
            @"^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
            System.Text.RegularExpressions.RegexOptions.Compiled);

        // Act
        var isValid = !string.IsNullOrWhiteSpace(alias) && pattern.IsMatch(alias);

        // Assert
        isValid.ShouldBe(shouldBeValid, $"Alias '{alias}' validation failed");
    }

    #endregion

    #region Helper Methods

    private static Core.Accounting.Models.Order CreateTestOrder()
    {
        var billingAddress = AddressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Test St",
            address2: null,
            city: "Test City",
            postalCode: "12345",
            countryCode: "US",
            stateOrProvinceCode: null,
            phone: null,
            email: "test@example.com");

        var shippingAddress = AddressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Test St",
            address2: null,
            city: "Test City",
            postalCode: "12345",
            countryCode: "US",
            stateOrProvinceCode: null,
            phone: null,
            email: "test@example.com");

        var invoice = InvoiceFactory.CreateManual(
            invoiceNumber: "INV-TEST",
            customerId: Guid.NewGuid(),
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "USD",
            subTotal: 100m,
            tax: 10m,
            total: 150m);

        var order = OrderFactory.Create(invoice, Guid.NewGuid(), Guid.NewGuid(), shippingCost: 10m);
        invoice.Orders = [order];

        var lineItem1 = LineItemFactory.CreateCustomLineItem(
            orderId: order.Id,
            name: "Test Product",
            sku: "TEST-001",
            amount: 25m,
            cost: 0m,
            quantity: 2,
            isTaxable: true,
            taxRate: 10m);
        lineItem1.LineItemType = LineItemType.Product;
        lineItem1.Order = order;

        var lineItem2 = LineItemFactory.CreateCustomLineItem(
            orderId: order.Id,
            name: "Another Product",
            sku: "TEST-002",
            amount: 50m,
            cost: 0m,
            quantity: 1,
            isTaxable: true,
            taxRate: 10m);
        lineItem2.LineItemType = LineItemType.Product;
        lineItem2.Order = order;

        order.LineItems = [lineItem1, lineItem2];

        return order;
    }

    private static Invoice CreateTestInvoice()
    {
        var billingAddress = AddressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Billing",
            address1: "456 Billing St",
            address2: null,
            city: "Billing City",
            postalCode: "BL1 2NG",
            countryCode: "GB",
            stateOrProvinceCode: null,
            phone: null,
            email: "billing@test.com");

        var shippingAddress = AddressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Shipping",
            address1: "789 Shipping Ave",
            address2: null,
            city: "Shipping City",
            postalCode: "SH1 3PP",
            countryCode: "GB",
            stateOrProvinceCode: null,
            phone: null,
            email: null);

        var invoice = InvoiceFactory.CreateManual(
            invoiceNumber: "INV-TEST-001",
            customerId: Guid.NewGuid(),
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "GBP",
            subTotal: 200m,
            tax: 40m,
            total: 220m);

        invoice.Discount = 20m;
        return invoice;
    }

    private static EmailModel<OrderCreatedNotification> CreateOrderEmailModel(Core.Accounting.Models.Order order)
    {
        var notification = new OrderCreatedNotification(order);

        return new EmailModel<OrderCreatedNotification>
        {
            Notification = notification,
            Store = new EmailStoreContext
            {
                Name = "Test Store",
                Email = "store@test.com",
                WebsiteUrl = "https://test.example.com",
                CurrencyCode = "USD",
                CurrencySymbol = "$"
            },
            Configuration = new EmailConfiguration
            {
                Id = Guid.NewGuid(),
                Name = "Order Confirmation",
                Topic = Constants.EmailTopics.OrderCreated,
                TemplatePath = "OrderConfirmation.cshtml",
                SubjectExpression = "Your Order",
                ToExpression = "{{order.invoice.billingAddress.email}}"
            }
        };
    }

    private static EmailModel<InvoiceSavedNotification> CreateInvoiceEmailModel(Invoice invoice)
    {
        var notification = new InvoiceSavedNotification(invoice);

        return new EmailModel<InvoiceSavedNotification>
        {
            Notification = notification,
            Store = new EmailStoreContext
            {
                Name = "Test Store",
                Email = "store@test.com",
                WebsiteUrl = "https://test.example.com",
                CurrencyCode = "GBP",
                CurrencySymbol = "£"
            },
            Configuration = new EmailConfiguration
            {
                Id = Guid.NewGuid(),
                Name = "Invoice Notification",
                Topic = Constants.EmailTopics.InvoiceCreated,
                TemplatePath = "Invoice.cshtml",
                SubjectExpression = "Your Invoice",
                ToExpression = "{{invoice.billingAddress.email}}"
            }
        };
    }

    #endregion
}
