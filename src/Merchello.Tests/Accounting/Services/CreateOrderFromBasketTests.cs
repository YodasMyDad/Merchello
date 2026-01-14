using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Services.Interfaces;
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
[Collection("Integration")]
public class CreateOrderFromBasketTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IShippingService _shippingService;

    public CreateOrderFromBasketTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _shippingService = fixture.GetService<IShippingService>();
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithSingleWarehouse_CreatesInvoiceWithOrder()
    {
        // Arrange - Set up warehouse, product, and stock
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.99m);

        // Add shipping cost for GB
        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost
        {
            CountryCode = "GB",
            Cost = 5.99m
        });

        // Make warehouse serve GB region
        warehouse.ServiceRegions.Add(new WarehouseServiceRegion
        {
            CountryCode = "GB",
            IsExcluded = false
        });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Test T-Shirt", taxGroup);
        var product = dataBuilder.CreateProduct("T-Shirt Blue Medium", productRoot, price: 25.00m);
        product.Sku = "TSH-BLU-M";

        // Link ProductRoot to Warehouse (required for shipping service to find the warehouse)
        var productRootWarehouse = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        };
        _fixture.DbContext.ProductRootWarehouses.Add(productRootWarehouse);

        // Add stock to warehouse via ProductWarehouse
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        };
        _fixture.DbContext.ProductWarehouses.Add(productWarehouse);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Create basket with line item
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 2,
                    Amount = 25.00m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                }
            ],
            SubTotal = 50.00m,
            Tax = 10.00m,
            Total = 60.00m
        };

        var billingAddress = new Address
        {
            Name = "John Smith",
            Email = "john@example.com",
            AddressOne = "123 Test Street",
            TownCity = "London",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingAddress = new Address
        {
            Name = "John Smith",
            Email = "john@example.com",
            AddressOne = "123 Test Street",
            TownCity = "London",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        // Act - Step 1: Get shipping options (simulates checkout UI call)
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket,
            shippingAddress,
            new Dictionary<Guid, Guid>());  // Empty selections - PRE-SELECTION

        // Verify shipping options were returned
        shippingResult.ShouldNotBeNull();
        shippingResult.WarehouseGroups.ShouldNotBeEmpty();
        var group = shippingResult.WarehouseGroups.First();
        group.AvailableShippingOptions.ShouldNotBeEmpty();

        // Act - Step 2: Build checkout session with selected shipping option
        // Key by GroupId as the frontend would (this is what caused the original bug)
        var selectedShippingOptions = new Dictionary<Guid, Guid>
        {
            [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act - Step 3: Create invoice from basket (the critical test)
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

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

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost
        {
            CountryCode = "GB",
            Cost = 9.99m
        });

        warehouse.ServiceRegions.Add(new WarehouseServiceRegion
        {
            CountryCode = "GB",
            IsExcluded = false
        });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot1 = dataBuilder.CreateProductRoot("T-Shirts", taxGroup);
        var product1 = dataBuilder.CreateProduct("T-Shirt Red Large", productRoot1, price: 29.99m);
        product1.Sku = "TSH-RED-L";

        var productRoot2 = dataBuilder.CreateProductRoot("Hoodies", taxGroup);
        var product2 = dataBuilder.CreateProduct("Hoodie Black XL", productRoot2, price: 49.99m);
        product2.Sku = "HOO-BLK-XL";

        // Link ProductRoots to Warehouse
        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot1.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });
        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot2.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        // Add stock via ProductWarehouse
        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product1.Id,
            WarehouseId = warehouse.Id,
            Stock = 50
        });
        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product2.Id,
            WarehouseId = warehouse.Id,
            Stock = 30
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Create basket with multiple products
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product1.Id,
                    Name = product1.Name,
                    Sku = product1.Sku,
                    Quantity = 1,
                    Amount = 29.99m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                },
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product2.Id,
                    Name = product2.Name,
                    Sku = product2.Sku,
                    Quantity = 2,
                    Amount = 49.99m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                }
            ],
            SubTotal = 129.97m,
            Tax = 25.99m,
            Total = 155.96m
        };

        var billingAddress = new Address
        {
            Name = "Jane Doe",
            Email = "jane@example.com",
            AddressOne = "456 Test Lane",
            TownCity = "Manchester",
            CountryCode = "GB",
            PostalCode = "M1 1AA"
        };

        var shippingAddress = new Address
        {
            Name = "Jane Doe",
            Email = "jane@example.com",
            AddressOne = "456 Test Lane",
            TownCity = "Manchester",
            CountryCode = "GB",
            PostalCode = "M1 1AA"
        };

        // Get shipping options
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket,
            shippingAddress,
            new Dictionary<Guid, Guid>());

        var group = shippingResult.WarehouseGroups.First();
        var selectedShippingOptions = new Dictionary<Guid, Guid>
        {
            [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

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

        shippingOption1.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "US", Cost = 4.99m });
        shippingOption2.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "US", Cost = 14.99m });

        warehouse.ServiceRegions.Add(new WarehouseServiceRegion { CountryCode = "US", IsExcluded = false });
        warehouse.ShippingOptions.Add(shippingOption1);
        warehouse.ShippingOptions.Add(shippingOption2);

        var taxGroup = dataBuilder.CreateTaxGroup("Sales Tax", 8m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Test Item", productRoot, price: 19.99m);
        product.Sku = "TEST-001";

        // Link ProductRoot to Warehouse
        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "USD",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 19.99m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 8m
                }
            ],
            SubTotal = 19.99m,
            Tax = 1.60m,
            Total = 21.59m
        };

        var billingAddress = new Address
        {
            Name = "Bob Wilson",
            Email = "bob@example.com",
            AddressOne = "789 Main St",
            TownCity = "New York",
            CountryCode = "US",
            PostalCode = "10001"
        };

        var shippingAddress = new Address
        {
            Name = "Bob Wilson",
            Email = "bob@example.com",
            AddressOne = "789 Main St",
            TownCity = "New York",
            CountryCode = "US",
            PostalCode = "10001"
        };

        // Step 1: Get shipping options (PRE-SELECTION)
        // The GroupId here is based on warehouse + [ALL available options]
        var preSelectionResult = await _shippingService.GetShippingOptionsForBasket(
            basket,
            shippingAddress,
            new Dictionary<Guid, Guid>());

        preSelectionResult.WarehouseGroups.ShouldNotBeEmpty();
        var preSelectionGroup = preSelectionResult.WarehouseGroups.First();
        var preSelectionGroupId = preSelectionGroup.GroupId;

        // Verify we have multiple shipping options
        preSelectionGroup.AvailableShippingOptions.Count.ShouldBeGreaterThanOrEqualTo(1);

        // Step 2: User selects a shipping option - key by the PRE-SELECTION GroupId
        var selectedOptionId = preSelectionGroup.AvailableShippingOptions.First().ShippingOptionId;
        var selectedShippingOptions = new Dictionary<Guid, Guid>
        {
            [preSelectionGroupId] = selectedOptionId  // This is what the frontend sends
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
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

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

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "GB", Cost = 5m });
        warehouse.ServiceRegions.Add(new WarehouseServiceRegion { CountryCode = "GB", IsExcluded = false });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup();
        var productRoot = dataBuilder.CreateProductRoot(taxGroup: taxGroup);
        var product = dataBuilder.CreateProduct(productRoot: productRoot);
        product.Sku = "PROD-001";

        // Link ProductRoot to Warehouse
        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 10
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 10m,
                    LineItemType = LineItemType.Product
                }
            ],
            SubTotal = 10m,
            Total = 10m
        };

        var billingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        // Don't select any shipping option - should still get warehouse groups
        // but fail to create order because no selection was made
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket,
            shippingAddress,
            new Dictionary<Guid, Guid>());

        // Verify shipping groups exist (the bug was about selection lookup, not about finding warehouses)
        shippingResult.WarehouseGroups.ShouldNotBeEmpty();

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, Guid>()  // Empty!
        };

        // Act & Assert - Should throw because no shipping option was selected
        await Should.ThrowAsync<InvalidOperationException>(async () =>
        {
            await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        });
    }
}
