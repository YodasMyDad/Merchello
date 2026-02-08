using Merchello.Core;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Factories;

public class InvoiceFactoryTests
{
    private readonly InvoiceFactory _factory;

    public InvoiceFactoryTests()
    {
        var currencyService = new Mock<ICurrencyService>();
        currencyService
            .Setup(x => x.GetCurrency(It.IsAny<string>()))
            .Returns((string code) => new CurrencyInfo(code, "$", 2, true));
        currencyService
            .Setup(x => x.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string _) => Math.Round(amount, 2));

        _factory = new InvoiceFactory(currencyService.Object);
    }

    [Fact]
    public void CreateManual_UsesDraftInvoiceSourceType()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var billingAddress = CreateAddress();
        var shippingAddress = CreateAddress();

        // Act
        var invoice = _factory.CreateManual(
            invoiceNumber: "INV-1001",
            customerId: customerId,
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "USD",
            subTotal: 100m,
            tax: 20m,
            total: 120m,
            authorName: "Admin");

        // Assert
        invoice.Source.ShouldNotBeNull();
        invoice.Source!.Type.ShouldBe(Constants.InvoiceSources.Draft);
    }

    [Fact]
    public void ManualInvoiceSourceAlias_MatchesDraft()
    {
        Constants.InvoiceSources.Manual.ShouldBe(Constants.InvoiceSources.Draft);
    }

    [Fact]
    public void CreateFromBasket_WithPurchaseOrder_SetsTrimmedPurchaseOrder()
    {
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "USD",
            CurrencySymbol = "$",
            SubTotal = 100m,
            Discount = 0m,
            AdjustedSubTotal = 100m,
            Tax = 20m,
            Total = 120m
        };

        var invoice = _factory.CreateFromBasket(
            basket: basket,
            invoiceNumber: "INV-1002",
            billingAddress: CreateAddress(),
            shippingAddress: CreateAddress(),
            presentmentCurrency: "USD",
            storeCurrency: "USD",
            customerId: Guid.NewGuid(),
            purchaseOrder: "  PO-12345  ");

        invoice.PurchaseOrder.ShouldBe("PO-12345");
    }

    private static Address CreateAddress() =>
        new()
        {
            Name = "Test Customer",
            AddressOne = "1 Test Street",
            TownCity = "Testville",
            PostalCode = "12345",
            CountryCode = "US",
            CountyState = new CountyState
            {
                Name = "California",
                RegionCode = "CA"
            }
        };
}
