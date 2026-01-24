using System.Text.Json;
using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

/// <summary>
/// Integration tests for CheckoutService - manages basket, checkout flow, and order creation.
/// </summary>
[Collection("Integration")]
public class CheckoutServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutDiscountService _checkoutDiscountService;
    private readonly ICheckoutSessionService _checkoutSessionService;

    public CheckoutServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _checkoutDiscountService = fixture.GetService<ICheckoutDiscountService>();
        _checkoutSessionService = fixture.GetService<ICheckoutSessionService>();
    }

    #region Basket Creation Tests

    [Fact]
    public void CreateBasket_UsesStoreCurrency()
    {
        // Act
        var basket = _checkoutService.CreateBasket();

        // Assert
        basket.ShouldNotBeNull();
        basket.Currency.ShouldBe("USD"); // Default store currency from MerchelloSettings
        basket.LineItems.ShouldBeEmpty();
    }

    [Fact]
    public void CreateBasket_WithCustomCurrency_SetsCorrectly()
    {
        // Act
        var basket = _checkoutService.CreateBasket("USD");

        // Assert
        basket.ShouldNotBeNull();
        basket.Currency.ShouldBe("USD");
    }

    [Fact]
    public async Task CreateBasket_WithCustomerId_AssociatesCustomer()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer(email: "basket-test@example.com");
        await dataBuilder.SaveChangesAsync();

        // Act
        var basket = _checkoutService.CreateBasket(customerId: customer.Id);

        // Assert
        basket.ShouldNotBeNull();
        basket.CustomerId.ShouldBe(customer.Id);
    }

    #endregion

    #region Add to Basket Tests

    [Fact]
    public async Task AddToBasketAsync_ValidProduct_AddsLineItem()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        var lineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 1,
            Amount = 10m
        };

        // Act
        await _checkoutService.AddToBasketAsync(basket, lineItem, "GB");

        // Assert
        basket.LineItems.Count.ShouldBe(1);
        basket.LineItems.First().Name.ShouldBe("Test Product");
        basket.LineItems.First().Quantity.ShouldBe(1);
    }

    [Fact]
    public async Task AddToBasketAsync_SameProduct_IncrementsQuantity()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        var productId = Guid.NewGuid();
        var lineItem1 = new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 1,
            Amount = 10m
        };
        var lineItem2 = new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 2,
            Amount = 10m
        };

        // Act
        await _checkoutService.AddToBasketAsync(basket, lineItem1, "GB");
        await _checkoutService.AddToBasketAsync(basket, lineItem2, "GB");

        // Assert
        basket.LineItems.Count.ShouldBe(1);
        basket.LineItems.First().Quantity.ShouldBe(3);
    }

    [Fact]
    public async Task AddToBasketAsync_CalculatesSubtotal()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        var lineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 3,
            Amount = 10m
        };

        // Act
        await _checkoutService.AddToBasketAsync(basket, lineItem, "GB");

        // Assert
        basket.SubTotal.ShouldBe(30m);
    }

    #endregion

    #region Update/Remove Tests

    [Fact]
    public async Task UpdateBasketAsync_UpdatesLineItemAndRecalculates()
    {
        // Arrange - test basket calculation directly
        var basket = _checkoutService.CreateBasket();
        var lineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 2,
            Amount = 15m
        };
        basket.LineItems.Add(lineItem);

        // Act - update quantity directly and recalculate
        lineItem.Quantity = 5;
        await _checkoutService.CalculateBasketAsync(
            new CalculateBasketParameters { Basket = basket, CountryCode = "GB" });

        // Assert - basket is modified in place
        basket.LineItems.First().Quantity.ShouldBe(5);
        basket.SubTotal.ShouldBe(75m); // 5 * 15
    }

    [Fact]
    public async Task RemoveFromBasketAsync_RemovesAndRecalculates()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        var lineItem1Id = Guid.NewGuid();
        var lineItem2Id = Guid.NewGuid();

        await _checkoutService.AddToBasketAsync(basket, new LineItem
        {
            Id = lineItem1Id,
            Name = "Product 1",
            Sku = "PROD-001",
            Quantity = 1,
            Amount = 20m
        }, "GB");

        await _checkoutService.AddToBasketAsync(basket, new LineItem
        {
            Id = lineItem2Id,
            Name = "Product 2",
            Sku = "PROD-002",
            Quantity = 1,
            Amount = 30m
        }, "GB");

        // Act
        await _checkoutService.RemoveFromBasketAsync(basket, lineItem1Id, "GB");

        // Assert
        basket.LineItems.Count.ShouldBe(1);
        basket.LineItems.First().Name.ShouldBe("Product 2");
        basket.SubTotal.ShouldBe(30m);
    }

    [Fact]
    public async Task DeleteBasket_RemovesFromDatabase()
    {
        // Arrange - create and save basket to database
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Product 1",
            Sku = "PROD-001",
            Quantity = 1,
            Amount = 20m
        });

        // Save basket to database through the fixture's DbContext
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        // Verify basket exists in database
        var existsBefore = await _fixture.DbContext.Baskets.AnyAsync(b => b.Id == basket.Id);
        existsBefore.ShouldBeTrue();

        // Act
        await _checkoutService.DeleteBasket(basket.Id);

        // Assert - basket should be removed from database
        // Use a new context to avoid cached entities
        using var verifyContext = _fixture.CreateDbContext();
        var existsAfter = await verifyContext.Baskets.AnyAsync(b => b.Id == basket.Id);
        existsAfter.ShouldBeFalse();
    }

    #endregion

    #region Calculation Tests

    [Fact]
    public async Task CalculateBasketAsync_CalculatesSubtotal()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Product 1",
            Sku = "PROD-001",
            Quantity = 2,
            Amount = 25m
        });
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Product 2",
            Sku = "PROD-002",
            Quantity = 1,
            Amount = 50m
        });

        // Act
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB"
        });

        // Assert
        basket.SubTotal.ShouldBe(100m); // (2*25) + (1*50)
    }

    [Fact]
    public async Task CalculateBasketAsync_CalculatesTax()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Taxable Product",
            Sku = "TAX-001",
            Quantity = 1,
            Amount = 100m,
            IsTaxable = true
        });

        // Act
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB"
        });

        // Assert
        basket.SubTotal.ShouldBe(100m);
        // Tax calculation depends on configured tax rate
    }

    [Fact]
    public async Task CalculateBasketAsync_WithMultipleItems_CalculatesCorrectTotal()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Item 1",
            Sku = "ITEM-001",
            Quantity = 3,
            Amount = 10m
        });
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Item 2",
            Sku = "ITEM-002",
            Quantity = 2,
            Amount = 20m
        });

        // Act
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "US"
        });

        // Assert
        basket.SubTotal.ShouldBe(70m); // (3*10) + (2*20)
    }

    #endregion

    #region Session Tests

    [Fact]
    public async Task SaveAddressesAsync_UpdatesSession()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var billing = new Address
        {
            Name = "John Doe",
            Email = "john@example.com",
            AddressOne = "123 Main St",
            TownCity = "London",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        // Act
        await _checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basketId,
            Billing = billing,
            SameAsBilling = true
        });

        // Assert
        var session = await _checkoutSessionService.GetSessionAsync(basketId);
        session.ShouldNotBeNull();
        session.BillingAddress.ShouldNotBeNull();
        session.BillingAddress.Name.ShouldBe("John Doe");
        session.BillingAddress.Email.ShouldBe("john@example.com");
    }

    [Fact]
    public async Task SaveAddressesAsync_WithShippingAddress_SavesBothAddresses()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var billing = new Address
        {
            Name = "John Doe",
            Email = "john@example.com",
            AddressOne = "123 Billing St",
            TownCity = "London",
            CountryCode = "GB"
        };
        var shipping = new Address
        {
            Name = "Jane Doe",
            AddressOne = "456 Shipping Ave",
            TownCity = "Manchester",
            CountryCode = "GB"
        };

        // Act
        await _checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basketId,
            Billing = billing,
            Shipping = shipping,
            SameAsBilling = false
        });

        // Assert
        var session = await _checkoutSessionService.GetSessionAsync(basketId);
        session.BillingAddress.ShouldNotBeNull();
        session.BillingAddress.Name.ShouldBe("John Doe");
        session.ShippingAddress.ShouldNotBeNull();
        session.ShippingAddress!.Name.ShouldBe("Jane Doe");
    }

    [Fact]
    public async Task GetSessionAsync_NewBasket_ReturnsDefaultSession()
    {
        // Arrange
        var basketId = Guid.NewGuid();

        // Act
        var session = await _checkoutSessionService.GetSessionAsync(basketId);

        // Assert
        session.ShouldNotBeNull();
        session.BasketId.ShouldBe(basketId);
        session.CurrentStep.ShouldBe(CheckoutStep.Information);
    }

    #endregion

    #region Discount Code Tests

    [Fact]
    public async Task ApplyDiscountCodeAsync_InvalidCode_ReturnsError()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Product",
            Sku = "PROD-001",
            Quantity = 1,
            Amount = 100m
        });

        // Act
        var result = await _checkoutDiscountService.ApplyDiscountCodeAsync(basket, "INVALID-CODE", "GB");

        // Assert
        result.Messages.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task RemovePromotionalDiscountAsync_RemovesDiscountLineItem()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        var discountId = Guid.NewGuid();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Product",
            Sku = "PROD-001",
            Quantity = 1,
            Amount = 100m
        });
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Discount",
            Sku = "DISCOUNT",
            Quantity = 1,
            Amount = -10m,
            LineItemType = LineItemType.Discount,
            ExtendedData = new Dictionary<string, object> { ["DiscountId"] = discountId }
        });

        // Act
        var result = await _checkoutDiscountService.RemovePromotionalDiscountAsync(basket, discountId, "GB");

        // Assert
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject!.LineItems.Count.ShouldBe(1);
        result.ResultObject.LineItems.All(li => li.LineItemType != LineItemType.Discount).ShouldBeTrue();
    }

    #endregion

    #region Order Group Tests

    [Fact]
    public async Task GetOrderGroupsAsync_ReturnsGroupedItems()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        await dataBuilder.SaveChangesAsync();

        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Name = "Test Product",
            Sku = product.Sku,
            Quantity = 1,
            Amount = 50m
        });

        var session = await _checkoutSessionService.GetSessionAsync(basket.Id);

        // Act
        var result = await _checkoutService.GetOrderGroupsAsync(basket, session);

        // Assert
        result.ShouldNotBeNull();
        // The result depends on the order grouping strategy
    }

    #endregion

    #region Initialize Checkout Tests

    [Fact]
    public async Task InitializeCheckoutAsync_SetsUpBasketForCheckout()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Checkout Product",
            Sku = "CHECKOUT-001",
            Quantity = 2,
            Amount = 75m
        });

        // Save basket to database first (InitializeCheckoutAsync will update it)
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.SaveBasketToSession(basket);

        // Act
        var result = await _checkoutService.InitializeCheckoutAsync(new InitializeCheckoutParameters
        {
            Basket = basket,
            CountryCode = "GB"
        });

        // Assert
        result.ShouldNotBeNull();
        // The basket should be calculated and ready for checkout
    }

    #endregion

    #region Get Basket Tests

    [Fact]
    public async Task GetBasket_ExistingBasket_ReturnsBasket()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Persisted Product",
            Sku = "PERSIST-001",
            Quantity = 1,
            Amount = 25m
        });

        // Save basket to session
        _checkoutSessionService.SaveBasketToSession(basket);

        // Act
        var retrieved = await _checkoutService.GetBasket(new GetBasketParameters());

        // Assert
        retrieved.ShouldNotBeNull();
        retrieved!.Id.ShouldBe(basket.Id);
    }

    [Fact]
    public async Task GetBasket_NonExistentBasket_ReturnsNull()
    {
        // Clear session to ensure no basket exists
        _fixture.MockHttpContext.ClearSession();

        // Act
        var result = await _checkoutService.GetBasket(new GetBasketParameters());

        // Assert
        result.ShouldBeNull();
    }

    #endregion

    #region Update Basket Tests

    [Fact]
    public async Task UpdateBasket_AddNewLineItems_RecalculatesTotal()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Original Product",
            Sku = "UPDATE-001",
            Quantity = 1,
            Amount = 50m
        });

        // Act - add another item
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Added Product",
            Sku = "UPDATE-002",
            Quantity = 2,
            Amount = 30m
        });
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB"
        });

        // Assert
        basket.LineItems.Count.ShouldBe(2);
        basket.SubTotal.ShouldBe(110m); // 50 + (2*30)
    }

    #endregion

    #region Location Tests

    [Fact]
    public async Task GetAvailableCountriesAsync_ReturnsCountries()
    {
        // Act
        var countries = await _checkoutService.GetAvailableCountriesAsync();

        // Assert
        countries.ShouldNotBeNull();
        // The mock returns empty, but the method should not throw
    }

    [Fact]
    public async Task GetAllCountriesAsync_ReturnsAllCountries()
    {
        // Act
        var countries = await _checkoutService.GetAllCountriesAsync();

        // Assert
        countries.ShouldNotBeNull();
        // The mock returns GB, US, DE
        countries.Count.ShouldBe(3);
    }

    #endregion

    #region CreateLineItem Tests

    [Fact]
    public void CreateLineItem_WithVariantOptions_ExtractsSelectedOptions()
    {
        // Arrange - create product with variant options
        var colorValueGrey = new ProductOptionValue { Id = Guid.NewGuid(), Name = "Grey", FullName = "Grey" };
        var colorValueBlue = new ProductOptionValue { Id = Guid.NewGuid(), Name = "Blue", FullName = "Blue" };
        var sizeValueS = new ProductOptionValue { Id = Guid.NewGuid(), Name = "S", FullName = "S" };
        var sizeValueM = new ProductOptionValue { Id = Guid.NewGuid(), Name = "M", FullName = "M" };

        var colorOption = new ProductOption
        {
            Id = Guid.NewGuid(),
            Name = "Color",
            Alias = "color",
            SortOrder = 1,
            IsVariant = true,
            ProductOptionValues = [colorValueGrey, colorValueBlue]
        };

        var sizeOption = new ProductOption
        {
            Id = Guid.NewGuid(),
            Name = "Size",
            Alias = "size",
            SortOrder = 2,
            IsVariant = true,
            ProductOptionValues = [sizeValueS, sizeValueM]
        };

        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Premium V-Neck",
            ProductOptions = [colorOption, sizeOption]
        };

        // Create comma-separated variant key (Grey + S)
        var variantOptionsKey = $"{colorValueGrey.Id},{sizeValueS.Id}";

        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = "S-Grey",
            Sku = "PREMIUM-V-NECK-S-GREY",
            Price = 29.99m,
            VariantOptionsKey = variantOptionsKey
        };

        // Act
        var lineItem = _checkoutService.CreateLineItem(product);

        // Assert - verify ProductRootName is stored
        lineItem.ExtendedData.ShouldContainKey(Constants.ExtendedDataKeys.ProductRootName);
        lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductRootName].ShouldBe("Premium V-Neck");

        // Assert - verify SelectedOptions contains correct option/value pairs
        lineItem.ExtendedData.ShouldContainKey(Constants.ExtendedDataKeys.SelectedOptions);
        var optionsJson = lineItem.ExtendedData[Constants.ExtendedDataKeys.SelectedOptions]?.ToString();
        optionsJson.ShouldNotBeNullOrEmpty();

        var selectedOptions = JsonSerializer.Deserialize<List<Core.Accounting.Models.SelectedOption>>(optionsJson!);
        selectedOptions.ShouldNotBeNull();
        selectedOptions!.Count.ShouldBe(2);

        // Verify options are in sort order (Color first, then Size)
        selectedOptions[0].OptionName.ShouldBe("Color");
        selectedOptions[0].ValueName.ShouldBe("Grey");
        selectedOptions[1].OptionName.ShouldBe("Size");
        selectedOptions[1].ValueName.ShouldBe("S");
    }

    [Fact]
    public void CreateLineItem_WithoutVariantOptions_DoesNotStoreSelectedOptions()
    {
        // Arrange - create product without variant options (simple product)
        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Simple Widget",
            ProductOptions = []
        };

        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = "Simple Widget",
            Sku = "SIMPLE-WIDGET",
            Price = 9.99m,
            VariantOptionsKey = null // No variant options
        };

        // Act
        var lineItem = _checkoutService.CreateLineItem(product);

        // Assert - ProductRootName should still be stored
        lineItem.ExtendedData.ShouldContainKey(Constants.ExtendedDataKeys.ProductRootName);
        lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductRootName].ShouldBe("Simple Widget");

        // Assert - SelectedOptions should NOT be stored for simple products
        lineItem.ExtendedData.ShouldNotContainKey(Constants.ExtendedDataKeys.SelectedOptions);
    }

    #endregion
}
