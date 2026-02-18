using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core;
using Merchello.Core.Products.Factories;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

[Collection("Integration Tests")]
public class InvoiceEditServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceEditService _invoiceEditService;
    private readonly IDiscountService _discountService;

    public InvoiceEditServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceEditService = fixture.GetService<IInvoiceEditService>();
        _discountService = fixture.GetService<IDiscountService>();
    }

    [Fact]
    public async Task EditInvoiceAsync_PhysicalCustomItemWithoutShippingOption_CreatesNoShippingOrder()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 8m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(order, name: "Existing Item", quantity: 1, amount: 25m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems =
                [
                    new AddCustomItemDto
                    {
                        Name = "Custom Box",
                        Sku = "CUST-BOX",
                        Price = 15m,
                        Cost = 5m,
                        Quantity = 1,
                        TaxGroupId = null,
                        IsPhysicalProduct = true,
                        WarehouseId = warehouse.Id,
                        ShippingOptionId = null
                    }
                ],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderShippingUpdates = [],
                EditReason = "Add custom physical item with no shipping",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var result = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.Data.ShouldNotBeNull();
        result.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .FirstAsync(i => i.Id == invoice.Id);

        persistedInvoice.Orders.ShouldNotBeNull();
        persistedInvoice.Orders.Count.ShouldBe(2);

        var noShippingOrder = persistedInvoice.Orders
            .FirstOrDefault(o => o.WarehouseId == warehouse.Id && o.ShippingOptionId == Guid.Empty);

        noShippingOrder.ShouldNotBeNull();
        noShippingOrder.LineItems.ShouldNotBeNull();
        noShippingOrder.LineItems.Any(li => li.Name == "Custom Box").ShouldBeTrue();

        var editDto = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        editDto.ShouldNotBeNull();
        editDto.Orders.Any(o => o.ShippingMethodName == "No Shipping").ShouldBeTrue();
    }

    [Fact]
    public async Task EditInvoiceAsync_PhysicalCustomItemWithoutShippingOption_DoesNotMergeIntoDynamicShippingOrder()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Dynamic Warehouse", "CA");
        var placeholderShipping = dataBuilder.CreateShippingOption("Placeholder", warehouse, fixedCost: 0m);
        var dynamicOrder = dataBuilder.CreateOrder(invoice, warehouse, placeholderShipping, OrderStatus.Pending);
        dynamicOrder.ShippingOptionId = Guid.Empty;
        dynamicOrder.ShippingProviderKey = "fedex";
        dynamicOrder.ShippingServiceCode = "FEDEX_GROUND";
        dynamicOrder.ShippingServiceName = "FedEx Ground";
        dynamicOrder.ShippingCost = 12m;
        dataBuilder.CreateLineItem(dynamicOrder, name: "Dynamic Item", quantity: 1, amount: 25m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems =
                [
                    new AddCustomItemDto
                    {
                        Name = "No Shipping Custom Item",
                        Sku = "CUST-NOSHIP",
                        Price = 15m,
                        Cost = 5m,
                        Quantity = 1,
                        TaxGroupId = null,
                        IsPhysicalProduct = true,
                        WarehouseId = warehouse.Id,
                        ShippingOptionId = null
                    }
                ],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderDiscountCodes = [],
                OrderShippingUpdates = [],
                EditReason = "Add no-shipping custom item to invoice with dynamic shipping order",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var result = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.Data.ShouldNotBeNull();
        result.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .FirstAsync(i => i.Id == invoice.Id);

        var noShippingOrder = persistedInvoice.Orders!
            .FirstOrDefault(o =>
                o.WarehouseId == warehouse.Id &&
                o.ShippingOptionId == Guid.Empty &&
                string.IsNullOrWhiteSpace(o.ShippingProviderKey) &&
                string.IsNullOrWhiteSpace(o.ShippingServiceCode));

        noShippingOrder.ShouldNotBeNull();
        noShippingOrder.LineItems.ShouldNotBeNull();
        noShippingOrder.LineItems.Any(li => li.Sku == "CUST-NOSHIP").ShouldBeTrue();

        var persistedDynamicOrder = persistedInvoice.Orders!
            .FirstOrDefault(o =>
                o.WarehouseId == warehouse.Id &&
                o.ShippingOptionId == Guid.Empty &&
                string.Equals(o.ShippingProviderKey, "fedex", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(o.ShippingServiceCode, "FEDEX_GROUND", StringComparison.OrdinalIgnoreCase));

        persistedDynamicOrder.ShouldNotBeNull();
        persistedDynamicOrder.LineItems.ShouldNotBeNull();
        persistedDynamicOrder.LineItems.Any(li => li.Sku == "CUST-NOSHIP").ShouldBeFalse();
    }

    [Fact]
    public async Task PreviewInvoiceEditAsync_OrderDiscountCode_WithDuplicateProductSkus_CalculatesDiscount()
    {
        // Arrange
        const string discountCode = "DUPPREV10";
        await CreateActiveCodeDiscountAsync(discountCode, 10m);
        var invoice = await CreateInvoiceWithDuplicateSkuProductsAsync();

        var request = new EditInvoiceDto
        {
            LineItems = [],
            RemovedLineItems = [],
            RemovedOrderDiscounts = [],
            CustomItems = [],
            ProductsToAdd = [],
            OrderDiscounts = [],
            OrderDiscountCodes = [discountCode],
            OrderShippingUpdates = [],
            EditReason = "Preview duplicate SKU discount",
            ShouldRemoveTax = false
        };

        // Act
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(invoice.Id, request);

        // Assert
        result.ShouldNotBeNull();
        result.DiscountTotal.ShouldBe(20m);
    }

    [Fact]
    public async Task EditInvoiceAsync_OrderDiscountCode_WithDuplicateProductSkus_AddsDiscountLineItem()
    {
        // Arrange
        const string discountCode = "DUPEDIT10";
        await CreateActiveCodeDiscountAsync(discountCode, 10m);
        var invoice = await CreateInvoiceWithDuplicateSkuProductsAsync();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderDiscountCodes = [discountCode],
                OrderShippingUpdates = [],
                EditReason = "Apply duplicate SKU discount",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var result = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.Data.ShouldNotBeNull();
        result.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .FirstAsync(i => i.Id == invoice.Id);

        var discountLineItem = (persistedInvoice.Orders ?? [])
            .SelectMany(o => o.LineItems ?? [])
            .FirstOrDefault(li =>
                li.LineItemType == LineItemType.Discount &&
                li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var codeObj) &&
                string.Equals(codeObj?.ToString(), discountCode, StringComparison.OrdinalIgnoreCase));

        discountLineItem.ShouldNotBeNull();
        discountLineItem.Amount.ShouldBe(-20m);
    }

    [Fact]
    public async Task PreviewInvoiceEditAsync_OrderDiscountCode_IncludesDiscountInPreview()
    {
        // Arrange
        const string discountCode = "PHONE10";
        await CreateActiveCodeDiscountAsync(discountCode, 10m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(
            order,
            name: "Existing Item",
            quantity: 1,
            amount: 100m,
            isTaxable: false,
            taxRate: 0m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var request = new EditInvoiceDto
        {
            LineItems = [],
            RemovedLineItems = [],
            RemovedOrderDiscounts = [],
            CustomItems = [],
            ProductsToAdd = [],
            OrderDiscounts = [],
            OrderDiscountCodes = [discountCode],
            OrderShippingUpdates = [],
            EditReason = "Apply phone discount code",
            ShouldRemoveTax = false
        };

        // Act
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(invoice.Id, request);

        // Assert
        result.ShouldNotBeNull();
        result.DiscountTotal.ShouldBe(10m);
        result.AdjustedSubTotal.ShouldBe(90m);
    }

    [Fact]
    public async Task PreviewInvoiceEditAsync_ProductWithMissingRequiredAddon_AddsWarning()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 0m);
        dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard Tax", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Required Addon Product", taxGroup);
        var product = dataBuilder.CreateProduct("Required Addon Product - Default", productRoot, price: 100m);

        var optionFactory = new ProductOptionFactory();
        var requiredAddonOption = optionFactory.CreateEmpty();
        requiredAddonOption.Name = "Frame";
        requiredAddonOption.IsVariant = false;
        requiredAddonOption.IsMultiSelect = false;
        requiredAddonOption.IsRequired = true;

        var requiredAddonValue = optionFactory.CreateEmptyValue();
        requiredAddonValue.Name = "Oak";
        requiredAddonValue.PriceAdjustment = 10m;
        requiredAddonOption.ProductOptionValues = [requiredAddonValue];
        productRoot.ProductOptions = [requiredAddonOption];

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var request = new EditInvoiceDto
        {
            LineItems = [],
            RemovedLineItems = [],
            RemovedOrderDiscounts = [],
            CustomItems = [],
            ProductsToAdd =
            [
                new AddProductToOrderDto
                {
                    ProductId = product.Id,
                    Quantity = 1,
                    WarehouseId = warehouse.Id,
                    ShippingOptionId = shippingOption.Id,
                    Addons = []
                }
            ],
            OrderDiscounts = [],
            OrderDiscountCodes = [],
            OrderShippingUpdates = [],
            EditReason = "Preview missing required add-on",
            ShouldRemoveTax = false
        };

        var result = await _invoiceEditService.PreviewInvoiceEditAsync(invoice.Id, request);

        result.ShouldNotBeNull();
        result.Warnings.ShouldContain(w => w.Contains("required add-on", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task EditInvoiceAsync_OrderDiscountCode_AddsDiscountLineItemWithCodeMetadata()
    {
        // Arrange
        const string discountCode = "PHONE10";
        var discount = await CreateActiveCodeDiscountAsync(discountCode, 10m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(
            order,
            name: "Existing Item",
            quantity: 1,
            amount: 100m,
            isTaxable: false,
            taxRate: 0m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderDiscountCodes = [discountCode],
                OrderShippingUpdates = [],
                EditReason = "Apply phone discount code",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var result = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.Data.ShouldNotBeNull();
        result.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .FirstAsync(i => i.Id == invoice.Id);

        var discountLineItem = (persistedInvoice.Orders ?? [])
            .SelectMany(o => o.LineItems ?? [])
            .FirstOrDefault(li =>
                li.LineItemType == LineItemType.Discount &&
                li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var codeObj) &&
                string.Equals(codeObj?.ToString(), discountCode, StringComparison.OrdinalIgnoreCase));

        discountLineItem.ShouldNotBeNull();
        discountLineItem.Amount.ShouldBe(-10m);

        var discountId = discountLineItem.ExtendedData[Constants.ExtendedDataKeys.DiscountId]?.ToString();
        discountId.ShouldBe(discount.Id.ToString());

        var usage = await db.DiscountUsages
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.InvoiceId == invoice.Id && u.DiscountId == discount.Id);
        usage.ShouldNotBeNull();
        usage.Amount.ShouldBe(10m);
    }

    [Fact]
    public async Task EditInvoiceAsync_CustomItemWithDuplicateSku_LinksAddonsOnlyToCustomParent()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard Tax", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Classic Zip Hoodie", taxGroup);
        var product = dataBuilder.CreateProduct("Classic Zip Hoodie", productRoot, price: 64.99m);
        product.Sku = "CLASSIC-ZIP-HOODIE-BLACK-M";
        dataBuilder.CreateLineItem(
            order,
            product,
            quantity: 1,
            amount: 64.99m,
            isTaxable: true,
            taxRate: 20m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderDiscountCodes = [],
                OrderShippingUpdates = [],
                EditReason = "Add custom item with duplicate SKU and add-ons",
                ShouldRemoveTax = false,
                CustomItems =
                [
                    new AddCustomItemDto
                    {
                        Name = "Custom Hoodie",
                        Sku = "CLASSIC-ZIP-HOODIE-BLACK-M",
                        Price = 64.99m,
                        Cost = 30m,
                        Quantity = 1,
                        TaxGroupId = taxGroup.Id,
                        IsPhysicalProduct = true,
                        WarehouseId = warehouse.Id,
                        ShippingOptionId = shippingOption.Id,
                        Addons =
                        [
                            new CustomItemAddonDto
                            {
                                Key = "Drawers",
                                Value = "Left Side",
                                PriceAdjustment = 30m,
                                CostAdjustment = 12m,
                                SkuSuffix = null
                            },
                            new CustomItemAddonDto
                            {
                                Key = "Something",
                                Value = "Else",
                                PriceAdjustment = 60m,
                                CostAdjustment = 25m,
                                SkuSuffix = null
                            }
                        ]
                    }
                ]
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var editResult = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        editResult.Success.ShouldBeTrue();
        editResult.Data.ShouldNotBeNull();
        editResult.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .Include(i => i.Payments)
            .FirstAsync(i => i.Id == invoice.Id);

        var persistedOrder = persistedInvoice.Orders!.Single();

        var productLineItem = persistedOrder.LineItems!
            .Single(li => li.LineItemType == LineItemType.Product && li.Sku == "CLASSIC-ZIP-HOODIE-BLACK-M");

        var customLineItem = persistedOrder.LineItems!
            .Single(li =>
                li.LineItemType == LineItemType.Custom &&
                li.Name == "Custom Hoodie" &&
                li.Sku == "CLASSIC-ZIP-HOODIE-BLACK-M");

        var addonLineItems = persistedOrder.LineItems!
            .Where(li => li.LineItemType == LineItemType.Addon)
            .ToList();

        addonLineItems.Count.ShouldBe(2);
        addonLineItems.All(addon => addon.GetParentLineItemId() == customLineItem.Id).ShouldBeTrue();
        addonLineItems.All(addon => addon.IsAddonLinkedToParent(customLineItem)).ShouldBeTrue();
        addonLineItems.Any(addon => addon.IsAddonLinkedToParent(productLineItem)).ShouldBeFalse();

        // Also verify order detail mapping (used by order details UI) nests add-ons under the custom parent only.
        var ordersDtoMapper = new OrdersDtoMapper(
            _fixture.GetService<IPaymentService>(),
            _fixture.GetService<ICurrencyService>(),
            _fixture.GetService<ILocalityCatalog>());

        var orderDetailDto = await ordersDtoMapper.MapToDetailAsync(
            persistedInvoice,
            new Dictionary<Guid, string> { [shippingOption.Id] = shippingOption.Name ?? "Ground" },
            new Dictionary<Guid, string?> { [product.Id] = null });

        var mappedOrder = orderDetailDto.Orders.Single();
        var mappedProductLine = mappedOrder.LineItems
            .Single(li => li.LineItemType == nameof(LineItemType.Product) && li.Sku == "CLASSIC-ZIP-HOODIE-BLACK-M");
        var mappedCustomLine = mappedOrder.LineItems
            .Single(li => li.LineItemType == nameof(LineItemType.Custom) && li.Name == "Custom Hoodie");

        mappedProductLine.ChildLineItems.ShouldBeEmpty();
        mappedCustomLine.ChildLineItems.Count.ShouldBe(2);
        mappedCustomLine.ChildLineItems.All(li => li.ParentLineItemId == mappedCustomLine.Id).ShouldBeTrue();
    }

    [Fact]
    public async Task EditInvoiceAsync_ProductAddonName_UsesOptionAndValueInLineItemAndTimelineNote()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(order, name: "Existing Item", quantity: 1, amount: 25m);

        var taxGroup = dataBuilder.CreateTaxGroup("No Tax", 0m);
        var productRoot = dataBuilder.CreateProductRoot("Storage Shed", taxGroup);
        var product = dataBuilder.CreateProduct("5'0\" (150cm) x 6'3\" (190cm) - Platinum", productRoot, price: 120m);

        var optionFactory = new ProductOptionFactory();
        var addonOption = optionFactory.CreateEmpty();
        addonOption.Name = "Choose Storage";
        addonOption.IsVariant = false;
        addonOption.IsMultiSelect = false;
        addonOption.IsRequired = true;

        var addonValue = optionFactory.CreateEmptyValue();
        addonValue.Name = "(C) Conti Drawers";
        addonValue.PriceAdjustment = 15m;
        addonValue.CostAdjustment = 5m;
        addonValue.SkuSuffix = "CDRAW";
        addonOption.ProductOptionValues = [addonValue];
        productRoot.ProductOptions = [addonOption];
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50, trackStock: true);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                ProductsToAdd =
                [
                    new AddProductToOrderDto
                    {
                        ProductId = product.Id,
                        Quantity = 1,
                        WarehouseId = warehouse.Id,
                        ShippingOptionId = shippingOption.Id,
                        Addons =
                        [
                            new OrderAddonDto
                            {
                                OptionId = addonOption.Id,
                                OptionValueId = addonValue.Id,
                                // Simulate current UI payload that only sends value name.
                                Name = addonValue.Name ?? string.Empty,
                                PriceAdjustment = addonValue.PriceAdjustment,
                                CostAdjustment = addonValue.CostAdjustment,
                                SkuSuffix = addonValue.SkuSuffix
                            }
                        ]
                    }
                ],
                OrderDiscounts = [],
                OrderDiscountCodes = [],
                OrderShippingUpdates = [],
                EditReason = "Add product add-on with value-only name",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var result = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue(result.ErrorMessage);
        result.Data.ShouldNotBeNull();
        result.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .FirstAsync(i => i.Id == invoice.Id);

        var addedAddonLineItem = persistedInvoice.Orders!
            .SelectMany(o => o.LineItems ?? [])
            .FirstOrDefault(li => li.LineItemType == LineItemType.Addon && li.Name?.Contains("Conti Drawers", StringComparison.Ordinal) == true);

        addedAddonLineItem.ShouldNotBeNull();
        addedAddonLineItem.Name.ShouldBe("Choose Storage: (C) Conti Drawers");

        var latestEditNote = (persistedInvoice.Notes ?? [])
            .OrderByDescending(n => n.DateCreated)
            .FirstOrDefault(n => n.Description is not null && n.Description.Contains("Invoice Edited", StringComparison.Ordinal));

        latestEditNote.ShouldNotBeNull();
        latestEditNote.Description.ShouldNotBeNull();
        var latestEditNoteDescription = latestEditNote.Description;
        latestEditNoteDescription.ShouldContain("Add-on: Choose Storage: (C) Conti Drawers");
        latestEditNoteDescription.ShouldNotContain("Add-on: (C) Conti Drawers");
    }

    private async Task<Invoice> CreateInvoiceWithDuplicateSkuProductsAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);

        var warehouseA = dataBuilder.CreateWarehouse("Warehouse A", "CA");
        var shippingOptionA = dataBuilder.CreateShippingOption("Ground A", warehouseA, fixedCost: 0m);
        var orderA = dataBuilder.CreateOrder(invoice, warehouseA, shippingOptionA, OrderStatus.Pending);

        var warehouseB = dataBuilder.CreateWarehouse("Warehouse B", "CA");
        var shippingOptionB = dataBuilder.CreateShippingOption("Ground B", warehouseB, fixedCost: 0m);
        var orderB = dataBuilder.CreateOrder(invoice, warehouseB, shippingOptionB, OrderStatus.Pending);

        var taxGroup = dataBuilder.CreateTaxGroup("No Tax", 0m);
        var productRoot = dataBuilder.CreateProductRoot("Duplicate SKU Product", taxGroup);
        var product = dataBuilder.CreateProduct("Duplicate SKU Variant", productRoot, price: 100m);

        dataBuilder.CreateLineItem(orderA, product, quantity: 1, amount: 100m, isTaxable: false, taxRate: 0m);
        dataBuilder.CreateLineItem(orderB, product, quantity: 1, amount: 100m, isTaxable: false, taxRate: 0m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        return invoice;
    }

    private async Task<Discount> CreateActiveCodeDiscountAsync(string code, decimal percentageValue)
    {
        var createResult = await _discountService.CreateAsync(new CreateDiscountParameters
        {
            Name = $"Test {code}",
            Category = DiscountCategory.AmountOffOrder,
            Method = DiscountMethod.Code,
            Code = code,
            ValueType = DiscountValueType.Percentage,
            Value = percentageValue,
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            RequirementType = DiscountRequirementType.None,
            CanCombineWithProductDiscounts = true,
            CanCombineWithOrderDiscounts = true,
            CanCombineWithShippingDiscounts = true,
            Priority = 1000
        });

        createResult.Success.ShouldBeTrue();
        createResult.ResultObject.ShouldNotBeNull();
        return createResult.ResultObject!;
    }
}
