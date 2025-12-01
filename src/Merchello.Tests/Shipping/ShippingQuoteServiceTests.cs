using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.BuiltIn;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Warehouses.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Merchello.Tests.Shipping;

public class ShippingQuoteServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly IMerchDbContext _dbContext;

    public ShippingQuoteServiceTests(ServiceTestFixture fixture)
    {
        fixture.ResetDatabase();
        _dbContext = fixture.DbContext;
    }

    [Fact]
    public async Task GetQuotesAsync_ReturnsProviderQuotes()
    {
        var product = await SeedProductAsync(7m);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem
        {
            ProductId = product.Id,
            LineItemType = LineItemType.Product,
            Quantity = 1,
            Amount = product.Price,
            IsTaxable = true,
            TaxRate = 20
        });

        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var registeredProvider = new RegisteredShippingProvider(provider, new ShippingProviderConfiguration
        {
            ProviderKey = provider.Metadata.Key,
            IsEnabled = true
        });

        var registryMock = new Mock<IShippingProviderRegistry>();
        registryMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { registeredProvider });

        var service = new ShippingQuoteService(_dbContext, registryMock.Object, NullLogger<ShippingQuoteService>.Instance);

        var quotes = await service.GetQuotesAsync(basket, "GB");

        var quote = Assert.Single(quotes);
        Assert.Equal("flat-rate", quote.ProviderKey);
        Assert.Equal(7m, quote.ServiceLevels.Single().TotalCost);
        Assert.DoesNotContain(basket.Errors, e => e.IsShippingError);
    }

    [Fact]
    public async Task GetQuotesAsync_AddsErrorWhenLineItemMissingProduct()
    {
        var registryMock = new Mock<IShippingProviderRegistry>(MockBehavior.Strict);
        var service = new ShippingQuoteService(_dbContext, registryMock.Object, NullLogger<ShippingQuoteService>.Instance);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem
        {
            LineItemType = LineItemType.Product,
            Quantity = 1,
            Amount = 10m
        });

        var quotes = await service.GetQuotesAsync(basket, "GB");

        Assert.Empty(quotes);
        var error = Assert.Single(basket.Errors);
        Assert.True(error.IsShippingError);
        registryMock.VerifyNoOtherCalls();
    }

    private async Task<Product> SeedProductAsync(decimal shippingCost)
    {
        var taxGroup = new TaxGroup { Name = "Standard", TaxPercentage = 20m };
        var productType = new ProductType { Name = "General", Alias = "general" };
        var warehouse = new Warehouse { Name = "Central" };

        var shippingOption = new ShippingOption
        {
            Name = "Standard",
            Warehouse = warehouse,
            WarehouseId = warehouse.Id,
            DaysFrom = 2,
            DaysTo = 5
        };

        var shippingCostEntity = new ShippingCost
        {
            CountryCode = "GB",
            Cost = shippingCost,
            ShippingOption = shippingOption
        };

        shippingOption.ShippingCosts.Add(shippingCostEntity);

        var productRoot = new ProductRoot
        {
            Id = GuidExtensions.NewSequentialGuid,
            RootName = "Test Root",
            TaxGroup = taxGroup,
            TaxGroupId = taxGroup.Id,
            ProductType = productType,
            ProductTypeId = productType.Id,
            Weight = 1.2m
        };

        var product = new Product
        {
            Id = GuidExtensions.NewSequentialGuid,
            ProductRoot = productRoot,
            ProductRootId = productRoot.Id,
            Name = "Test Product",
            CostOfGoods = 5m,
            Price = 10m,
            Default = true,
            AvailableForPurchase = true,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };

        product.ShippingOptions.Add(shippingOption);
        shippingOption.Products.Add(product);

        _dbContext.TaxGroups.Add(taxGroup);
        _dbContext.ProductTypes.Add(productType);
        _dbContext.RootProducts.Add(productRoot);
        _dbContext.Warehouses.Add(warehouse);
        _dbContext.ShippingOptions.Add(shippingOption);
        _dbContext.Products.Add(product);

        await _dbContext.SaveChangesAsync();

        return product;
    }
}
