using System.Text;
using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Email.Attachments;

/// <summary>
/// Tests for Email Attachment infrastructure including StoredAttachment, CsvAttachmentHelper,
/// and individual attachment generators.
/// </summary>
public class EmailAttachmentTests
{
    #region StoredAttachment Tests

    [Fact]
    public void StoredAttachment_FromResult_ConvertsCorrectly()
    {
        // Arrange
        var content = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // PDF magic bytes
        var result = new EmailAttachmentResult
        {
            Content = content,
            FileName = "Invoice-001.pdf",
            ContentType = "application/pdf"
        };

        // Act
        var stored = StoredAttachment.FromResult(result);

        // Assert
        stored.FileName.ShouldBe("Invoice-001.pdf");
        stored.ContentType.ShouldBe("application/pdf");
        stored.ContentBase64.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public void StoredAttachment_GetContent_ReturnsOriginalBytes()
    {
        // Arrange
        var originalContent = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
        var result = new EmailAttachmentResult
        {
            Content = originalContent,
            FileName = "test.bin",
            ContentType = "application/octet-stream"
        };

        // Act
        var stored = StoredAttachment.FromResult(result);
        var retrieved = stored.GetContent();

        // Assert
        retrieved.ShouldBe(originalContent);
    }

    [Fact]
    public void StoredAttachment_RoundTrip_PreservesAllData()
    {
        // Arrange
        var content = Encoding.UTF8.GetBytes("Test content for round-trip");
        var original = new EmailAttachmentResult
        {
            Content = content,
            FileName = "document.txt",
            ContentType = "text/plain"
        };

        // Act
        var stored = StoredAttachment.FromResult(original);
        var retrievedContent = stored.GetContent();

        // Assert
        stored.FileName.ShouldBe(original.FileName);
        stored.ContentType.ShouldBe(original.ContentType);
        retrievedContent.ShouldBe(original.Content);
    }

    [Fact]
    public void StoredAttachment_EmptyContent_HandlesCorrectly()
    {
        // Arrange
        var result = new EmailAttachmentResult
        {
            Content = Array.Empty<byte>(),
            FileName = "empty.txt",
            ContentType = "text/plain"
        };

        // Act
        var stored = StoredAttachment.FromResult(result);
        var retrieved = stored.GetContent();

        // Assert
        retrieved.ShouldBeEmpty();
        stored.ContentBase64.ShouldBe(string.Empty);
    }

    [Fact]
    public void StoredAttachment_LargeContent_HandlesCorrectly()
    {
        // Arrange - 1MB file
        var largeContent = new byte[1024 * 1024];
        new Random(42).NextBytes(largeContent);

        var result = new EmailAttachmentResult
        {
            Content = largeContent,
            FileName = "large-file.bin",
            ContentType = "application/octet-stream"
        };

        // Act
        var stored = StoredAttachment.FromResult(result);
        var retrieved = stored.GetContent();

        // Assert
        retrieved.Length.ShouldBe(largeContent.Length);
        retrieved.ShouldBe(largeContent);
    }

    #endregion

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
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "INV-TEST",
            CurrencySymbol = "$",
            CurrencyCode = "USD",
            SubTotal = 100m,
            Tax = 10m,
            Total = 150m,
            BillingAddress = new Address
            {
                Name = "Test Customer",
                AddressOne = "123 Test St",
                TownCity = "Test City",
                PostalCode = "12345",
                Email = "test@example.com"
            },
            ShippingAddress = new Address
            {
                Name = "Test Customer",
                AddressOne = "123 Test St",
                TownCity = "Test City",
                PostalCode = "12345"
            }
        };

        var order = new Core.Accounting.Models.Order
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            Invoice = invoice,
            ShippingCost = 10m,
            DateCreated = DateTime.UtcNow,
            LineItems = new List<LineItem>
            {
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    Sku = "TEST-001",
                    Name = "Test Product",
                    Quantity = 2,
                    Amount = 25m,
                    TaxRate = 10m,
                    IsTaxable = true
                },
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    Sku = "TEST-002",
                    Name = "Another Product",
                    Quantity = 1,
                    Amount = 50m,
                    TaxRate = 10m,
                    IsTaxable = true
                }
            }
        };

        return order;
    }

    private static Invoice CreateTestInvoice()
    {
        return new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "INV-TEST-001",
            CurrencySymbol = "£",
            CurrencyCode = "GBP",
            SubTotal = 200m,
            Tax = 40m,
            Discount = 20m,
            Total = 220m,
            DateCreated = DateTime.UtcNow,
            BillingAddress = new Address
            {
                Name = "Test Billing",
                AddressOne = "456 Billing St",
                TownCity = "Billing City",
                PostalCode = "BL1 2NG",
                CountryCode = "GB",
                Email = "billing@test.com"
            },
            ShippingAddress = new Address
            {
                Name = "Test Shipping",
                AddressOne = "789 Shipping Ave",
                TownCity = "Shipping City",
                PostalCode = "SH1 3PP"
            }
        };
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
