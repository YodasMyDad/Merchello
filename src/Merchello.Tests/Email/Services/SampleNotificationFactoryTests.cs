using Merchello.Core;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Email.Services;

[Collection("Integration Tests")]
public class SampleNotificationFactoryTests : IClassFixture<ServiceTestFixture>
{
    private readonly ISampleNotificationFactory _factory;

    public SampleNotificationFactoryTests(ServiceTestFixture fixture)
    {
        _factory = fixture.GetService<ISampleNotificationFactory>();
    }

    [Fact]
    public void CreateSampleNotification_InvoiceCreated_IncludesPurchaseOrder()
    {
        var notification = _factory.CreateSampleNotification(Constants.EmailTopics.InvoiceCreated);

        var invoiceNotification = notification.ShouldBeOfType<InvoiceSavedNotification>();
        invoiceNotification.Invoice.PurchaseOrder.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public void CreateSampleNotification_OrderCreated_IncludesNestedInvoicePurchaseOrder()
    {
        var notification = _factory.CreateSampleNotification(Constants.EmailTopics.OrderCreated);

        var orderNotification = notification.ShouldBeOfType<OrderCreatedNotification>();
        var invoice = orderNotification.Order.Invoice;
        invoice.ShouldNotBeNull();
        invoice!.PurchaseOrder.ShouldNotBeNullOrWhiteSpace();
    }
}
