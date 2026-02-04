using Merchello.Core;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

/// <summary>
/// Integration tests for Package Protection features: DefaultChecked (pre-checked OrderBump)
/// and AutoAddToBasket (automatic basket insertion with removal tracking).
/// </summary>
[Collection("Integration Tests")]
public class UpsellPackageProtectionTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IUpsellService _upsellService;
    private readonly IUpsellEngine _engine;
    private readonly ILineItemService _lineItemService;
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutSessionService _checkoutSessionService;
    private readonly LineItemFactory _lineItemFactory;
    private readonly BasketFactory _basketFactory = new();
    private readonly ProductFactory _productFactory = new(new SlugHelper());
    private readonly ProductRootFactory _productRootFactory = new();
    private readonly ProductTypeFactory _productTypeFactory = new();
    private readonly TaxGroupFactory _taxGroupFactory = new();

    public UpsellPackageProtectionTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _upsellService = fixture.GetService<IUpsellService>();
        _engine = fixture.GetService<IUpsellEngine>();
        _lineItemService = fixture.GetService<ILineItemService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _checkoutSessionService = fixture.GetService<ICheckoutSessionService>();
        _lineItemFactory = new LineItemFactory(fixture.GetService<ICurrencyService>());
    }

    // =====================================================
    // DefaultChecked — CRUD & Engine Propagation
    // =====================================================

    [Fact]
    public async Task CreateAsync_WithDefaultChecked_PersistsValue()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Protection Plan",
            Heading = "Protect your order",
            CheckoutMode = CheckoutUpsellMode.OrderBump,
            DefaultChecked = true,
        });

        result.Successful.ShouldBeTrue();
        result.ResultObject!.DefaultChecked.ShouldBeTrue();
        result.ResultObject.CheckoutMode.ShouldBe(CheckoutUpsellMode.OrderBump);
    }

    [Fact]
    public async Task CreateAsync_DefaultCheckedFalseByDefault()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Normal Upsell",
            Heading = "You might like",
        });

        result.Successful.ShouldBeTrue();
        result.ResultObject!.DefaultChecked.ShouldBeFalse();
    }

    [Fact]
    public async Task UpdateAsync_ToggleDefaultChecked_UpdatesValue()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Toggle Test",
            Heading = "Test",
            DefaultChecked = false,
        });

        await _upsellService.UpdateAsync(result.ResultObject!.Id, new UpdateUpsellParameters
        {
            DefaultChecked = true,
        });

        var updated = await _upsellService.GetByIdAsync(result.ResultObject!.Id);
        updated!.DefaultChecked.ShouldBeTrue();
    }

    [Fact]
    public async Task Engine_DefaultChecked_PropagatedToSuggestion()
    {
        var typeId = Guid.NewGuid();
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "DefaultChecked Engine Test",
            Heading = "Protect your order",
            CheckoutMode = CheckoutUpsellMode.OrderBump,
            DefaultChecked = true,
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [typeId],
                },
            ],
        });
        await _upsellService.ActivateAsync(result.ResultObject!.Id);

        var context = CreateContextWithProductType(typeId);
        var suggestions = await _engine.GetSuggestionsAsync(context);

        var suggestion = suggestions.ShouldHaveSingleItem();
        suggestion.DefaultChecked.ShouldBeTrue();
        suggestion.CheckoutMode.ShouldBe(CheckoutUpsellMode.OrderBump);
    }

    [Fact]
    public async Task Engine_DefaultCheckedFalse_PropagatedToSuggestion()
    {
        var typeId = Guid.NewGuid();
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Non-DefaultChecked Engine Test",
            Heading = "You might like",
            DefaultChecked = false,
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [typeId],
                },
            ],
        });
        await _upsellService.ActivateAsync(result.ResultObject!.Id);

        var context = CreateContextWithProductType(typeId);
        var suggestions = await _engine.GetSuggestionsAsync(context);

        var suggestion = suggestions.ShouldHaveSingleItem();
        suggestion.DefaultChecked.ShouldBeFalse();
    }

    // =====================================================
    // AutoAddToBasket — CRUD
    // =====================================================

    [Fact]
    public async Task CreateAsync_WithAutoAddToBasket_PersistsValue()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Auto-Add Protection",
            Heading = "Package Protection",
            AutoAddToBasket = true,
        });

        result.Successful.ShouldBeTrue();
        result.ResultObject!.AutoAddToBasket.ShouldBeTrue();
    }

    [Fact]
    public async Task CreateAsync_AutoAddToBasketFalseByDefault()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Normal Upsell",
            Heading = "You might like",
        });

        result.Successful.ShouldBeTrue();
        result.ResultObject!.AutoAddToBasket.ShouldBeFalse();
    }

    [Fact]
    public async Task UpdateAsync_ToggleAutoAddToBasket_UpdatesValue()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Toggle Auto-Add Test",
            Heading = "Test",
            AutoAddToBasket = false,
        });

        await _upsellService.UpdateAsync(result.ResultObject!.Id, new UpdateUpsellParameters
        {
            AutoAddToBasket = true,
        });

        var updated = await _upsellService.GetByIdAsync(result.ResultObject!.Id);
        updated!.AutoAddToBasket.ShouldBeTrue();
    }

    [Fact]
    public async Task CreateAsync_WithBothFlags_PersistsBoth()
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Both Flags",
            Heading = "Complete protection",
            CheckoutMode = CheckoutUpsellMode.OrderBump,
            DefaultChecked = true,
            AutoAddToBasket = true,
        });

        result.Successful.ShouldBeTrue();
        result.ResultObject!.DefaultChecked.ShouldBeTrue();
        result.ResultObject.AutoAddToBasket.ShouldBeTrue();
    }

    // =====================================================
    // AutoAddUpsellHandler — Direct Handler Tests
    // =====================================================

    [Fact]
    public async Task AutoAddHandler_NoAutoAddRules_DoesNotModifyBasket()
    {
        // Create a non-auto-add rule
        var typeId = Guid.NewGuid();
        await CreateActivatedRuleAsync("Normal Rule", typeId, autoAdd: false);

        var handler = CreateAutoAddHandler();
        var basket = CreateBasketWithProductType(typeId);
        var notification = CreateBasketItemAddedNotification(basket);

        await handler.HandleAsync(notification, CancellationToken.None);

        // Only the original item should be in the basket
        basket.LineItems.Count.ShouldBe(1);
    }

    [Fact]
    public async Task AutoAddHandler_MatchingAutoAddRule_AddsProductToBasket()
    {
        // Create real DB products for both trigger and recommendation
        var builder = _fixture.CreateDataBuilder();
        var supplier = builder.CreateSupplier("Test Supplier");
        var warehouse = builder.CreateWarehouse("Test Warehouse", supplier: supplier);

        // Trigger product (the product already in the basket)
        var triggerType = builder.CreateProductType("Fragile Goods", "fragile-goods");
        var triggerRoot = builder.CreateProductRoot("Glass Vase", productType: triggerType);
        var triggerProduct = builder.CreateProduct("Glass Vase - Large", triggerRoot, price: 49.99m);
        builder.AddWarehouseToProductRoot(triggerRoot, warehouse);
        builder.CreateProductWarehouse(triggerProduct, warehouse, stock: 100, trackStock: false);

        // Recommendation product (the protection plan to auto-add)
        var recType = builder.CreateProductType("Protection", "protection");
        var recRoot = builder.CreateProductRoot("Protection Plan", productType: recType);
        var recProduct = builder.CreateProduct("Basic Protection", recRoot, price: 2.99m);
        builder.AddWarehouseToProductRoot(recRoot, warehouse);
        builder.CreateProductWarehouse(recProduct, warehouse, stock: 100, trackStock: false);

        await builder.SaveChangesAsync();

        // Create auto-add rule: trigger on triggerType, recommend recType
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Auto Protection",
            Heading = "Package Protection",
            AutoAddToBasket = true,
            SuppressIfInCart = true,
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [triggerType.Id],
                },
            ],
            RecommendationRules =
            [
                new CreateUpsellRecommendationRuleParameters
                {
                    RecommendationType = UpsellRecommendationType.ProductTypes,
                    RecommendationIds = [recType.Id],
                },
            ],
        });
        await _upsellService.ActivateAsync(result.ResultObject!.Id);

        // Verify pipeline steps individually before running handler
        var contextBuilder = _fixture.GetService<IUpsellContextBuilder>();
        var triggerLineItem = _lineItemFactory.CreateFromProduct(triggerProduct, 1);
        var contextItems = await contextBuilder.BuildLineItemsAsync([triggerLineItem]);
        contextItems.Count.ShouldBe(1, "Context builder should resolve the trigger product");
        contextItems[0].ProductTypeId.ShouldBe(triggerType.Id, "Context should have correct ProductTypeId");

        // Verify the rule is active in the DB
        var activeRules = await _upsellService.GetActiveUpsellRulesAsync();
        activeRules.Count.ShouldBeGreaterThan(0, "Should have active rules after activation");
        var ourRule = activeRules.FirstOrDefault(r => r.Id == result.ResultObject!.Id);
        ourRule.ShouldNotBeNull($"Our rule {result.ResultObject!.Id} should be in active rules. Found: [{string.Join(", ", activeRules.Select(r => $"{r.Id}:{r.Status}"))}]");
        ourRule!.TriggerRules.Count.ShouldBeGreaterThan(0, "Rule should have trigger rules");

        var context = new UpsellContext
        {
            BasketId = Guid.NewGuid(),
            LineItems = contextItems,
        };
        var suggestions = await _engine.GetSuggestionsAsync(context);
        suggestions.Count.ShouldBeGreaterThan(0, $"Engine should return suggestions. Rule: {ourRule.Name}, Status: {ourRule.Status}, TriggerCount: {ourRule.TriggerRules.Count}, RecCount: {ourRule.RecommendationRules.Count}");
        var autoSuggestion = suggestions.FirstOrDefault(s => s.UpsellRuleId == result.ResultObject!.Id);
        autoSuggestion.ShouldNotBeNull($"Engine should return a suggestion for rule {result.ResultObject!.Id}");
        autoSuggestion!.Products.Count.ShouldBeGreaterThan(0, "Suggestion should contain recommended products");

        // Now run the actual handler
        var basket = _basketFactory.Create(null, "GBP", "GBP");
        basket.LineItems = [triggerLineItem];

        var handler = CreateAutoAddHandler();
        var notification = new BasketItemAddedNotification(
            basket, basket.LineItems.First(),
            triggerProduct,
            1);

        await handler.HandleAsync(notification, CancellationToken.None);

        // Should have the original item + auto-added protection
        basket.LineItems.Count.ShouldBe(2);
        var autoAdded = basket.LineItems.FirstOrDefault(li =>
            li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.AutoAddedByUpsellRule));
        autoAdded.ShouldNotBeNull();
        autoAdded!.ExtendedData[Constants.ExtendedDataKeys.AutoAddedByUpsellRule]
            .ToString().ShouldBe(result.ResultObject!.Id.ToString());
    }

    [Fact]
    public async Task AutoAddHandler_ProductAlreadyInBasket_DoesNotDuplicate()
    {
        // Create real DB products for trigger and recommendation
        var builder = _fixture.CreateDataBuilder();
        var supplier = builder.CreateSupplier("Test Supplier 2");
        var warehouse = builder.CreateWarehouse("Test Warehouse 2", supplier: supplier);

        var triggerType = builder.CreateProductType("Fragile2", "fragile2");
        var triggerRoot = builder.CreateProductRoot("Glass Bowl", productType: triggerType);
        var triggerProduct = builder.CreateProduct("Glass Bowl - Medium", triggerRoot, price: 29.99m);
        builder.AddWarehouseToProductRoot(triggerRoot, warehouse);
        builder.CreateProductWarehouse(triggerProduct, warehouse, stock: 100, trackStock: false);

        var recType = builder.CreateProductType("Protection2", "protection2");
        var recRoot = builder.CreateProductRoot("Protection Plan 2", productType: recType);
        var recProduct = builder.CreateProduct("Basic Protection 2", recRoot, price: 3.99m);
        builder.AddWarehouseToProductRoot(recRoot, warehouse);
        builder.CreateProductWarehouse(recProduct, warehouse, stock: 100, trackStock: false);

        await builder.SaveChangesAsync();

        // Create auto-add rule
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "No Dup Protection",
            Heading = "Package Protection",
            AutoAddToBasket = true,
            SuppressIfInCart = true,
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [triggerType.Id],
                },
            ],
            RecommendationRules =
            [
                new CreateUpsellRecommendationRuleParameters
                {
                    RecommendationType = UpsellRecommendationType.ProductTypes,
                    RecommendationIds = [recType.Id],
                },
            ],
        });
        await _upsellService.ActivateAsync(result.ResultObject!.Id);

        // Create basket with trigger product AND the protection product already in it
        var basket = _basketFactory.Create(null, "GBP", "GBP");
        basket.LineItems =
        [
            _lineItemFactory.CreateFromProduct(triggerProduct, 1),
            _lineItemFactory.CreateFromProduct(recProduct, 1)
        ];

        var handler = CreateAutoAddHandler();
        var notification = new BasketItemAddedNotification(
            basket, basket.LineItems.First(),
            triggerProduct,
            1);

        await handler.HandleAsync(notification, CancellationToken.None);

        // Should NOT add another protection product (2 items total: trigger + existing protection)
        basket.LineItems.Count.ShouldBe(2);
    }

    [Fact]
    public async Task AutoAddHandler_UpsellsDisabled_DoesNotModifyBasket()
    {
        var typeId = Guid.NewGuid();
        await CreateActivatedRuleAsync("Disabled System Rule", typeId, autoAdd: true);

        // Create handler with disabled upsell settings
        var handler = CreateAutoAddHandler(enabled: false);
        var basket = CreateBasketWithProductType(typeId);
        var notification = CreateBasketItemAddedNotification(basket);

        await handler.HandleAsync(notification, CancellationToken.None);

        basket.LineItems.Count.ShouldBe(1);
    }

    [Fact]
    public async Task AutoAddHandler_RemovedAutoAdd_DoesNotReAdd()
    {
        // Create real DB products for trigger and recommendation
        var builder = _fixture.CreateDataBuilder();
        var supplier = builder.CreateSupplier("Test Supplier 3");
        var warehouse = builder.CreateWarehouse("Test Warehouse 3", supplier: supplier);

        var triggerType = builder.CreateProductType("Fragile3", "fragile3");
        var triggerRoot = builder.CreateProductRoot("Glass Plate", productType: triggerType);
        var triggerProduct = builder.CreateProduct("Glass Plate - Small", triggerRoot, price: 19.99m);
        builder.AddWarehouseToProductRoot(triggerRoot, warehouse);
        builder.CreateProductWarehouse(triggerProduct, warehouse, stock: 100, trackStock: false);

        var recType = builder.CreateProductType("Protection3", "protection3");
        var recRoot = builder.CreateProductRoot("Protection Plan 3", productType: recType);
        var recProduct = builder.CreateProduct("Basic Protection 3", recRoot, price: 1.99m);
        builder.AddWarehouseToProductRoot(recRoot, warehouse);
        builder.CreateProductWarehouse(recProduct, warehouse, stock: 100, trackStock: false);

        await builder.SaveChangesAsync();

        // Create auto-add rule
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Suppressed Protection",
            Heading = "Package Protection",
            AutoAddToBasket = true,
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [triggerType.Id],
                },
            ],
            RecommendationRules =
            [
                new CreateUpsellRecommendationRuleParameters
                {
                    RecommendationType = UpsellRecommendationType.ProductTypes,
                    RecommendationIds = [recType.Id],
                },
            ],
        });
        await _upsellService.ActivateAsync(result.ResultObject!.Id);

        // Build basket with real trigger product
        var basket = _basketFactory.Create(null, "GBP", "GBP");
        basket.LineItems =
        [
            _lineItemFactory.CreateFromProduct(triggerProduct, 1)
        ];

        // Pre-populate session with a removal record for the recommendation product
        await _checkoutSessionService.TrackRemovedAutoAddAsync(
            basket.Id,
            new RemovedAutoAddRecord
            {
                UpsellRuleId = result.ResultObject!.Id,
                ProductId = recProduct.Id,
            });

        var handler = CreateAutoAddHandler();
        var notification = new BasketItemAddedNotification(
            basket, basket.LineItems.First(),
            triggerProduct,
            1);

        await handler.HandleAsync(notification, CancellationToken.None);

        // Should NOT re-add the protection product
        basket.LineItems.Count.ShouldBe(1);
    }

    [Fact]
    public async Task AutoAddHandler_GracefulFailure_DoesNotThrow()
    {
        // Pass a null-basket scenario shouldn't throw — handler is wrapped in try/catch
        var handler = CreateAutoAddHandler();

        // Create a basket with no line items (engine returns early)
        var basket = _basketFactory.Create(null, "GBP", "GBP");
        var lineItem = LineItemFactory.CreateCustomLineItem(
            orderId: Guid.Empty,
            name: "Test",
            sku: "TEST",
            amount: 10m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m);
        lineItem.LineItemType = LineItemType.Product;
        var product = CreateProductStub(Guid.NewGuid(), "Test Product");
        var notification = new BasketItemAddedNotification(basket, lineItem, product, 1);

        // Should not throw
        await handler.HandleAsync(notification, CancellationToken.None);
    }

    // =====================================================
    // AutoAddRemovalTracker — Direct Handler Tests
    // =====================================================

    [Fact]
    public async Task RemovalTracker_AutoAddedItem_RecordsRemoval()
    {
        var ruleId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var basket = CreateBasket();

        var lineItem = CreateProductLineItem(
            productId: productId,
            name: "Protection Plan",
            sku: "PROT-001",
            amount: 2.99m,
            quantity: 1,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.AutoAddedByUpsellRule] = ruleId.ToString(),
            });

        var tracker = CreateRemovalTracker();
        var notification = new BasketItemRemovedNotification(basket, lineItem);

        await tracker.HandleAsync(notification, CancellationToken.None);

        // Verify the session records the removal
        var session = await _checkoutSessionService.GetSessionAsync(basket.Id);
        session.RemovedAutoAddUpsells.Count.ShouldBe(1);
        session.RemovedAutoAddUpsells[0].UpsellRuleId.ShouldBe(ruleId);
        session.RemovedAutoAddUpsells[0].ProductId.ShouldBe(productId);
    }

    [Fact]
    public async Task RemovalTracker_NonAutoAddedItem_DoesNotTrack()
    {
        var basket = CreateBasket();

        var lineItem = CreateProductLineItem(
            productId: Guid.NewGuid(),
            name: "Regular Product",
            sku: "REG-001",
            amount: 49.99m,
            quantity: 1);

        var tracker = CreateRemovalTracker();
        var notification = new BasketItemRemovedNotification(basket, lineItem);

        await tracker.HandleAsync(notification, CancellationToken.None);

        var session = await _checkoutSessionService.GetSessionAsync(basket.Id);
        session.RemovedAutoAddUpsells.ShouldBeEmpty();
    }

    [Fact]
    public async Task RemovalTracker_ItemWithoutProductId_DoesNotTrack()
    {
        var basket = CreateBasket();

        var lineItem = LineItemFactory.CreateCustomLineItem(
            orderId: Guid.Empty,
            name: "Custom Line Item",
            sku: "CUSTOM-001",
            amount: 5m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.AutoAddedByUpsellRule] = Guid.NewGuid().ToString(),
            });
        lineItem.LineItemType = LineItemType.Custom;

        var tracker = CreateRemovalTracker();
        var notification = new BasketItemRemovedNotification(basket, lineItem);

        await tracker.HandleAsync(notification, CancellationToken.None);

        var session = await _checkoutSessionService.GetSessionAsync(basket.Id);
        session.RemovedAutoAddUpsells.ShouldBeEmpty();
    }

    [Fact]
    public async Task RemovalTracker_DuplicateRemoval_DoesNotDuplicate()
    {
        var ruleId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var basket = CreateBasket();

        var lineItem = CreateProductLineItem(
            productId: productId,
            name: "Protection Plan",
            sku: "PROT-001",
            amount: 2.99m,
            quantity: 1,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.AutoAddedByUpsellRule] = ruleId.ToString(),
            });

        var tracker = CreateRemovalTracker();
        var notification = new BasketItemRemovedNotification(basket, lineItem);

        // Track removal twice
        await tracker.HandleAsync(notification, CancellationToken.None);
        await tracker.HandleAsync(notification, CancellationToken.None);

        var session = await _checkoutSessionService.GetSessionAsync(basket.Id);
        session.RemovedAutoAddUpsells.Count.ShouldBe(1);
    }

    // =====================================================
    // CheckoutSession — TrackRemovedAutoAdd
    // =====================================================

    [Fact]
    public async Task TrackRemovedAutoAdd_PersistsToSession()
    {
        var basketId = Guid.NewGuid();
        var record = new RemovedAutoAddRecord
        {
            UpsellRuleId = Guid.NewGuid(),
            ProductId = Guid.NewGuid(),
        };

        await _checkoutSessionService.TrackRemovedAutoAddAsync(basketId, record);

        var session = await _checkoutSessionService.GetSessionAsync(basketId);
        session.RemovedAutoAddUpsells.Count.ShouldBe(1);
        session.RemovedAutoAddUpsells[0].UpsellRuleId.ShouldBe(record.UpsellRuleId);
        session.RemovedAutoAddUpsells[0].ProductId.ShouldBe(record.ProductId);
    }

    [Fact]
    public async Task TrackRemovedAutoAdd_MultipleRecords_AllPersisted()
    {
        var basketId = Guid.NewGuid();
        var record1 = new RemovedAutoAddRecord { UpsellRuleId = Guid.NewGuid(), ProductId = Guid.NewGuid() };
        var record2 = new RemovedAutoAddRecord { UpsellRuleId = Guid.NewGuid(), ProductId = Guid.NewGuid() };

        await _checkoutSessionService.TrackRemovedAutoAddAsync(basketId, record1);
        await _checkoutSessionService.TrackRemovedAutoAddAsync(basketId, record2);

        var session = await _checkoutSessionService.GetSessionAsync(basketId);
        session.RemovedAutoAddUpsells.Count.ShouldBe(2);
    }

    [Fact]
    public async Task TrackRemovedAutoAdd_DuplicateRecord_NotDuplicated()
    {
        var basketId = Guid.NewGuid();
        var record = new RemovedAutoAddRecord
        {
            UpsellRuleId = Guid.NewGuid(),
            ProductId = Guid.NewGuid(),
        };

        await _checkoutSessionService.TrackRemovedAutoAddAsync(basketId, record);
        await _checkoutSessionService.TrackRemovedAutoAddAsync(basketId, record);

        var session = await _checkoutSessionService.GetSessionAsync(basketId);
        session.RemovedAutoAddUpsells.Count.ShouldBe(1);
    }

    // =====================================================
    // Helpers
    // =====================================================

    private UpsellContext CreateContextWithProductType(Guid productTypeId)
    {
        return new UpsellContext
        {
            BasketId = Guid.NewGuid(),
            LineItems =
            [
                new UpsellContextLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    ProductId = Guid.NewGuid(),
                    ProductRootId = Guid.NewGuid(),
                    ProductTypeId = productTypeId,
                    Sku = "TEST-001",
                    Quantity = 1,
                    UnitPrice = 100m,
                },
            ],
        };
    }

    private Basket CreateBasketWithProductType(Guid productTypeId)
    {
        var productId = Guid.NewGuid();
        var basket = CreateBasket();
        var lineItem = CreateProductLineItem(
            productId: productId,
            name: "Trigger Product",
            sku: "TRIG-001",
            amount: 100m,
            quantity: 1,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.ProductTypeId] = productTypeId.ToString(),
            });
        basket.LineItems = [lineItem];
        return basket;
    }

    private BasketItemAddedNotification CreateBasketItemAddedNotification(Basket basket)
    {
        var lineItem = basket.LineItems.First();
        var product = CreateProductStub(lineItem.ProductId ?? Guid.NewGuid(), lineItem.Name ?? "Test Product");
        return new BasketItemAddedNotification(basket, lineItem, product, lineItem.Quantity);
    }

    private Basket CreateBasket(string currencyCode = "GBP")
    {
        var basket = _basketFactory.Create(null, currencyCode, currencyCode);
        basket.LineItems = [];
        return basket;
    }

    private LineItem CreateProductLineItem(
        Guid? productId,
        string name,
        string sku,
        decimal amount,
        int quantity,
        Dictionary<string, object>? extendedData = null)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            orderId: Guid.Empty,
            name: name,
            sku: sku,
            amount: amount,
            cost: 0m,
            quantity: quantity,
            isTaxable: false,
            taxRate: 0m,
            extendedData: extendedData);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.ProductId = productId;
        return lineItem;
    }

    private Product CreateProductStub(Guid id, string name)
    {
        var taxGroup = _taxGroupFactory.Create("Stub Tax", 0m);
        taxGroup.Id = Guid.NewGuid();
        var productType = _productTypeFactory.Create("Stub Type", "stub-type");
        var productRoot = _productRootFactory.Create("Stub Root", taxGroup, productType, []);
        var product = _productFactory.Create(
            productRoot,
            name,
            price: 0m,
            costOfGoods: 0m,
            gtin: string.Empty,
            sku: $"SKU-{Guid.NewGuid():N}"[..12],
            isDefault: true);

        product.Id = id;
        product.ProductRootId = productRoot.Id;
        product.ProductRoot = productRoot;
        return product;
    }

    private async Task<UpsellRule> CreateActivatedRuleAsync(
        string name,
        Guid triggerTypeId,
        bool autoAdd = false)
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = name,
            Heading = $"Heading for {name}",
            AutoAddToBasket = autoAdd,
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [triggerTypeId],
                },
            ],
        });

        await _upsellService.ActivateAsync(result.ResultObject!.Id);
        return (await _upsellService.GetByIdAsync(result.ResultObject!.Id))!;
    }

    private AutoAddUpsellHandler CreateAutoAddHandler(bool enabled = true)
    {
        var settings = Options.Create(new UpsellSettings { Enabled = enabled });
        return new AutoAddUpsellHandler(
            _engine,
            _upsellService,
            _fixture.GetService<IUpsellContextBuilder>(),
            _lineItemService,
            _fixture.GetService<LineItemFactory>(),
            _checkoutService,
            _checkoutSessionService,
            settings,
            _fixture.GetService<ILogger<AutoAddUpsellHandler>>());
    }

    private AutoAddRemovalTracker CreateRemovalTracker()
    {
        return new AutoAddRemovalTracker(
            _checkoutSessionService,
            _fixture.GetService<ILogger<AutoAddRemovalTracker>>());
    }
}
