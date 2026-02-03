using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

[Collection("Integration")]
public class CheckoutServiceConcurrencyTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutSessionService _checkoutSessionService;

    public CheckoutServiceConcurrencyTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _checkoutSessionService = fixture.GetService<ICheckoutSessionService>();
    }

    [Fact]
    public async Task UpdateLineItemQuantity_PreservesConcurrentLineItemChange()
    {
        var basket = _checkoutService.CreateBasket();
        var lineItemA = CreateLineItem("Item A", "ITEM-A", 1, 10m);
        var lineItemB = CreateLineItem("Item B", "ITEM-B", 1, 12m);
        lineItemA.Id = Guid.NewGuid();
        lineItemB.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItemA);
        basket.LineItems.Add(lineItemB);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItemB = concurrentBasket.LineItems.First(li => li.Id == lineItemB.Id);
            concurrentLineItemB.Quantity = 5;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        await _checkoutService.UpdateLineItemQuantity(lineItemA.Id, 3, "US");

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.First(li => li.Id == lineItemA.Id).Quantity.ShouldBe(3);
        updatedBasket.LineItems.First(li => li.Id == lineItemB.Id).Quantity.ShouldBe(5);
    }

    [Fact]
    public async Task UpdateLineItemQuantity_Removal_PreservesConcurrentLineItemChange()
    {
        var basket = _checkoutService.CreateBasket();
        var lineItemA = CreateLineItem("Item A", "ITEM-A", 1, 10m);
        var lineItemB = CreateLineItem("Item B", "ITEM-B", 1, 12m);
        lineItemA.Id = Guid.NewGuid();
        lineItemB.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItemA);
        basket.LineItems.Add(lineItemB);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItemB = concurrentBasket.LineItems.First(li => li.Id == lineItemB.Id);
            concurrentLineItemB.Quantity = 4;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        await _checkoutService.UpdateLineItemQuantity(lineItemA.Id, 0, "US");

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.Any(li => li.Id == lineItemA.Id).ShouldBeFalse();
        updatedBasket.LineItems.First(li => li.Id == lineItemB.Id).Quantity.ShouldBe(4);
    }

    [Fact]
    public async Task RemoveLineItem_PreservesConcurrentLineItemChange()
    {
        var basket = _checkoutService.CreateBasket();
        var lineItemA = CreateLineItem("Item A", "ITEM-A", 1, 10m);
        var lineItemB = CreateLineItem("Item B", "ITEM-B", 1, 12m);
        lineItemA.Id = Guid.NewGuid();
        lineItemB.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItemA);
        basket.LineItems.Add(lineItemB);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItemB = concurrentBasket.LineItems.First(li => li.Id == lineItemB.Id);
            concurrentLineItemB.Quantity = 6;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        await _checkoutService.RemoveLineItem(lineItemA.Id, "US");

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.Any(li => li.Id == lineItemA.Id).ShouldBeFalse();
        updatedBasket.LineItems.First(li => li.Id == lineItemB.Id).Quantity.ShouldBe(6);
    }

    [Fact]
    public async Task SaveAddressesAsync_PreservesConcurrentLineItemChange()
    {
        var basket = _checkoutService.CreateBasket();
        var lineItemA = CreateLineItem("Item A", "ITEM-A", 1, 10m);
        var lineItemB = CreateLineItem("Item B", "ITEM-B", 1, 12m);
        lineItemA.Id = Guid.NewGuid();
        lineItemB.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItemA);
        basket.LineItems.Add(lineItemB);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItemB = concurrentBasket.LineItems.First(li => li.Id == lineItemB.Id);
            concurrentLineItemB.Quantity = 7;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        var addressDto = new AddressDto
        {
            Name = "John Doe",
            AddressOne = "123 Main St",
            TownCity = "London",
            PostalCode = "SW1A 1AA",
            Country = "United Kingdom",
            CountryCode = "GB",
            CountyState = "London",
            RegionCode = "LDN",
            Email = "john@example.com",
            Phone = "123456"
        };

        var result = await _checkoutService.SaveAddressesAsync(new SaveAddressesParameters
        {
            Basket = basket,
            Email = "john@example.com",
            BillingAddress = addressDto,
            ShippingAddress = addressDto,
            ShippingSameAsBilling = true
        });

        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldNotBeNull();

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.First(li => li.Id == lineItemB.Id).Quantity.ShouldBe(7);
    }

    [Fact]
    public async Task SaveShippingSelectionsAsync_PreservesConcurrentLineItemChange()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new Merchello.Core.Shipping.Models.ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Widget", productRoot, price: 30.00m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = dataBuilder.CreateBasket();
        var lineItem = dataBuilder.CreateBasketLineItem(product, 1);
        lineItem.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItem);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        var session = await _checkoutSessionService.GetSessionAsync(basket.Id);
        var address = new Address { CountryCode = "GB", CountyState = new CountyState { RegionCode = "GB" }, Email = "test@example.com" };
        await _checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basket.Id,
            Billing = address,
            Shipping = address,
            SameAsBilling = true
        });
        session.ShippingAddress = address;

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItem = concurrentBasket.LineItems.First(li => li.Id == lineItem.Id);
            concurrentLineItem.Quantity = 3;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        var result = await _checkoutService.SaveShippingSelectionsAsync(new SaveShippingSelectionsParameters
        {
            Basket = basket,
            Session = session,
            Selections = new Dictionary<Guid, string>()
        });

        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldNotBeNull();

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.First(li => li.Id == lineItem.Id).Quantity.ShouldBe(3);
    }

    [Fact]
    public async Task InitializeCheckoutAsync_PreservesConcurrentLineItemChange()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new Merchello.Core.Shipping.Models.ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Widget", productRoot, price: 30.00m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = dataBuilder.CreateBasket();
        var lineItem = dataBuilder.CreateBasketLineItem(product, 1);
        lineItem.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItem);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItem = concurrentBasket.LineItems.First(li => li.Id == lineItem.Id);
            concurrentLineItem.Quantity = 4;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        var result = await _checkoutService.InitializeCheckoutAsync(new InitializeCheckoutParameters
        {
            Basket = basket,
            CountryCode = "GB"
        });

        result.ResultObject.ShouldNotBeNull();

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.First(li => li.Id == lineItem.Id).Quantity.ShouldBe(4);
    }

    [Fact]
    public async Task ConvertBasketCurrencyAsync_PreservesConcurrentLineItemChange()
    {
        var basket = _checkoutService.CreateBasket();
        var lineItemA = CreateLineItem("Item A", "ITEM-A", 1, 10m);
        var lineItemB = CreateLineItem("Item B", "ITEM-B", 1, 12m);
        lineItemA.Id = Guid.NewGuid();
        lineItemB.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItemA);
        basket.LineItems.Add(lineItemB);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItemB = concurrentBasket.LineItems.First(li => li.Id == lineItemB.Id);
            concurrentLineItemB.Quantity = 5;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        var result = await _checkoutService.ConvertBasketCurrencyAsync(new ConvertBasketCurrencyParameters
        {
            NewCurrencyCode = "GBP"
        });

        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldNotBeNull();

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.First(li => li.Id == lineItemB.Id).Quantity.ShouldBe(5);
    }

    [Fact]
    public async Task EnsureBasketCurrencyAsync_PreservesConcurrentLineItemChange()
    {
        var basket = _checkoutService.CreateBasket();
        var lineItemA = CreateLineItem("Item A", "ITEM-A", 1, 10m);
        var lineItemB = CreateLineItem("Item B", "ITEM-B", 1, 12m);
        lineItemA.Id = Guid.NewGuid();
        lineItemB.Id = Guid.NewGuid();
        basket.LineItems.Add(lineItemA);
        basket.LineItems.Add(lineItemB);

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        using (var concurrentContext = _fixture.CreateDbContext())
        {
            var concurrentBasket = await concurrentContext.Baskets.FirstAsync(b => b.Id == basket.Id);
            var concurrentLineItemB = concurrentBasket.LineItems.First(li => li.Id == lineItemB.Id);
            concurrentLineItemB.Quantity = 6;
            concurrentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
            await concurrentContext.SaveChangesAsync();
        }

        var updated = await _checkoutService.EnsureBasketCurrencyAsync(new EnsureBasketCurrencyParameters
        {
            Basket = basket,
            CurrencyCode = "GBP",
            CurrencySymbol = "GBP"
        });

        updated.ShouldNotBeNull();

        using var verifyContext = _fixture.CreateDbContext();
        var updatedBasket = await verifyContext.Baskets.FirstAsync(b => b.Id == basket.Id);
        updatedBasket.LineItems.First(li => li.Id == lineItemB.Id).Quantity.ShouldBe(6);
    }

    private static LineItem CreateLineItem(string name, string sku, int quantity, decimal amount)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            name,
            sku,
            amount,
            cost: 0m,
            quantity: quantity,
            isTaxable: false,
            taxRate: 0m);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.OrderId = null;
        return lineItem;
    }
}
