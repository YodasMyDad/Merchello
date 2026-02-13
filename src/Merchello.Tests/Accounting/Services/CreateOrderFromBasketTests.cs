using Merchello.Core;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

/// <summary>
/// Integration tests for the full basket-to-invoice checkout flow.
/// These tests exercise CreateOrderFromBasketAsync through the complete pipeline:
/// basket → shipping options → checkout session → invoice creation.
///
/// This flow was previously untested and a bug was discovered where GroupId mismatches
/// between shipping option calculation and invoice creation caused order creation to fail.
/// </summary>
[Collection("Integration Tests")]
public class CreateOrderFromBasketTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IShippingService _shippingService;
    private readonly ICheckoutService _checkoutService;

    public CreateOrderFromBasketTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _shippingService = fixture.GetService<IShippingService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithSingleWarehouse_CreatesInvoiceWithOrder()
    {
        // Arrange - Set up warehouse, product, and stock
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.99m);

        // Add shipping cost for GB
        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "GB",
                Cost = 5.99m
            }
        ]);

        // Make warehouse serve GB region
        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion
        {
            CountryCode = "GB",
            IsExcluded = false
        });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Test T-Shirt", taxGroup);
        var product = dataBuilder.CreateProduct("T-Shirt Blue Medium", productRoot, price: 25.00m);
        product.Sku = "TSH-BLU-M";

        // Link ProductRoot to Warehouse (required for shipping service to find the warehouse)
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);

        // Add stock to warehouse via ProductWarehouse
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Create basket with line item via service/factory pipeline
        var basket = await CreateBasketAsync("GB", "GBP", (product, 2));
        var billingAddress = CreateAddress("GB", "john@example.com");
        var shippingAddress = CreateAddress("GB", "john@example.com");

        // Act - Step 1: Get shipping options (simulates checkout UI call)
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });  // Empty selections - PRE-SELECTION

        // Verify shipping options were returned
        shippingResult.ShouldNotBeNull();
        shippingResult.WarehouseGroups.ShouldNotBeEmpty();
        var group = shippingResult.WarehouseGroups.First();
        group.AvailableShippingOptions.ShouldNotBeEmpty();

        // Act - Step 2: Build checkout session with selected shipping option
        // Key by GroupId as the frontend would (this is what caused the original bug)
        var selectedOption = group.AvailableShippingOptions.First();
        var selectedShippingOptions = new Dictionary<Guid, string>
        {
            [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act - Step 3: Create invoice from basket (the critical test)
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.ShouldNotBeNull();
        invoice.InvoiceNumber.ShouldNotBeNullOrEmpty();
        invoice.BasketId.ShouldBe(basket.Id); // Verify BasketId is set for duplicate invoice prevention
        invoice.Orders.ShouldNotBeNull();
        invoice.Orders.Count.ShouldBe(1);

        var order = invoice.Orders.First();
        order.WarehouseId.ShouldBe(warehouse.Id);
        order.ShippingOptionId.ShouldBe(shippingOption.Id);
        order.LineItems.ShouldNotBeNull();
        order.LineItems.Count.ShouldBeGreaterThan(0);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithMultipleProducts_CreatesInvoiceWithCorrectLineItems()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Express Delivery", warehouse, fixedCost: 9.99m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "GB",
                Cost = 9.99m
            }
        ]);

        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion
        {
            CountryCode = "GB",
            IsExcluded = false
        });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot1 = dataBuilder.CreateProductRoot("T-Shirts", taxGroup);
        var product1 = dataBuilder.CreateProduct("T-Shirt Red Large", productRoot1, price: 29.99m);
        product1.Sku = "TSH-RED-L";

        var productRoot2 = dataBuilder.CreateProductRoot("Hoodies", taxGroup);
        var product2 = dataBuilder.CreateProduct("Hoodie Black XL", productRoot2, price: 49.99m);
        product2.Sku = "HOO-BLK-XL";

        // Link ProductRoots to Warehouse
        dataBuilder.AddWarehouseToProductRoot(productRoot1, warehouse);
        dataBuilder.AddWarehouseToProductRoot(productRoot2, warehouse);

        // Add stock via ProductWarehouse
        dataBuilder.CreateProductWarehouse(product1, warehouse, stock: 50);
        dataBuilder.CreateProductWarehouse(product2, warehouse, stock: 30);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Create basket with multiple products via service/factory pipeline
        var basket = await CreateBasketAsync("GB", "GBP", (product1, 1), (product2, 2));
        var billingAddress = CreateAddress("GB", "jane@example.com");
        var shippingAddress = CreateAddress("GB", "jane@example.com");

        // Get shipping options
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var selectedShippingOptions = new Dictionary<Guid, string>
        {
            [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.ShouldNotBeNull();
        invoice.Orders.ShouldNotBeNull();
        invoice.Orders.Count.ShouldBe(1);

        var order = invoice.Orders.First();
        order.LineItems.ShouldNotBeNull();

        // Should have both products as line items
        var productLineItems = order.LineItems.Where(li => li.LineItemType == LineItemType.Product).ToList();
        productLineItems.Count.ShouldBe(2);
        productLineItems.ShouldContain(li => li.Sku == "TSH-RED-L");
        productLineItems.ShouldContain(li => li.Sku == "HOO-BLK-XL");
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_GroupIdChangesAfterSelection_StillCreatesOrder()
    {
        // Arrange - This test specifically validates the bug fix where GroupId changes
        // between PRE-SELECTION (all options) and POST-SELECTION (selected option only)
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Test Warehouse", "US");
        var shippingOption1 = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 4.99m);
        var shippingOption2 = dataBuilder.CreateShippingOption("Express", warehouse, fixedCost: 14.99m);

        shippingOption1.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost { ShippingOptionId = shippingOption1.Id, CountryCode = "US", Cost = 4.99m }
        ]);
        shippingOption2.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost { ShippingOptionId = shippingOption2.Id, CountryCode = "US", Cost = 14.99m }
        ]);

        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion { CountryCode = "US", IsExcluded = false });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption1);
        warehouse.ShippingOptions.Add(shippingOption2);

        var taxGroup = dataBuilder.CreateTaxGroup("Sales Tax", 8m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Test Item", productRoot, price: 19.99m);
        product.Sku = "TEST-001";

        // Link ProductRoot to Warehouse
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);

        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("US", "USD", (product, 1));
        var billingAddress = CreateAddress("US", "bob@example.com");
        var shippingAddress = CreateAddress("US", "bob@example.com");

        // Step 1: Get shipping options (PRE-SELECTION)
        // The GroupId here is based on warehouse + [ALL available options]
        var preSelectionResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        preSelectionResult.WarehouseGroups.ShouldNotBeEmpty();
        var preSelectionGroup = preSelectionResult.WarehouseGroups.First();
        var preSelectionGroupId = preSelectionGroup.GroupId;

        // Verify we have multiple shipping options
        preSelectionGroup.AvailableShippingOptions.Count.ShouldBeGreaterThanOrEqualTo(1);

        // Step 2: User selects a shipping option - key by the PRE-SELECTION GroupId
        var selectedOptionId = preSelectionGroup.AvailableShippingOptions.First().ShippingOptionId;
        var selectedShippingOptions = new Dictionary<Guid, string>
        {
            [preSelectionGroupId] = SelectionKeyExtensions.ForShippingOption(selectedOptionId)  // This is what the frontend sends
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act - This is where the bug manifested: CreateOrderFromBasketAsync calls
        // GetShippingOptionsForBasket again, which now returns POST-SELECTION groups
        // with DIFFERENT GroupIds (based on just the selected option)
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert - The fix ensures this works even though GroupIds changed
        invoice.ShouldNotBeNull();
        invoice.Orders.ShouldNotBeNull();
        invoice.Orders.Count.ShouldBe(1);

        var order = invoice.Orders.First();
        order.ShippingOptionId.ShouldBe(selectedOptionId);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithoutShippingSelection_ThrowsException()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost { ShippingOptionId = shippingOption.Id, CountryCode = "GB", Cost = 5m }
        ]);
        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion { CountryCode = "GB", IsExcluded = false });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup();
        var productRoot = dataBuilder.CreateProductRoot(taxGroup: taxGroup);
        var product = dataBuilder.CreateProduct(productRoot: productRoot);
        product.Sku = "PROD-001";

        // Link ProductRoot to Warehouse
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);

        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", "GBP", (product, 1));
        var billingAddress = CreateAddress("GB", "test@example.com");
        var shippingAddress = CreateAddress("GB", "test@example.com");

        // Don't select any shipping option - should still get warehouse groups
        // but fail to create order because no selection was made
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Verify shipping groups exist (the bug was about selection lookup, not about finding warehouses)
        shippingResult.WarehouseGroups.ShouldNotBeEmpty();

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = []  // Empty!
        };

        // Act & Assert - Should fail because no shipping option was selected
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_DuplicateParentSkus_PreservesAddonParentLineItemIds()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 12m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "CA",
                Cost = 12m
            }
        ]);

        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion { CountryCode = "CA", IsExcluded = false });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard Tax", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Classic Zip Hoodie", taxGroup);
        var product = dataBuilder.CreateProduct("Classic Zip Hoodie", productRoot, price: 64.99m);
        product.Sku = "CLASSIC-ZIP-HOODIE-BLACK-M";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = _checkoutService.CreateBasket("CAD");

        var firstParentLineItem = _checkoutService.CreateLineItem(product, 1);
        firstParentLineItem.ExtendedData[Constants.ExtendedDataKeys.AddonSelectionSignature] = "addons:left-side";
        await _checkoutService.AddToBasketAsync(basket, firstParentLineItem, "CA");

        var firstAddonLineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Drawers: Left Side",
            $"{product.Sku}-ADDON-1",
            30m,
            cost: 0m,
            quantity: 1,
            isTaxable: true,
            taxRate: 20m,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.ParentLineItemId] = firstParentLineItem.Id.ToString(),
                [Constants.ExtendedDataKeys.IsAddon] = true
            });
        firstAddonLineItem.LineItemType = LineItemType.Addon;
        firstAddonLineItem.DependantLineItemSku = product.Sku;
        await _checkoutService.AddToBasketAsync(basket, firstAddonLineItem, "CA");

        var secondParentLineItem = _checkoutService.CreateLineItem(product, 1);
        secondParentLineItem.ExtendedData[Constants.ExtendedDataKeys.AddonSelectionSignature] = "addons:something-else";
        await _checkoutService.AddToBasketAsync(basket, secondParentLineItem, "CA");

        var secondAddonLineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Something: Else",
            $"{product.Sku}-ADDON-2",
            60m,
            cost: 0m,
            quantity: 1,
            isTaxable: true,
            taxRate: 20m,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.ParentLineItemId] = secondParentLineItem.Id.ToString(),
                [Constants.ExtendedDataKeys.IsAddon] = true
            });
        secondAddonLineItem.LineItemType = LineItemType.Addon;
        secondAddonLineItem.DependantLineItemSku = product.Sku;
        await _checkoutService.AddToBasketAsync(basket, secondAddonLineItem, "CA");

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "CA"
        });

        var billingAddress = CreateAddress("CA", "customer@example.com");
        var shippingAddress = CreateAddress("CA", "customer@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();

        var order = result.ResultObject!.Orders!.Single();
        var orderParentLineItems = order.LineItems!
            .Where(li => li.LineItemType == LineItemType.Product && li.Sku == product.Sku)
            .ToList();
        orderParentLineItems.Count.ShouldBe(2);

        var orderAddonLineItems = order.LineItems!
            .Where(li => li.LineItemType == LineItemType.Addon)
            .ToList();
        orderAddonLineItems.Count.ShouldBe(2);

        orderAddonLineItems.All(li => li.GetParentLineItemId().HasValue).ShouldBeTrue();

        var distinctParentIds = orderAddonLineItems
            .Select(li => li.GetParentLineItemId())
            .Distinct()
            .ToList();
        distinctParentIds.Count.ShouldBe(2);

        foreach (var addonLineItem in orderAddonLineItems)
        {
            var linkedParentId = addonLineItem.GetParentLineItemId();
            orderParentLineItems.Any(parentLineItem => parentLineItem.Id == linkedParentId).ShouldBeTrue();
        }
    }

    private async Task<Basket> CreateBasketAsync(
        string countryCode,
        string currencyCode,
        params (Product Product, int Quantity)[] items)
    {
        var basket = _checkoutService.CreateBasket(currencyCode);

        foreach (var (product, quantity) in items)
        {
            var lineItem = _checkoutService.CreateLineItem(product, quantity);
            await _checkoutService.AddToBasketAsync(basket, lineItem, countryCode);
        }

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode
        });

        return basket;
    }

    private Address CreateAddress(string countryCode, string email)
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(email: email, countryCode: countryCode);
    }
}
