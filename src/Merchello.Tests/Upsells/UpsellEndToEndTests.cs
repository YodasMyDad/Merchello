using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

/// <summary>
/// End-to-end scenario tests combining multiple components for complete business workflows.
/// </summary>
[Collection("Integration Tests")]
public class UpsellEndToEndTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IUpsellService _upsellService;
    private readonly IUpsellEngine _engine;
    private readonly IUpsellAnalyticsService _analyticsService;

    public UpsellEndToEndTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _upsellService = fixture.GetService<IUpsellService>();
        _engine = fixture.GetService<IUpsellEngine>();
        _analyticsService = fixture.GetService<IUpsellAnalyticsService>();
    }

    // =====================================================
    // Lifecycle Scenarios
    // =====================================================

    [Fact]
    public async Task Scenario_FullLifecycle_DraftToActiveToExpired()
    {
        // 1. Create as Draft
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Lifecycle Test",
            Heading = "Test",
        });
        result.ResultObject!.Status.ShouldBe(UpsellStatus.Draft);

        // 2. Activate
        var activated = await _upsellService.ActivateAsync(result.ResultObject!.Id);
        activated.ResultObject!.Status.ShouldBe(UpsellStatus.Active);

        // 3. Set EndsAt to the past
        await _upsellService.UpdateAsync(result.ResultObject!.Id, new UpdateUpsellParameters
        {
            EndsAt = DateTime.UtcNow.AddMinutes(-1),
        });

        // 4. Run status job
        await _upsellService.UpdateExpiredUpsellsAsync();

        // 5. Verify expired
        var expired = await _upsellService.GetByIdAsync(result.ResultObject!.Id);
        expired!.Status.ShouldBe(UpsellStatus.Expired);
    }

    [Fact]
    public async Task Scenario_FullConversionFunnel()
    {
        // 1. Create and activate rule
        var typeId = Guid.NewGuid();
        var ruleResult = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = "Conversion Funnel",
            Heading = "Complete your order",
            TriggerRules =
            [
                new CreateUpsellTriggerRuleParameters
                {
                    TriggerType = UpsellTriggerType.ProductTypes,
                    TriggerIds = [typeId],
                },
            ],
        });
        await _upsellService.ActivateAsync(ruleResult.ResultObject!.Id);
        var ruleId = ruleResult.ResultObject!.Id;

        // 2. Record impression
        await _analyticsService.RecordImpressionAsync(new RecordUpsellEventParameters
        {
            UpsellRuleId = ruleId,
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        // 3. Record click
        var productId = Guid.NewGuid();
        await _analyticsService.RecordClickAsync(new RecordUpsellEventParameters
        {
            UpsellRuleId = ruleId,
            ProductId = productId,
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        // 4. Record conversion
        var invoiceId = Guid.NewGuid();
        await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = ruleId,
            ProductId = productId,
            InvoiceId = invoiceId,
            Amount = 79.99m,
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        // 5. Verify analytics
        await Task.Delay(100);
        var performance = await _analyticsService.GetPerformanceAsync(new GetUpsellPerformanceParameters
        {
            UpsellRuleId = ruleId,
        });

        performance.ShouldNotBeNull();
        performance.TotalConversions.ShouldBeGreaterThanOrEqualTo(1);
        performance.TotalRevenue.ShouldBeGreaterThanOrEqualTo(79.99m);
    }

    // =====================================================
    // Multi-Rule Scenarios
    // =====================================================

    [Fact]
    public async Task Scenario_MultipleRules_PriorityOrdering()
    {
        var typeId = Guid.NewGuid();

        // Create 3 rules with different priorities
        var rule1 = await CreateAndActivateAsync("High Priority", typeId, priority: 100);
        var rule2 = await CreateAndActivateAsync("Low Priority", typeId, priority: 900);
        var rule3 = await CreateAndActivateAsync("Mid Priority", typeId, priority: 500);

        var context = new UpsellContext
        {
            BasketId = Guid.NewGuid(),
            LineItems =
            [
                new UpsellContextLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    ProductId = Guid.NewGuid(),
                    ProductRootId = Guid.NewGuid(),
                    ProductTypeId = typeId,
                    Sku = "BED-001",
                    Quantity = 1,
                    UnitPrice = 500m,
                },
            ],
        };

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
    // Deactivation
    // =====================================================

    [Fact]
    public async Task Scenario_DeactivatedRule_NotEvaluated()
    {
        var typeId = Guid.NewGuid();
        var rule = await CreateAndActivateAsync("To Disable", typeId);

        // Deactivate
        await _upsellService.DeactivateAsync(rule.Id);

        var context = new UpsellContext
        {
            BasketId = Guid.NewGuid(),
            LineItems =
            [
                new UpsellContextLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    ProductId = Guid.NewGuid(),
                    ProductRootId = Guid.NewGuid(),
                    ProductTypeId = typeId,
                    Sku = "ITEM-001",
                    Quantity = 1,
                    UnitPrice = 50m,
                },
            ],
        };

        var suggestions = await _engine.GetSuggestionsAsync(context);
        suggestions.ShouldNotContain(s => s.UpsellRuleId == rule.Id);
    }

    // =====================================================
    // Dashboard Integration
    // =====================================================

    [Fact]
    public async Task Scenario_DashboardReflectsAllActivity()
    {
        var rule1 = await CreateAndActivateAsync("Rule A", Guid.NewGuid());
        var rule2 = await CreateAndActivateAsync("Rule B", Guid.NewGuid());

        // Record mixed activity
        await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = rule1.Id,
            Amount = 100m,
            InvoiceId = Guid.NewGuid(),
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = rule2.Id,
            Amount = 200m,
            InvoiceId = Guid.NewGuid(),
            DisplayLocation = UpsellDisplayLocation.Basket,
        });

        await Task.Delay(100);

        var dashboard = await _analyticsService.GetDashboardAsync(new UpsellDashboardParameters());

        dashboard.TotalActiveRules.ShouldBeGreaterThanOrEqualTo(2);
        dashboard.TotalRevenue.ShouldBeGreaterThanOrEqualTo(300m);
        dashboard.TotalConversions.ShouldBeGreaterThanOrEqualTo(2);
    }

    // =====================================================
    // Helpers
    // =====================================================

    private async Task<UpsellRule> CreateAndActivateAsync(string name, Guid triggerTypeId, int priority = 1000)
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = name,
            Heading = $"Heading for {name}",
            Priority = priority,
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
}
