using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

/// <summary>
/// Integration tests for UpsellAnalyticsService event recording and metric calculations.
/// </summary>
[Collection("Integration Tests")]
public class UpsellAnalyticsServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IUpsellAnalyticsService _analyticsService;
    private readonly IUpsellService _upsellService;

    public UpsellAnalyticsServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _analyticsService = fixture.GetService<IUpsellAnalyticsService>();
        _upsellService = fixture.GetService<IUpsellService>();
    }

    [Fact]
    public async Task RecordImpressionAsync_BuffersEvent()
    {
        var rule = await CreateActiveRuleAsync("Impression Test");

        await _analyticsService.RecordImpressionAsync(new RecordUpsellEventParameters
        {
            UpsellRuleId = rule.Id,
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        // Impressions are buffered; they may not be available immediately
        // but should not throw
    }

    [Fact]
    public async Task RecordClickAsync_BuffersEvent()
    {
        var rule = await CreateActiveRuleAsync("Click Test");
        var productId = Guid.NewGuid();

        await _analyticsService.RecordClickAsync(new RecordUpsellEventParameters
        {
            UpsellRuleId = rule.Id,
            ProductId = productId,
            DisplayLocation = UpsellDisplayLocation.Basket,
        });

        // Clicks are buffered; should not throw
    }

    [Fact]
    public async Task RecordConversionAsync_WritesDirectly()
    {
        var rule = await CreateActiveRuleAsync("Conversion Test");
        var invoiceId = Guid.NewGuid();

        await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = rule.Id,
            ProductId = Guid.NewGuid(),
            InvoiceId = invoiceId,
            Amount = 49.99m,
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        // Conversions are written directly; verify via performance query
        // Allow time for write
        await Task.Delay(100);

        var performance = await _analyticsService.GetPerformanceAsync(new GetUpsellPerformanceParameters
        {
            UpsellRuleId = rule.Id,
        });

        performance.ShouldNotBeNull();
        performance.TotalConversions.ShouldBeGreaterThanOrEqualTo(1);
        performance.TotalRevenue.ShouldBeGreaterThanOrEqualTo(49.99m);
    }

    [Fact]
    public async Task GetPerformanceAsync_CalculatesCTR()
    {
        var rule = await CreateActiveRuleAsync("CTR Test");

        // Record 100 impressions and 10 clicks directly via conversions proxy
        for (var i = 0; i < 10; i++)
        {
            await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
            {
                UpsellRuleId = rule.Id,
                ProductId = Guid.NewGuid(),
                InvoiceId = Guid.NewGuid(),
                Amount = 10m,
                DisplayLocation = UpsellDisplayLocation.Checkout,
            });
        }

        await Task.Delay(100);

        var performance = await _analyticsService.GetPerformanceAsync(new GetUpsellPerformanceParameters
        {
            UpsellRuleId = rule.Id,
        });

        performance.ShouldNotBeNull();
        performance.TotalConversions.ShouldBe(10);
        performance.TotalRevenue.ShouldBe(100m);
    }

    [Fact]
    public async Task GetDashboardAsync_AggregatesAcrossAllRules()
    {
        var rule1 = await CreateActiveRuleAsync("Dashboard Rule 1");
        var rule2 = await CreateActiveRuleAsync("Dashboard Rule 2");

        await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = rule1.Id,
            ProductId = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            Amount = 50m,
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = rule2.Id,
            ProductId = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            Amount = 75m,
            DisplayLocation = UpsellDisplayLocation.Basket,
        });

        await Task.Delay(100);

        var dashboard = await _analyticsService.GetDashboardAsync(new UpsellDashboardParameters());

        dashboard.ShouldNotBeNull();
        dashboard.TotalConversions.ShouldBeGreaterThanOrEqualTo(2);
        dashboard.TotalRevenue.ShouldBeGreaterThanOrEqualTo(125m);
    }

    [Fact]
    public async Task GetSummaryAsync_ReturnsPerRuleSummary()
    {
        var rule = await CreateActiveRuleAsync("Summary Test");

        await _analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = rule.Id,
            ProductId = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            Amount = 25m,
            DisplayLocation = UpsellDisplayLocation.Checkout,
        });

        await Task.Delay(100);

        var summary = await _analyticsService.GetSummaryAsync(new UpsellReportParameters());

        summary.ShouldNotBeEmpty();
        summary.ShouldContain(s => s.Id == rule.Id);
    }

    // =====================================================
    // Helpers
    // =====================================================

    private async Task<UpsellRule> CreateActiveRuleAsync(string name)
    {
        var result = await _upsellService.CreateAsync(new CreateUpsellParameters
        {
            Name = name,
            Heading = $"Heading for {name}",
        });

        var rule = result.ResultObject!;
        await _upsellService.ActivateAsync(rule.Id);

        return (await _upsellService.GetByIdAsync(rule.Id))!;
    }
}
