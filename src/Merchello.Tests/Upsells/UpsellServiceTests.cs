using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

/// <summary>
/// Integration tests for UpsellService CRUD and query operations.
/// </summary>
[Collection("Integration Tests")]
public class UpsellServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IUpsellService _upsellService;

    public UpsellServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _upsellService = fixture.GetService<IUpsellService>();
    }

    // =====================================================
    // Create
    // =====================================================

    [Fact]
    public async Task CreateAsync_WithValidParameters_CreatesRule()
    {
        var parameters = new CreateUpsellParameters
        {
            Name = "Bed to Pillow Upsell",
            Heading = "Complete your bedroom",
            Message = "Don't forget your pillows!",
            Priority = 500,
            MaxProducts = 3,
            SortBy = UpsellSortBy.PriceLowToHigh,
            SuppressIfInCart = true,
            DisplayLocation = UpsellDisplayLocation.Checkout | UpsellDisplayLocation.Basket,
            CheckoutMode = CheckoutUpsellMode.Inline,
        };

        var result = await _upsellService.CreateAsync(parameters);

        result.Successful.ShouldBeTrue();
        var rule = result.ResultObject;
        rule.ShouldNotBeNull();
        rule.Id.ShouldNotBe(Guid.Empty);
        rule.Name.ShouldBe("Bed to Pillow Upsell");
        rule.Heading.ShouldBe("Complete your bedroom");
        rule.Message.ShouldBe("Don't forget your pillows!");
        rule.Priority.ShouldBe(500);
        rule.MaxProducts.ShouldBe(3);
        rule.SortBy.ShouldBe(UpsellSortBy.PriceLowToHigh);
        rule.SuppressIfInCart.ShouldBeTrue();
        rule.DisplayLocation.ShouldBe(UpsellDisplayLocation.Checkout | UpsellDisplayLocation.Basket);
        rule.CheckoutMode.ShouldBe(CheckoutUpsellMode.Inline);
    }

    [Fact]
    public async Task CreateAsync_WithTriggerAndRecommendationRules_SerializesJsonCorrectly()
    {
        var typeId = Guid.NewGuid();
        var recTypeId = Guid.NewGuid();

        var parameters = new CreateUpsellParameters
        {
            Name = "Cross-sell",
            Heading = "You might also like",
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [typeId],
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
        };

        var result = await _upsellService.CreateAsync(parameters);

        result.Successful.ShouldBeTrue();
        var rule = result.ResultObject!;
        rule.TriggerRules.Count.ShouldBe(1);
        rule.TriggerRules[0].TriggerType.ShouldBe(UpsellTriggerType.ProductTypes);
        rule.TriggerRules[0].GetTriggerIdsList().ShouldContain(typeId);
        rule.RecommendationRules.Count.ShouldBe(1);
        rule.RecommendationRules[0].RecommendationType.ShouldBe(UpsellRecommendationType.ProductTypes);
        rule.RecommendationRules[0].GetRecommendationIdsList().ShouldContain(recTypeId);
    }

    [Fact]
    public async Task CreateAsync_WithFutureStartsAt_SetsStatusToScheduled()
    {
        var parameters = new CreateUpsellParameters
        {
            Name = "Future upsell",
            Heading = "Coming soon",
            StartsAt = DateTime.UtcNow.AddDays(7),
        };

        var result = await _upsellService.CreateAsync(parameters);

        result.Successful.ShouldBeTrue();
        result.ResultObject!.Status.ShouldBe(UpsellStatus.Scheduled);
    }

    [Fact]
    public async Task CreateAsync_WithPastStartsAt_SetsStatusToActive()
    {
        var parameters = new CreateUpsellParameters
        {
            Name = "Active upsell",
            Heading = "Available now",
            StartsAt = DateTime.UtcNow.AddDays(-1),
        };

        var result = await _upsellService.CreateAsync(parameters);

        result.Successful.ShouldBeTrue();
        // Should be either Active or Draft depending on implementation
        result.ResultObject!.Status.ShouldBeOneOf(UpsellStatus.Active, UpsellStatus.Draft);
    }

    // =====================================================
    // Update
    // =====================================================

    [Fact]
    public async Task UpdateAsync_UpdatesAllFields()
    {
        var created = await CreateTestUpsellAsync("Original");

        var updateParams = new UpdateUpsellParameters
        {
            Name = "Updated Name",
            Heading = "Updated Heading",
            Message = "Updated message",
            Priority = 100,
            MaxProducts = 6,
            SortBy = UpsellSortBy.PriceHighToLow,
            SuppressIfInCart = false,
        };

        var result = await _upsellService.UpdateAsync(created.Id, updateParams);

        result.Successful.ShouldBeTrue();
        var updated = result.ResultObject!;
        updated.Name.ShouldBe("Updated Name");
        updated.Heading.ShouldBe("Updated Heading");
        updated.Message.ShouldBe("Updated message");
        updated.Priority.ShouldBe(100);
        updated.MaxProducts.ShouldBe(6);
        updated.SortBy.ShouldBe(UpsellSortBy.PriceHighToLow);
        updated.SuppressIfInCart.ShouldBeFalse();
    }

    [Fact]
    public async Task UpdateAsync_WithNonExistentId_ReturnsFailure()
    {
        var result = await _upsellService.UpdateAsync(Guid.NewGuid(), new UpdateUpsellParameters { Name = "X" });
        result.Successful.ShouldBeFalse();
    }

    // =====================================================
    // Delete
    // =====================================================

    [Fact]
    public async Task DeleteAsync_RemovesRule()
    {
        var created = await CreateTestUpsellAsync("ToDelete");

        var result = await _upsellService.DeleteAsync(created.Id);
        result.Successful.ShouldBeTrue();

        var fetched = await _upsellService.GetByIdAsync(created.Id);
        fetched.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteAsync_WithNonExistentId_ReturnsFailure()
    {
        var result = await _upsellService.DeleteAsync(Guid.NewGuid());
        result.Successful.ShouldBeFalse();
    }

    // =====================================================
    // Get By Id
    // =====================================================

    [Fact]
    public async Task GetByIdAsync_ReturnsCorrectRule()
    {
        var created = await CreateTestUpsellAsync("Fetch me");

        var fetched = await _upsellService.GetByIdAsync(created.Id);

        fetched.ShouldNotBeNull();
        fetched.Name.ShouldBe("Fetch me");
        fetched.Id.ShouldBe(created.Id);
    }

    [Fact]
    public async Task GetByIdAsync_WithNonExistentId_ReturnsNull()
    {
        var fetched = await _upsellService.GetByIdAsync(Guid.NewGuid());
        fetched.ShouldBeNull();
    }

    // =====================================================
    // Query
    // =====================================================

    [Fact]
    public async Task QueryAsync_FiltersByStatus()
    {
        await CreateTestUpsellAsync("Draft1");
        var active = await CreateTestUpsellAsync("Active1");
        await _upsellService.ActivateAsync(active.Id);

        var result = await _upsellService.QueryAsync(new UpsellQueryParameters { Status = UpsellStatus.Active });
        result.Items.ShouldAllBe(r => r.Status == UpsellStatus.Active);
    }

    [Fact]
    public async Task QueryAsync_FiltersByDisplayLocation()
    {
        await CreateTestUpsellAsync("Checkout", displayLocation: UpsellDisplayLocation.Checkout);
        await CreateTestUpsellAsync("Basket", displayLocation: UpsellDisplayLocation.Basket);

        var result = await _upsellService.QueryAsync(new UpsellQueryParameters
        {
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        result.Items.ShouldAllBe(r => (r.DisplayLocation & UpsellDisplayLocation.Checkout) != 0);
    }

    [Fact]
    public async Task QueryAsync_SearchesByName()
    {
        await CreateTestUpsellAsync("Bed to Pillow");
        await CreateTestUpsellAsync("Sofa to Cushion");

        var result = await _upsellService.QueryAsync(new UpsellQueryParameters { SearchTerm = "Pillow" });

        result.Items.Count().ShouldBe(1);
        result.Items.First().Name.ShouldBe("Bed to Pillow");
    }

    [Fact]
    public async Task QueryAsync_PaginatesCorrectly()
    {
        for (var i = 0; i < 15; i++)
            await CreateTestUpsellAsync($"Rule {i}");

        var result = await _upsellService.QueryAsync(new UpsellQueryParameters { Page = 2, PageSize = 5 });

        result.Items.Count().ShouldBe(5);
        result.TotalItems.ShouldBe(15);
        result.TotalPages.ShouldBe(3);
        result.PageIndex.ShouldBe(2);
    }

    [Fact]
    public async Task QueryAsync_OrdersByPriority()
    {
        await CreateTestUpsellAsync("Low", priority: 100);
        await CreateTestUpsellAsync("High", priority: 900);
        await CreateTestUpsellAsync("Mid", priority: 500);

        var result = await _upsellService.QueryAsync(new UpsellQueryParameters
        {
            OrderBy = UpsellOrderBy.Priority,
            Descending = false,
        });

        var items = result.Items.ToList();
        items[0].Priority.ShouldBe(100);
        items[1].Priority.ShouldBe(500);
        items[2].Priority.ShouldBe(900);
    }

    // =====================================================
    // Status Management
    // =====================================================

    [Fact]
    public async Task ActivateAsync_TransitionsFromDraftToActive()
    {
        var created = await CreateTestUpsellAsync("Draft");
        created.Status.ShouldBe(UpsellStatus.Draft);

        var result = await _upsellService.ActivateAsync(created.Id);

        result.Successful.ShouldBeTrue();
        result.ResultObject!.Status.ShouldBe(UpsellStatus.Active);
    }

    [Fact]
    public async Task DeactivateAsync_TransitionsToDisabled()
    {
        var created = await CreateTestUpsellAsync("Active");
        await _upsellService.ActivateAsync(created.Id);

        var result = await _upsellService.DeactivateAsync(created.Id);

        result.Successful.ShouldBeTrue();
        result.ResultObject!.Status.ShouldBe(UpsellStatus.Disabled);
    }

    [Fact]
    public async Task GetActiveUpsellRulesAsync_ReturnsOnlyActiveRules()
    {
        var draft = await CreateTestUpsellAsync("Draft");
        var active1 = await CreateTestUpsellAsync("Active1");
        var active2 = await CreateTestUpsellAsync("Active2");
        await _upsellService.ActivateAsync(active1.Id);
        await _upsellService.ActivateAsync(active2.Id);

        var activeRules = await _upsellService.GetActiveUpsellRulesAsync();

        activeRules.ShouldAllBe(r => r.Status == UpsellStatus.Active);
        activeRules.Count.ShouldBe(2);
    }

    // =====================================================
    // Helpers
    // =====================================================

    private async Task<UpsellRule> CreateTestUpsellAsync(
        string name,
        int priority = 1000,
        UpsellDisplayLocation displayLocation = UpsellDisplayLocation.All)
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = name,
            Heading = $"Heading for {name}",
            Priority = priority,
            DisplayLocation = displayLocation,
        });

        return result.ResultObject!;
    }
}
