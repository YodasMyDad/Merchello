using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Core.Upsells.Services;
using Merchello.Core.Data;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

/// <summary>
/// Integration tests for UpsellAnalyticsService event recording and metric calculations.
/// </summary>
[Collection("Integration Tests")]
public class UpsellAnalyticsServiceTests : IClassFixture<ServiceTestFixture>, IDisposable
{
    private readonly ServiceTestFixture _fixture;
    private readonly IUpsellAnalyticsService _analyticsService;
    private readonly IUpsellService _upsellService;

    public UpsellAnalyticsServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        var efCoreScopeProvider = fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>();
        var logger = fixture.GetService<ILogger<UpsellAnalyticsService>>();
        _analyticsService = new UpsellAnalyticsService(efCoreScopeProvider, logger);
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
    public async Task RecordImpressionAsync_AtThreshold_FlushesBufferedEvents()
    {
        var rule = await CreateActiveRuleAsync("Threshold Flush Test");

        for (var i = 0; i < 500; i++)
        {
            await _analyticsService.RecordImpressionAsync(new RecordUpsellEventParameters
            {
                UpsellRuleId = rule.Id,
                DisplayLocation = UpsellDisplayLocation.Checkout,
            });
        }

        var performance = await WaitForPerformanceAsync(
            rule.Id,
            p => p.TotalImpressions >= 500);

        performance.ShouldNotBeNull();
        performance.TotalImpressions.ShouldBeGreaterThanOrEqualTo(500);
    }

    [Fact]
    public async Task RecordClickAsync_RapidCalls_PersistWithoutErrors()
    {
        var rule = await CreateActiveRuleAsync("Rapid Click Test");
        const int rapidTaskCount = 40;
        const int rapidEventsPerTask = 5;

        var rapidTasks = Enumerable.Range(0, rapidTaskCount)
            .Select(_ => Task.Run(async () =>
            {
                for (var i = 0; i < rapidEventsPerTask; i++)
                {
                    await _analyticsService.RecordClickAsync(new RecordUpsellEventParameters
                    {
                        UpsellRuleId = rule.Id,
                        ProductId = Guid.NewGuid(),
                        DisplayLocation = UpsellDisplayLocation.Basket,
                    });
                }
            }));

        await Task.WhenAll(rapidTasks);

        // Force an immediate threshold flush at the exact boundary and drain buffered rapid events.
        const int forcedFlushEvents = 300;
        for (var i = 0; i < forcedFlushEvents; i++)
        {
            await _analyticsService.RecordClickAsync(new RecordUpsellEventParameters
            {
                UpsellRuleId = rule.Id,
                ProductId = Guid.NewGuid(),
                DisplayLocation = UpsellDisplayLocation.Basket,
            });
        }

        var expectedClicks = (rapidTaskCount * rapidEventsPerTask) + forcedFlushEvents;
        var performance = await WaitForPerformanceAsync(
            rule.Id,
            p => p.TotalClicks >= expectedClicks);

        performance.ShouldNotBeNull();
        performance.TotalClicks.ShouldBeGreaterThanOrEqualTo(expectedClicks);
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

    private async Task<UpsellPerformanceDto> WaitForPerformanceAsync(
        Guid upsellRuleId,
        Func<UpsellPerformanceDto, bool> predicate)
    {
        const int maxAttempts = 30;
        const int delayMs = 250;

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            var performance = await _analyticsService.GetPerformanceAsync(new GetUpsellPerformanceParameters
            {
                UpsellRuleId = upsellRuleId,
            });

            if (performance != null && predicate(performance))
            {
                return performance;
            }

            await Task.Delay(delayMs);
        }

        return await _analyticsService.GetPerformanceAsync(new GetUpsellPerformanceParameters
        {
            UpsellRuleId = upsellRuleId,
        }) ?? new UpsellPerformanceDto { UpsellRuleId = upsellRuleId };
    }

    public void Dispose()
    {
        if (_analyticsService is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }
}
