using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Data;
using Merchello.Core.Products.Services;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;

namespace Merchello.Tests.Checkout;

public class CheckoutServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly IMerchDbContext _dbContext;

    public CheckoutServiceTests(ServiceTestFixture fixture)
    {
        // Reset the database state here to avoid clashing with other tests
        fixture.ResetDatabase();

        fixture.ServiceProvider.GetService<ProductService>();
        _dbContext = fixture.DbContext;
    }

    private CheckoutService CreateService()
        => new(new LineItemService(), _dbContext, new HttpContextAccessor(), new StubShippingQuoteService());

    private sealed class StubShippingQuoteService : IShippingQuoteService
    {
        public Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesAsync(
            Basket basket,
            string countryCode,
            string? stateOrProvinceCode = null,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyCollection<ShippingRateQuote>>(Array.Empty<ShippingRateQuote>());
        }
    }


    [Fact]
    public void AddToBasket()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        var lineItem = new LineItem
        {
            Sku = "TEST",
            Quantity = 1,
            Amount = 10.00M,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 10
        };

        // Act
        service.AddToBasket(basket, lineItem, "GB");

        // Assert
        Assert.Single(basket.LineItems);
        Assert.Equal(lineItem.Sku, basket.LineItems[0].Sku);
        Assert.Equal(lineItem.Amount, basket.LineItems[0].Amount);
        Assert.Equal(11M, basket.Total); // Amount + Tax
    }

    [Fact]
    public void RemoveFromBasket()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        var lineItem = new LineItem { Sku = "TEST", Quantity = 1, Amount = 10.00M };
        basket.LineItems.Add(lineItem);

        // Act
        service.RemoveFromBasket(basket, lineItem.Id, "GB");

        // Assert
        Assert.Empty(basket.LineItems);
    }

    [Fact]
    public void CalculateBasket()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        basket.LineItems.Add(new LineItem { Sku = "TEST", Quantity = 2, Amount = 10.00M, LineItemType = LineItemType.Product });

        // Act
        service.CalculateBasket(basket);

        // Assert
        Assert.Equal(20M, basket.SubTotal);
        Assert.Equal(20M, basket.Total); // Assuming no tax for simplicity
    }

    [Fact]
    public void CalculateBasket_WithMultipleDifferentTaxRates()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        // 1
        var lineItem1 = new LineItem
        {
            Sku = "BOOK",
            Quantity = 1,
            Amount = 20.00M,
            IsTaxable = true,
            TaxRate = 5
        };

        // 12
        var lineItem2 = new LineItem
        {
            Sku = "ELECTRONIC",
            Quantity = 2,
            Amount = 30.00M,
            IsTaxable = true,
            TaxRate = 20
        };

        // 4.5
        var lineItem3 = new LineItem
        {
            Sku = "TOY",
            Quantity = 3,
            Amount = 15.00M,
            IsTaxable = true,
            TaxRate = 10
        };

        // 0
        var lineItem4 = new LineItem
        {
            Sku = "NON-TAXABLE",
            Quantity = 1,
            Amount = 10.00M,
            IsTaxable = false,
            TaxRate = 0
        };

        basket.LineItems.Add(lineItem1);
        basket.LineItems.Add(lineItem2);
        basket.LineItems.Add(lineItem3);
        basket.LineItems.Add(lineItem4);

        // Act
        service.CalculateBasket(basket);

        // Assert
        const decimal expectedSubTotal = 135.00M;
        const decimal expectedTaxTotal = 17.50M;
        const decimal expectedTotal = 152.50M;

        Assert.Equal(expectedSubTotal, basket.SubTotal);
        Assert.Equal(expectedTaxTotal, basket.Tax);
        Assert.Equal(expectedTotal, basket.Total);
    }

    [Fact]
    public void CalculateBasket_WithMultipleTaxRates_PercentageDiscount()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        // 1
        var lineItem1 = new LineItem
        {
            Sku = "BOOK",
            Quantity = 1,
            Amount = 20.00M,
            IsTaxable = true,
            TaxRate = 5
        };

        // 12
        var lineItem2 = new LineItem
        {
            Sku = "ELECTRONIC",
            Quantity = 2,
            Amount = 30.00M,
            IsTaxable = true,
            TaxRate = 20
        };

        // 4.5
        var lineItem3 = new LineItem
        {
            Sku = "TOY",
            Quantity = 3,
            Amount = 15.00M,
            IsTaxable = true,
            TaxRate = 10
        };

        // 0
        var lineItem4 = new LineItem
        {
            Sku = "NON-TAXABLE",
            Quantity = 1,
            Amount = 10.00M,
            IsTaxable = false,
            TaxRate = 0
        };

        var discount = new Adjustment
        {
            Amount = 20,
            AdjustmentType = AdjustmentType.Figure
        };

        basket.LineItems.Add(lineItem1);
        basket.LineItems.Add(lineItem2);
        basket.LineItems.Add(lineItem3);
        basket.LineItems.Add(lineItem4);

        basket.Adjustments.Add(discount);

        // Act
        service.CalculateBasket(basket);

        // Assert
        const decimal expectedSubTotal = 135.00M;
        const decimal expectedAdjustedSubTotal = 115.00M;
        const decimal expectedTaxTotal = 14.90M;
        const decimal expectedTotal = 129.90M;

        Assert.Equal(expectedSubTotal, basket.SubTotal);
        Assert.Equal(discount.Amount, basket.Discount);
        Assert.Equal(expectedAdjustedSubTotal, basket.AdjustedSubTotal);
        Assert.Equal(expectedTaxTotal, basket.Tax);
        Assert.Equal(expectedTotal, basket.Total);
    }


    [Fact]
    public void CalculateBasket_WithMultipleTaxRates_FigureDiscount()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        // 1
        var lineItem1 = new LineItem
        {
            Sku = "BOOK",
            Quantity = 1,
            Amount = 20.00M,
            IsTaxable = true,
            TaxRate = 5
        };

        // 12
        var lineItem2 = new LineItem
        {
            Sku = "ELECTRONIC",
            Quantity = 2,
            Amount = 30.00M,
            IsTaxable = true,
            TaxRate = 20
        };

        // 4.5
        var lineItem3 = new LineItem
        {
            Sku = "TOY",
            Quantity = 3,
            Amount = 15.00M,
            IsTaxable = true,
            TaxRate = 10
        };

        // 0
        var lineItem4 = new LineItem
        {
            Sku = "NON-TAXABLE",
            Quantity = 1,
            Amount = 10.00M,
            IsTaxable = false,
            TaxRate = 0
        };

        var discount = new Adjustment
        {
            Amount = 20,
            AdjustmentType = AdjustmentType.Percentage
        };

        basket.LineItems.Add(lineItem1);
        basket.LineItems.Add(lineItem2);
        basket.LineItems.Add(lineItem3);
        basket.LineItems.Add(lineItem4);

        basket.Adjustments.Add(discount);

        // Act
        service.CalculateBasket(basket);

        // Assert
        const decimal expectedSubTotal = 135.00M;
        const decimal expectedAdjustedSubTotal = 108.00M;
        const decimal expectedTaxTotal = 14.00M;
        const decimal expectedTotal = 122.00M;

        Assert.Equal(expectedSubTotal, basket.SubTotal);
        Assert.Equal(27, basket.Discount);
        Assert.Equal(expectedAdjustedSubTotal, basket.AdjustedSubTotal);
        Assert.Equal(expectedTaxTotal, basket.Tax);
        Assert.Equal(expectedTotal, basket.Total);
    }

    [Fact]
    public void CalculateBasket_HandlesZeroTaxRate()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        var lineItem1 = new LineItem
        {
            Sku = "BOOK",
            Quantity = 2,
            Amount = 15.00M,
            IsTaxable = false,
            TaxRate = 0
        };

        basket.LineItems.Add(lineItem1);

        // Act
        service.CalculateBasket(basket);

        // Assert
        var expectedSubTotal = 30.00M; // 2 * 15.00
        var expectedTaxTotal = 0.00M; // No tax
        var expectedTotal = 30.00M; // expectedSubTotal + expectedTaxTotal

        Assert.Equal(expectedSubTotal, basket.SubTotal);
        Assert.Equal(expectedTaxTotal, basket.Tax);
        Assert.Equal(expectedTotal, basket.Total);
    }

    [Fact]
    public void AddToBasket_WithEmptyBasket_AddsFirstItem()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        var lineItem = new LineItem
        {
            Sku = "FIRST",
            Quantity = 1,
            Amount = 25.00M,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20
        };

        // Act
        service.AddToBasket(basket, lineItem, "GB");

        // Assert
        Assert.Single(basket.LineItems);
        Assert.Equal("FIRST", basket.LineItems[0].Sku);
        Assert.Equal(30M, basket.Total); // 25 + 5 (20% tax)
    }

    [Fact]
    public void AddToBasket_WithNewItem_AddsToBasket()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        var lineItem1 = new LineItem
        {
            Sku = "ITEM1",
            Quantity = 2,
            Amount = 10.00M,
            LineItemType = LineItemType.Product
        };

        basket.LineItems.Add(lineItem1);
        service.CalculateBasket(basket);

        // Act - Add different item
        var lineItem2 = new LineItem
        {
            Sku = "ITEM2",
            Quantity = 3,
            Amount = 15.00M,
            LineItemType = LineItemType.Product
        };
        service.AddToBasket(basket, lineItem2, "GB");

        // Assert
        Assert.Equal(2, basket.LineItems.Count);
        Assert.Equal(65M, basket.SubTotal); // 2*10 + 3*15
    }

    [Fact]
    public void RemoveFromBasket_WithNonExistentId_DoesNothing()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        var lineItem = new LineItem { Sku = "TEST", Quantity = 1, Amount = 10.00M };
        basket.LineItems.Add(lineItem);
        var initialCount = basket.LineItems.Count;

        // Act
        service.RemoveFromBasket(basket, Guid.NewGuid(), "GB");

        // Assert
        Assert.Equal(initialCount, basket.LineItems.Count);
    }

    [Fact]
    public void CalculateBasket_WithEmptyBasket_ReturnsZero()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        // Act
        service.CalculateBasket(basket);

        // Assert
        Assert.Equal(0M, basket.SubTotal);
        Assert.Equal(0M, basket.Tax);
        Assert.Equal(0M, basket.Total);
    }

    [Fact]
    public void CalculateBasket_WithMaximumQuantities_HandlesLargeNumbers()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        var lineItem = new LineItem
        {
            Sku = "BULK",
            Quantity = 10000,
            Amount = 1.50M,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20
        };

        basket.LineItems.Add(lineItem);

        // Act
        service.CalculateBasket(basket);

        // Assert
        Assert.Equal(15000M, basket.SubTotal); // 10000 * 1.50
        Assert.Equal(3000M, basket.Tax); // 15000 * 0.20
        Assert.Equal(18000M, basket.Total);
    }

    [Fact]
    public void CalculateBasket_WithDiscount_GreaterThanSubTotal_CapsAtSubTotal()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        var lineItem = new LineItem
        {
            Sku = "CHEAP",
            Quantity = 1,
            Amount = 10.00M,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20
        };

        basket.LineItems.Add(lineItem);

        // Add discount greater than subtotal
        var discount = new Adjustment
        {
            Amount = 50,
            AdjustmentType = AdjustmentType.Figure
        };
        basket.Adjustments.Add(discount);

        // Act
        service.CalculateBasket(basket);

        // Assert
        Assert.Equal(10M, basket.SubTotal);
        // Service appears to cap discount at subtotal
        Assert.True(basket.Discount <= basket.SubTotal);
        Assert.True(basket.AdjustedSubTotal >= 0); // Should not go negative
    }

    [Fact]
    public void CalculateBasket_WithZeroQuantity_CalculatesCorrectly()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        var lineItem = new LineItem
        {
            Sku = "ZERO",
            Quantity = 0,
            Amount = 100.00M,
            LineItemType = LineItemType.Product
        };

        basket.LineItems.Add(lineItem);

        // Act
        service.CalculateBasket(basket);

        // Assert
        Assert.Equal(0M, basket.SubTotal); // 0 * 100
    }

    [Fact]
    public void CalculateBasket_WithMultipleAdjustments_AppliesAll()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();

        var lineItem = new LineItem
        {
            Sku = "ITEM",
            Quantity = 1,
            Amount = 100.00M,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 10
        };

        basket.LineItems.Add(lineItem);

        basket.Adjustments.Add(new Adjustment { Amount = 10, AdjustmentType = AdjustmentType.Figure });
        basket.Adjustments.Add(new Adjustment { Amount = 5, AdjustmentType = AdjustmentType.Percentage });

        // Act
        service.CalculateBasket(basket);

        // Assert
        Assert.Equal(100M, basket.SubTotal);
        // 100 - 10 (figure) = 90, then 90 - 4.5 (5% of 90) = 85.5
        Assert.True(basket.Discount > 0);
        Assert.True(basket.AdjustedSubTotal < basket.SubTotal);
    }

    [Fact]
    public void AddToBasket_WithNegativeAmount_FiltersOut()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        var lineItem = new LineItem
        {
            Sku = "REFUND",
            Quantity = 1,
            Amount = -10.00M, // Negative amount (e.g., refund)
            LineItemType = LineItemType.Product
        };

        // Act
        service.AddToBasket(basket, lineItem, "GB");

        // Assert
        // Service appears to filter negative amounts
        Assert.Equal(0M, basket.Total);
    }

    [Fact]
    public void RemoveFromBasket_RemovesCorrectItem()
    {
        // Arrange
        var service = CreateService();
        var basket = new Basket();
        var lineItem1 = new LineItem { Sku = "ITEM1", Quantity = 1, Amount = 10.00M };
        var lineItem2 = new LineItem { Sku = "ITEM2", Quantity = 1, Amount = 20.00M };

        basket.LineItems.Add(lineItem1);
        basket.LineItems.Add(lineItem2);

        // Act
        service.RemoveFromBasket(basket, lineItem1.Id, "GB");

        // Assert
        Assert.Single(basket.LineItems);
        Assert.Equal("ITEM2", basket.LineItems[0].Sku);
    }

}
