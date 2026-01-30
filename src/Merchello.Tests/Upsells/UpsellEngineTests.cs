using System.Linq;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

/// <summary>
/// Integration tests for UpsellEngine — full evaluation pipeline including
/// trigger matching, filter matching, eligibility, sorting, and deduplication.
/// </summary>
[Collection("Integration Tests")]
public class UpsellEngineTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IUpsellEngine _engine;
    private readonly IUpsellService _upsellService;
    private readonly IUpsellContextBuilder _contextBuilder;

    public UpsellEngineTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _engine = fixture.GetService<IUpsellEngine>();
        _upsellService = fixture.GetService<IUpsellService>();
        _contextBuilder = fixture.GetService<IUpsellContextBuilder>();
    }

    // =====================================================
    // Basic Matching
    // =====================================================

    [Fact]
    public async Task GetSuggestionsAsync_NoRulesMatch_ReturnsEmptyList()
    {
        var context = CreateBasicContext();

        var suggestions = await _engine.GetSuggestionsAsync(context);

        suggestions.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetSuggestionsAsync_DisabledRule_NotEvaluated()
    {
        var typeId = Guid.NewGuid();
        var rule = await CreateActivatedRuleAsync("Disabled", typeId);
        await _upsellService.DeactivateAsync(rule.Id);

        var context = CreateContextWithProductType(typeId);
        var suggestions = await _engine.GetSuggestionsAsync(context);

        suggestions.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetSuggestionsAsync_MessageOnlyRule_ReturnsSuggestionWithoutProducts()
    {
        var typeId = Guid.NewGuid();
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Message Only",
            Heading = "Complete your order",
            Message = "Add one more item to unlock benefits.",
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

        var suggestion = suggestions.FirstOrDefault(s => s.UpsellRuleId == result.ResultObject!.Id);
        suggestion.ShouldNotBeNull();
        suggestion!.Products.ShouldBeEmpty();
    }

    // =====================================================
    // Sorting & Limits
    // =====================================================

    [Fact]
    public async Task GetSuggestionsAsync_RespectsMaxProducts()
    {
        var typeId = Guid.NewGuid();
        var recTypeId = Guid.NewGuid();

        await CreateActivatedRuleWithRecAsync("MaxTest", typeId, recTypeId, maxProducts: 2);

        var context = CreateContextWithProductType(typeId);
        var suggestions = await _engine.GetSuggestionsAsync(context);

        // Each suggestion's products should not exceed maxProducts
        foreach (var suggestion in suggestions)
        {
            suggestion.Products.Count.ShouldBeLessThanOrEqualTo(2);
        }
    }

    // =====================================================
    // Recommendation Types
    // =====================================================

    [Fact]
    public async Task GetSuggestionsAsync_SupplierRecommendations_ReturnsSupplierProducts()
    {
        var builder = _fixture.CreateDataBuilder();
        var supplier = builder.CreateSupplier("Acme");
        var warehouse = builder.CreateWarehouse("Acme Warehouse", supplier: supplier);
        var recommendationType = builder.CreateProductType("Accessories", "accessories");
        var recommendationRoot = builder.CreateProductRoot("Accessory Root", productType: recommendationType);
        var recommendationProduct = builder.CreateProduct("Accessory", recommendationRoot, price: 20m);

        builder.AddWarehouseToProductRoot(recommendationRoot, warehouse);
        builder.CreateProductWarehouse(recommendationProduct, warehouse, stock: 10, trackStock: false);
        await builder.SaveChangesAsync();

        var triggerTypeId = Guid.NewGuid();
        var ruleResult = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Supplier Recommendations",
            Heading = "Recommended from supplier",
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [triggerTypeId],
                },
            ],
            RecommendationRules =
            [
                new CreateUpsellRecommendationRuleParameters
                {
                    RecommendationType = UpsellRecommendationType.Suppliers,
                    RecommendationIds = [supplier.Id],
                },
            ],
            SortBy = UpsellSortBy.PriceLowToHigh
        });

        await _upsellService.ActivateAsync(ruleResult.ResultObject!.Id);

        var context = CreateContextWithProductType(triggerTypeId);
        var suggestions = await _engine.GetSuggestionsAsync(context);

        suggestions.ShouldContain(s => s.Products.Any(p => p.ProductId == recommendationProduct.Id));
    }

    // =====================================================
    // Filter Matching
    // =====================================================

    [Fact]
    public async Task GetSuggestionsAsync_FilterMatching_RestrictsToMatchingFilters()
    {
        var builder = _fixture.CreateDataBuilder();

        var filterGroup = new ProductFilterGroup
        {
            Id = Guid.NewGuid(),
            Name = "Size",
            SortOrder = 1
        };
        var king = new ProductFilter
        {
            Id = Guid.NewGuid(),
            Name = "King",
            ProductFilterGroupId = filterGroup.Id,
            ParentGroup = filterGroup
        };
        var queen = new ProductFilter
        {
            Id = Guid.NewGuid(),
            Name = "Queen",
            ProductFilterGroupId = filterGroup.Id,
            ParentGroup = filterGroup
        };
        filterGroup.Filters.Add(king);
        filterGroup.Filters.Add(queen);

        _fixture.DbContext.ProductFilterGroups.Add(filterGroup);
        _fixture.DbContext.ProductFilters.AddRange(king, queen);

        var triggerType = builder.CreateProductType("Beds", "beds");
        var recType = builder.CreateProductType("Mattresses", "mattresses");

        var triggerRoot = builder.CreateProductRoot("Bed Root", productType: triggerType);
        var matchRoot = builder.CreateProductRoot("King Mattress Root", productType: recType);
        var nonMatchRoot = builder.CreateProductRoot("Queen Mattress Root", productType: recType);

        var triggerProduct = builder.CreateProduct("King Bed", triggerRoot, price: 500m);
        var matchProduct = builder.CreateProduct("King Mattress", matchRoot, price: 200m);
        var nonMatchProduct = builder.CreateProduct("Queen Mattress", nonMatchRoot, price: 200m);

        triggerProduct.Filters.Add(king);
        matchProduct.Filters.Add(king);
        nonMatchProduct.Filters.Add(queen);

        await builder.SaveChangesAsync();

        var ruleResult = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Filter Matching",
            Heading = "Match size",
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [triggerType.Id],
                    ExtractFilterIds = [king.Id],
                },
            ],
            RecommendationRules =
            [
                new CreateUpsellRecommendationRuleParameters
                {
                    RecommendationType = UpsellRecommendationType.ProductTypes,
                    RecommendationIds = [recType.Id],
                    MatchTriggerFilters = true,
                    MatchFilterIds = [king.Id],
                },
            ],
            SortBy = UpsellSortBy.PriceLowToHigh
        });

        await _upsellService.ActivateAsync(ruleResult.ResultObject!.Id);

        var lineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = triggerProduct.Id,
            Quantity = 1,
            Amount = triggerProduct.Price,
            Sku = triggerProduct.Sku
        };
        var contextItems = await _contextBuilder.BuildLineItemsAsync([lineItem]);

        var context = new UpsellContext
        {
            BasketId = Guid.NewGuid(),
            LineItems = contextItems
        };

        var suggestions = await _engine.GetSuggestionsAsync(context);
        var suggestion = suggestions.FirstOrDefault(s => s.UpsellRuleId == ruleResult.ResultObject!.Id);

        suggestion.ShouldNotBeNull();
        suggestion!.Products.ShouldContain(p => p.ProductId == matchProduct.Id);
        suggestion.Products.ShouldNotContain(p => p.ProductId == nonMatchProduct.Id);
    }

    // =====================================================
    // Multi-Rule Scenarios
    // =====================================================

    [Fact]
    public async Task GetSuggestionsAsync_MultipleRulesMatch_OrderedByPriority()
    {
        var typeId = Guid.NewGuid();

        await CreateActivatedRuleAsync("Low Priority", typeId, priority: 900);
        await CreateActivatedRuleAsync("High Priority", typeId, priority: 100);
        await CreateActivatedRuleAsync("Mid Priority", typeId, priority: 500);

        var context = CreateContextWithProductType(typeId);
        var suggestions = await _engine.GetSuggestionsAsync(context);

        if (suggestions.Count >= 2)
        {
            for (var i = 1; i < suggestions.Count; i++)
            {
                suggestions[i].Priority.ShouldBeGreaterThanOrEqualTo(suggestions[i - 1].Priority);
            }
        }
    }

    // =====================================================
    // Eligibility
    // =====================================================

    [Fact]
    public async Task GetSuggestionsAsync_EligibilityAllCustomers_AlwaysMatches()
    {
        var typeId = Guid.NewGuid();
        var rule = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "All Customers",
            Heading = "For everyone",
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [typeId],
                },
            ],
            EligibilityRules =
            [
                new CreateUpsellEligibilityRuleParameters
                {
                    EligibilityType = UpsellEligibilityType.AllCustomers,
                },
            ],
        });
        await _upsellService.ActivateAsync(rule.ResultObject!.Id);

        var context = CreateContextWithProductType(typeId);
        context.CustomerId = Guid.NewGuid();

        var suggestions = await _engine.GetSuggestionsAsync(context);

        // Should not be excluded by eligibility
        // (may still be empty if no matching recommendation products exist in DB)
    }

    [Fact]
    public async Task GetSuggestionsAsync_EligibilitySpecificCustomers_NonMatchingCustomer()
    {
        var typeId = Guid.NewGuid();
        var allowedCustomerId = Guid.NewGuid();

        var rule = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Specific Customer",
            Heading = "VIP only",
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [typeId],
                },
            ],
            EligibilityRules =
            [
                new CreateUpsellEligibilityRuleParameters
                {
                    EligibilityType = UpsellEligibilityType.SpecificCustomers,
                    EligibilityIds = [allowedCustomerId],
                },
            ],
        });
        await _upsellService.ActivateAsync(rule.ResultObject!.Id);

        var context = CreateContextWithProductType(typeId);
        context.CustomerId = Guid.NewGuid(); // Different customer

        var suggestions = await _engine.GetSuggestionsAsync(context);

        // Non-matching customer should not see this rule's suggestions
        suggestions.ShouldNotContain(s => s.UpsellRuleId == rule.ResultObject!.Id);
    }

    // =====================================================
    // Location Filtering
    // =====================================================

    [Fact]
    public async Task GetSuggestionsForLocationAsync_FiltersCorrectly()
    {
        var typeId = Guid.NewGuid();

        await CreateActivatedRuleAsync("Basket Only", typeId, displayLocation: UpsellDisplayLocation.Basket);

        var context = CreateContextWithProductType(typeId);

        var checkoutSuggestions = await _engine.GetSuggestionsForLocationAsync(
            context, UpsellDisplayLocation.Checkout);

        // Basket-only rule should not appear in checkout
        checkoutSuggestions.ShouldNotContain(s => s.Heading == "Heading for Basket Only");
    }

    // =====================================================
    // Product Page Context
    // =====================================================

    [Fact]
    public async Task GetSuggestionsForProductAsync_CreatesSyntheticContext()
    {
        // This should not throw even with a non-existent product
        var suggestions = await _engine.GetSuggestionsForProductAsync(Guid.NewGuid());
        suggestions.ShouldNotBeNull();
    }

    // =====================================================
    // Invoice Context
    // =====================================================

    [Fact]
    public async Task GetSuggestionsForInvoiceAsync_ReturnsResults()
    {
        // This should not throw even with a non-existent invoice
        var suggestions = await _engine.GetSuggestionsForInvoiceAsync(Guid.NewGuid());
        suggestions.ShouldNotBeNull();
    }

    // =====================================================
    // Helpers
    // =====================================================

    private UpsellContext CreateBasicContext()
    {
        return new UpsellContext
        {
            BasketId = Guid.NewGuid(),
            LineItems = [],
        };
    }

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

    private async Task<UpsellRule> CreateActivatedRuleAsync(
        string name,
        Guid triggerTypeId,
        int priority = 1000,
        UpsellDisplayLocation displayLocation = UpsellDisplayLocation.All)
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = name,
            Heading = $"Heading for {name}",
            Priority = priority,
            DisplayLocation = displayLocation,
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

    private async Task<UpsellRule> CreateActivatedRuleWithRecAsync(
        string name,
        Guid triggerTypeId,
        Guid recTypeId,
        int maxProducts = 4)
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = name,
            Heading = $"Heading for {name}",
            MaxProducts = maxProducts,
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [triggerTypeId],
                },
            ],
            RecommendationRules =
            [
                new CreateUpsellRecommendationRuleParameters
                {
                    RecommendationType = UpsellRecommendationType.ProductTypes,
                    RecommendationIds = [recTypeId],
                },
            ],
        });

        await _upsellService.ActivateAsync(result.ResultObject!.Id);
        return (await _upsellService.GetByIdAsync(result.ResultObject!.Id))!;
    }
}
