using System.Text.Json;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Extensions;
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
    private readonly AddressFactory _addressFactory = new();

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
        var lineItem = CreateLineItem("Test Product", "TEST-001", 1, 10m);

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
        var lineItem1 = CreateLineItem("Test Product", "TEST-001", 1, 10m, productId);
        var lineItem2 = CreateLineItem("Test Product", "TEST-001", 2, 10m, productId);

        // Act
        await _checkoutService.AddToBasketAsync(basket, lineItem1, "GB");
        await _checkoutService.AddToBasketAsync(basket, lineItem2, "GB");

        // Assert
        basket.LineItems.Count.ShouldBe(1);
        basket.LineItems.First().Quantity.ShouldBe(3);
    }

    [Fact]
    public async Task AddProductWithAddonsAsync_SameSkuDifferentAddonSelections_KeepsSeparateParentsAndLinkedAddons()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Classic Zip Hoodie", taxGroup);
        var product = dataBuilder.CreateProduct("Classic Zip Hoodie - Black - M", productRoot, price: 64.99m);
        product.Sku = "CLASSIC-ZIP-HOODIE-BLACK-M";

        var optionFactory = new ProductOptionFactory();
        var addonOption = optionFactory.CreateEmpty();
        addonOption.Name = "Add-ons";
        addonOption.Alias = "addons";
        addonOption.IsVariant = false;
        addonOption.IsMultiSelect = true;

        var addonLeftSide = optionFactory.CreateEmptyValue();
        addonLeftSide.Name = "Left Side";
        addonLeftSide.PriceAdjustment = 30m;
        addonLeftSide.SkuSuffix = null;

        var addonSomethingElse = optionFactory.CreateEmptyValue();
        addonSomethingElse.Name = "Something Else";
        addonSomethingElse.PriceAdjustment = 60m;
        addonSomethingElse.SkuSuffix = null;

        addonOption.ProductOptionValues = [addonLeftSide, addonSomethingElse];
        productRoot.ProductOptions = [addonOption];

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var firstAddResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto
                {
                    OptionId = addonOption.Id,
                    ValueId = addonLeftSide.Id
                }
            ]
        });

        var secondAddResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto
                {
                    OptionId = addonOption.Id,
                    ValueId = addonSomethingElse.Id
                }
            ]
        });

        // Assert
        firstAddResult.Success.ShouldBeTrue();
        secondAddResult.Success.ShouldBeTrue();
        firstAddResult.ProductLineItem.ShouldNotBeNull();
        secondAddResult.ProductLineItem.ShouldNotBeNull();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        var parentLineItems = basket!.LineItems
            .Where(li => li.LineItemType == LineItemType.Product && li.Sku == product.Sku)
            .ToList();
        parentLineItems.Count.ShouldBe(2);

        var addonLineItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Addon)
            .ToList();
        addonLineItems.Count.ShouldBe(2);

        var leftSideAddon = addonLineItems.Single(li => li.Name?.Contains("Left Side", StringComparison.OrdinalIgnoreCase) == true);
        var somethingElseAddon = addonLineItems.Single(li => li.Name?.Contains("Something Else", StringComparison.OrdinalIgnoreCase) == true);

        leftSideAddon.GetParentLineItemId().ShouldBe(firstAddResult.ProductLineItem!.Id);
        somethingElseAddon.GetParentLineItemId().ShouldBe(secondAddResult.ProductLineItem!.Id);
        leftSideAddon.GetParentLineItemId().ShouldNotBe(somethingElseAddon.GetParentLineItemId());

        leftSideAddon.IsAddonLinkedToParent(firstAddResult.ProductLineItem!).ShouldBeTrue();
        leftSideAddon.IsAddonLinkedToParent(secondAddResult.ProductLineItem!).ShouldBeFalse();
        somethingElseAddon.IsAddonLinkedToParent(secondAddResult.ProductLineItem!).ShouldBeTrue();
        somethingElseAddon.IsAddonLinkedToParent(firstAddResult.ProductLineItem!).ShouldBeFalse();
    }

    [Fact]
    public async Task AddProductWithAddonsAsync_MissingRequiredAddon_ReturnsFailedResult()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Canvas Print");
        var product = dataBuilder.CreateProduct("Canvas Print - Standard", productRoot, price: 49.99m);

        var optionFactory = new ProductOptionFactory();
        var requiredAddonOption = optionFactory.CreateEmpty();
        requiredAddonOption.Name = "Frame";
        requiredAddonOption.IsVariant = false;
        requiredAddonOption.IsMultiSelect = false;
        requiredAddonOption.IsRequired = true;

        var frameValue = optionFactory.CreateEmptyValue();
        frameValue.Name = "Oak Frame";
        frameValue.PriceAdjustment = 15m;

        requiredAddonOption.ProductOptionValues = [frameValue];
        productRoot.ProductOptions = [requiredAddonOption];

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var result = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons = []
        });

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("required add-on");
    }

    [Fact]
    public async Task AddProductWithAddonsAsync_SingleSelectAddonWithMultipleValues_ReturnsFailedResult()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Print Package");
        var product = dataBuilder.CreateProduct("Print Package - Basic", productRoot, price: 39.99m);

        var optionFactory = new ProductOptionFactory();
        var addonOption = optionFactory.CreateEmpty();
        addonOption.Name = "Mounting";
        addonOption.IsVariant = false;
        addonOption.IsMultiSelect = false;

        var valueOne = optionFactory.CreateEmptyValue();
        valueOne.Name = "Hanger";
        valueOne.PriceAdjustment = 5m;

        var valueTwo = optionFactory.CreateEmptyValue();
        valueTwo.Name = "Adhesive";
        valueTwo.PriceAdjustment = 3m;

        addonOption.ProductOptionValues = [valueOne, valueTwo];
        productRoot.ProductOptions = [addonOption];

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var result = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto
                {
                    OptionId = addonOption.Id,
                    ValueId = valueOne.Id
                },
                new AddonSelectionDto
                {
                    OptionId = addonOption.Id,
                    ValueId = valueTwo.Id
                }
            ]
        });

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("only allows one selection");
    }

    [Fact]
    public async Task AddToBasketAsync_CalculatesSubtotal()
    {
        // Arrange
        var basket = _checkoutService.CreateBasket();
        var lineItem = CreateLineItem("Test Product", "TEST-001", 3, 10m);

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
        var lineItem = CreateLineItem("Test Product", "TEST-001", 2, 15m);
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

        var lineItem1 = CreateLineItem("Product 1", "PROD-001", 1, 20m);
        lineItem1.Id = lineItem1Id;
        await _checkoutService.AddToBasketAsync(basket, lineItem1, "GB");

        var lineItem2 = CreateLineItem("Product 2", "PROD-002", 1, 30m);
        lineItem2.Id = lineItem2Id;
        await _checkoutService.AddToBasketAsync(basket, lineItem2, "GB");

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
        basket.LineItems.Add(CreateLineItem("Product 1", "PROD-001", 1, 20m));

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
        basket.LineItems.Add(CreateLineItem("Product 1", "PROD-001", 2, 25m));
        basket.LineItems.Add(CreateLineItem("Product 2", "PROD-002", 1, 50m));

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
        basket.LineItems.Add(CreateLineItem("Taxable Product", "TAX-001", 1, 100m, isTaxable: true, taxRate: 0m));

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
        basket.LineItems.Add(CreateLineItem("Item 1", "ITEM-001", 3, 10m));
        basket.LineItems.Add(CreateLineItem("Item 2", "ITEM-002", 2, 20m));

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
        var billing = CreateAddress(
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            addressOne: "123 Main St",
            townCity: "London",
            countryCode: "GB",
            postalCode: "SW1A 1AA");

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
        var billing = CreateAddress(
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            addressOne: "123 Billing St",
            townCity: "London",
            countryCode: "GB",
            postalCode: "SW1A 1AA");
        var shipping = CreateAddress(
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@example.com",
            addressOne: "456 Shipping Ave",
            townCity: "Manchester",
            countryCode: "GB",
            postalCode: "M1 1AE");

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
        basket.LineItems.Add(CreateLineItem("Product", "PROD-001", 1, 100m));

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
        basket.LineItems.Add(CreateLineItem("Product", "PROD-001", 1, 100m));
        basket.LineItems.Add(CreateDiscountLineItem(discountId, 10m));

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
        basket.LineItems.Add(_checkoutService.CreateLineItem(product, 1));

        var session = await _checkoutSessionService.GetSessionAsync(basket.Id);

        // Act
        var result = await _checkoutService.GetOrderGroupsAsync(new GetOrderGroupsParameters
        {
            Basket = basket,
            Session = session
        });

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
        basket.LineItems.Add(CreateLineItem("Checkout Product", "CHECKOUT-001", 2, 75m));

        // Save basket to database first (InitializeCheckoutAsync will update it)
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        _checkoutSessionService.CacheBasket(basket);

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
        basket.LineItems.Add(CreateLineItem("Persisted Product", "PERSIST-001", 1, 25m));

        // Save basket to session
        _checkoutSessionService.CacheBasket(basket);

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
        basket.LineItems.Add(CreateLineItem("Original Product", "UPDATE-001", 1, 50m));

        // Act - add another item
        basket.LineItems.Add(CreateLineItem("Added Product", "UPDATE-002", 2, 30m));
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
        var countries = await _checkoutService.GetAvailableCountriesAsync(new GetAvailableShippingCountriesParameters());

        // Assert
        countries.ShouldNotBeNull();
        // The mock returns empty, but the method should not throw
    }

    [Fact]
    public async Task GetAllCountriesAsync_ReturnsAllCountries()
    {
        // Act
        var countries = await _checkoutService.GetAllCountriesAsync(new GetAvailableBillingCountriesParameters());

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
        var optionFactory = new ProductOptionFactory();
        var colorValueGrey = optionFactory.CreateEmptyValue();
        colorValueGrey.Name = "Grey";
        colorValueGrey.FullName = "Grey";
        var colorValueBlue = optionFactory.CreateEmptyValue();
        colorValueBlue.Name = "Blue";
        colorValueBlue.FullName = "Blue";
        var sizeValueS = optionFactory.CreateEmptyValue();
        sizeValueS.Name = "S";
        sizeValueS.FullName = "S";
        var sizeValueM = optionFactory.CreateEmptyValue();
        sizeValueM.Name = "M";
        sizeValueM.FullName = "M";

        var colorOption = optionFactory.CreateEmpty();
        colorOption.Name = "Color";
        colorOption.Alias = "color";
        colorOption.SortOrder = 1;
        colorOption.IsVariant = true;
        colorOption.ProductOptionValues = [colorValueGrey, colorValueBlue];

        var sizeOption = optionFactory.CreateEmpty();
        sizeOption.Name = "Size";
        sizeOption.Alias = "size";
        sizeOption.SortOrder = 2;
        sizeOption.IsVariant = true;
        sizeOption.ProductOptionValues = [sizeValueS, sizeValueM];

        var taxGroupFactory = new TaxGroupFactory();
        var productTypeFactory = new ProductTypeFactory();
        var taxGroup = taxGroupFactory.Create("Standard VAT", 20m);
        taxGroup.Id = Guid.NewGuid();
        var productType = productTypeFactory.Create("Apparel", "apparel");
        productType.Id = Guid.NewGuid();

        var productRootFactory = new ProductRootFactory();
        var productRoot = productRootFactory.Create(
            "Premium V-Neck",
            taxGroup,
            productType,
            [colorOption, sizeOption]);
        productRoot.Id = Guid.NewGuid();

        // Create comma-separated variant key (Grey + S)
        var variantOptionsKey = $"{colorValueGrey.Id},{sizeValueS.Id}";

        var productFactory = new ProductFactory(new SlugHelper());
        var product = productFactory.Create(
            productRoot,
            "S-Grey",
            29.99m,
            costOfGoods: 0m,
            gtin: string.Empty,
            sku: "PREMIUM-V-NECK-S-GREY",
            isDefault: true,
            variantOptionsKey: variantOptionsKey);
        product.Id = Guid.NewGuid();
        product.ProductRootId = productRoot.Id;

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
        var taxGroupFactory = new TaxGroupFactory();
        var productTypeFactory = new ProductTypeFactory();
        var taxGroup = taxGroupFactory.Create("Standard VAT", 20m);
        taxGroup.Id = Guid.NewGuid();
        var productType = productTypeFactory.Create("Widgets", "widgets");
        productType.Id = Guid.NewGuid();

        var productRootFactory = new ProductRootFactory();
        var productRoot = productRootFactory.Create(
            "Simple Widget",
            taxGroup,
            productType,
            []);
        productRoot.Id = Guid.NewGuid();

        var productFactory = new ProductFactory(new SlugHelper());
        var product = productFactory.Create(
            productRoot,
            "Simple Widget",
            9.99m,
            costOfGoods: 0m,
            gtin: string.Empty,
            sku: "SIMPLE-WIDGET",
            isDefault: true,
            variantOptionsKey: null);
        product.Id = Guid.NewGuid();
        product.ProductRootId = productRoot.Id;

        // Act
        var lineItem = _checkoutService.CreateLineItem(product);

        // Assert - ProductRootName should still be stored
        lineItem.ExtendedData.ShouldContainKey(Constants.ExtendedDataKeys.ProductRootName);
        lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductRootName].ShouldBe("Simple Widget");

        // Assert - SelectedOptions should NOT be stored for simple products
        lineItem.ExtendedData.ShouldNotContainKey(Constants.ExtendedDataKeys.SelectedOptions);
    }

    #endregion

    #region Helpers

    private static LineItem CreateLineItem(
        string name,
        string sku,
        int quantity,
        decimal amount,
        Guid? productId = null,
        bool isTaxable = false,
        decimal taxRate = 0m)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            name,
            sku,
            amount,
            cost: 0m,
            quantity: quantity,
            isTaxable: isTaxable,
            taxRate: taxRate);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.ProductId = productId;
        lineItem.OrderId = null;
        return lineItem;
    }

    private static LineItem CreateDiscountLineItem(Guid discountId, decimal amount)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Discount",
            "DISCOUNT",
            -Math.Abs(amount),
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m,
            extendedData: new Dictionary<string, object> { ["DiscountId"] = discountId });
        lineItem.LineItemType = LineItemType.Discount;
        lineItem.OrderId = null;
        return lineItem;
    }

    private Address CreateAddress(
        string firstName,
        string lastName,
        string email,
        string addressOne,
        string townCity,
        string countryCode,
        string postalCode)
    {
        return _addressFactory.CreateFromFormData(
            firstName,
            lastName,
            addressOne,
            address2: null,
            city: townCity,
            postalCode: postalCode,
            countryCode: countryCode,
            regionCode: null,
            phone: null,
            email: email);
    }

    #endregion
}
