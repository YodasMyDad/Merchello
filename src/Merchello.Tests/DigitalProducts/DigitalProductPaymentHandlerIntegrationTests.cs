using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.DigitalProducts.Extensions;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Services.Interfaces;
using Merchello.Core.Email.Services;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Email.Services.Parameters;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models.Enums;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Webhooks.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.DigitalProducts;

/// <summary>
/// Integration test covering the notification pipeline:
/// payment -> digital product handler -> email/webhook delivery + order completion.
/// </summary>
[Collection("Integration Tests")]
public class DigitalProductPaymentHandlerIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IPaymentService _paymentService;
    private readonly IDigitalProductService _digitalProductService;
    private readonly IEmailConfigurationService _emailConfigurationService;
    private readonly IWebhookService _webhookService;

    public DigitalProductPaymentHandlerIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _paymentService = fixture.GetService<IPaymentService>();
        _digitalProductService = fixture.GetService<IDigitalProductService>();
        _emailConfigurationService = fixture.GetService<IEmailConfigurationService>();
        _webhookService = fixture.GetService<IWebhookService>();
    }

    [Fact]
    public async Task RecordPayment_ForDigitalOnlyInvoice_CreatesLinks_CompletesOrders_QueuesDeliveries()
    {
        // Arrange
        var (invoice, orderId) = await CreateDigitalInvoiceAsync();
        await ConfigureEmailAndWebhookAsync();

        var emailService = _fixture.GetService<IEmailService>();
        if (emailService is EmailService concreteEmail)
        {
            concreteEmail.SetTemplateRenderer((_, _, _) => Task.FromResult("<html>Digital delivery</html>"));
        }

        // Act
        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid():N}",
            Amount = invoice.Total
        });

        // Assert
        paymentResult.Successful.ShouldBeTrue();

        var links = await _digitalProductService.GetInvoiceDownloadsAsync(invoice.Id);
        links.Count.ShouldBe(1);

        _fixture.DbContext.ChangeTracker.Clear();
        var updatedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == orderId);
        updatedOrder.Status.ShouldBe(OrderStatus.Completed);

        var invoiceWithNotes = await _fixture.DbContext.Invoices
            .FirstAsync(i => i.Id == invoice.Id);
        invoiceWithNotes.Notes.ShouldNotBeNull();
        invoiceWithNotes.Notes!.Any(n => n.Description!.Contains("Payment of", StringComparison.OrdinalIgnoreCase))
            .ShouldBeTrue();

        // Verify the handler's ShouldSendDeliveryNotificationAsync logic works:
        // Load the invoice the same way the handler does
        var invoiceService = _fixture.GetService<IInvoiceService>();
        var loadedInvoice = await invoiceService.GetInvoiceAsync(invoice.Id);
        loadedInvoice.ShouldNotBeNull();
        loadedInvoice!.Orders.ShouldNotBeNull();
        loadedInvoice.Orders!.Count.ShouldBeGreaterThan(0);

        var lineItemsFromInvoice = loadedInvoice.Orders!.SelectMany(o => o.LineItems ?? []).ToList();
        lineItemsFromInvoice.Count.ShouldBeGreaterThan(0);
        lineItemsFromInvoice.Any(li => li.ProductId.HasValue).ShouldBeTrue();

        // Verify product resolution works (same as ShouldSendDeliveryNotificationAsync)
        var productService = _fixture.GetService<IProductService>();
        var productId = lineItemsFromInvoice.First(li => li.ProductId.HasValue).ProductId!.Value;
        var loadedProduct = await productService.GetProduct(
            new Core.Products.Services.Parameters.GetProductParameters { ProductId = productId, IncludeProductRoot = true });
        loadedProduct.ShouldNotBeNull();
        loadedProduct!.ProductRoot.ShouldNotBeNull();
        loadedProduct.ProductRoot!.IsDigitalProduct.ShouldBeTrue();
        loadedProduct.ProductRoot.HasDigitalFiles().ShouldBeTrue();

        var deliveries = await _fixture.DbContext.OutboundDeliveries
            .Where(d => d.EntityId == invoice.Id)
            .ToListAsync();

        // Verify email config is in DB
        var emailConfigs = await _fixture.DbContext.EmailConfigurations
            .Where(c => c.Topic == Constants.EmailTopics.DigitalProductDelivered)
            .ToListAsync();
        emailConfigs.Count.ShouldBe(1, $"Expected 1 email config for topic '{Constants.EmailTopics.DigitalProductDelivered}', found {emailConfigs.Count}. Enabled={emailConfigs.FirstOrDefault()?.Enabled}");

        var deliveryDetails = string.Join("\n", deliveries.Select(d => $"  Type={d.DeliveryType} Topic='{d.Topic}' EntityId={d.EntityId}"));

        deliveries.ShouldContain(d =>
            d.DeliveryType == OutboundDeliveryType.Email &&
            d.Topic == Constants.EmailTopics.DigitalProductDelivered,
            $"Missing email delivery. Found:\n{deliveryDetails}");

        deliveries.ShouldContain(d =>
            d.DeliveryType == OutboundDeliveryType.Webhook &&
            d.Topic == Constants.WebhookTopics.DigitalDelivered,
            $"Missing webhook delivery. Found:\n{deliveryDetails}");
    }

    private async Task ConfigureEmailAndWebhookAsync()
    {
        var emailResult = await _emailConfigurationService.CreateAsync(new CreateEmailConfigurationParameters
        {
            Name = "Digital Delivery",
            Topic = Constants.EmailTopics.DigitalProductDelivered,
            TemplatePath = "/Views/Emails/DigitalDelivery.cshtml",
            ToExpression = "customer@example.com",
            SubjectExpression = "Your downloads are ready",
            Enabled = true
        });
        emailResult.Successful.ShouldBeTrue();

        var webhookResult = await _webhookService.CreateSubscriptionAsync(new CreateWebhookSubscriptionParameters
        {
            Name = "Digital Delivered Webhook",
            Topic = Constants.WebhookTopics.DigitalDelivered,
            TargetUrl = "https://example.com/webhook",
            AuthType = WebhookAuthType.None
        });
        webhookResult.ResultObject.ShouldNotBeNull();
    }

    private async Task<(Invoice Invoice, Guid OrderId)> CreateDigitalInvoiceAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var customer = dataBuilder.CreateCustomer(email: "digital@example.com");
        var taxGroup = dataBuilder.CreateTaxGroup("Digital Tax", 0m);
        var productRoot = dataBuilder.CreateProductRoot("Digital Product", taxGroup);
        productRoot.IsDigitalProduct = true;
        productRoot.SetDigitalDeliveryMethod(DigitalDeliveryMethod.InstantDownload);
        productRoot.SetDigitalFileIds([Guid.NewGuid().ToString()]);

        var product = dataBuilder.CreateProduct("Digital Variant", productRoot, price: 49.99m);
        var warehouse = dataBuilder.CreateWarehouse("Digital Warehouse", "US");
        var shippingOption = dataBuilder.CreateShippingOption("Digital Delivery", warehouse, fixedCost: 0m);

        var invoice = dataBuilder.CreateInvoice(customer: customer, total: 49.99m);
        invoice.SubTotal = 49.99m;
        invoice.Tax = 0m;
        invoice.Total = 49.99m;

        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(order, product: product, quantity: 1, amount: 49.99m, taxRate: 0m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (invoice, order.Id);
    }
}
