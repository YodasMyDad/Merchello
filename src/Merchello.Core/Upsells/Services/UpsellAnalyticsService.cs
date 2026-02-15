using System.Collections.Concurrent;
using Merchello.Core.Data;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Analytics service with buffered writes for high-volume impression events.
/// Clicks are buffered. Conversions are written directly.
/// </summary>
public class UpsellAnalyticsService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<UpsellAnalyticsService> logger) : IUpsellAnalyticsService, IDisposable
{
    private readonly ConcurrentQueue<UpsellEvent> _eventBuffer = new();
    private readonly SemaphoreSlim _flushLock = new(1, 1);
    private Timer? _flushTimer;
    private const int FlushIntervalMs = 5000;
    private const int MaxBufferSize = 500;
    private bool _disposed;
    private int _bufferedCount;

    // Start the flush timer on first use
    private int _timerStarted;

    private void EnsureTimerStarted()
    {
        if (Interlocked.CompareExchange(ref _timerStarted, 1, 0) == 0)
        {
            using (ExecutionContext.SuppressFlow())
            {
                _flushTimer = new Timer(
                    static state => ((UpsellAnalyticsService)state!).OnFlushTimerTick(),
                    this,
                    FlushIntervalMs,
                    FlushIntervalMs);
            }
        }
    }

    private void OnFlushTimerTick()
    {
        try
        {
            TryFlushAsync(CancellationToken.None).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Timer-triggered upsell analytics flush failed");
        }
    }

    // =====================================================
    // Event Recording
    // =====================================================

    /// <inheritdoc />
    public Task RecordImpressionAsync(RecordUpsellEventParameters parameters, CancellationToken ct = default)
    {
        return RecordBufferedEventAsync(parameters, UpsellEventType.Impression, ct);
    }

    /// <inheritdoc />
    public Task RecordClickAsync(RecordUpsellEventParameters parameters, CancellationToken ct = default)
    {
        return RecordBufferedEventAsync(parameters, UpsellEventType.Click, ct);
    }

    /// <inheritdoc />
    public async Task RecordConversionAsync(RecordUpsellConversionParameters parameters, CancellationToken ct = default)
    {
        var evt = new UpsellEvent
        {
            Id = GuidExtensions.NewSequentialGuid,
            UpsellRuleId = parameters.UpsellRuleId,
            EventType = UpsellEventType.Conversion,
            ProductId = parameters.ProductId,
            CustomerId = parameters.CustomerId,
            InvoiceId = parameters.InvoiceId,
            Amount = parameters.Amount,
            DisplayLocation = parameters.DisplayLocation,
            DateCreated = DateTime.UtcNow
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.UpsellEvents.Add(evt);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();
    }

    private Task RecordBufferedEventAsync(
        RecordUpsellEventParameters parameters,
        UpsellEventType eventType,
        CancellationToken ct)
    {
        EnsureTimerStarted();
        _eventBuffer.Enqueue(CreateEvent(parameters, eventType));
        var bufferedCount = Interlocked.Increment(ref _bufferedCount);

        if (bufferedCount >= MaxBufferSize)
            return FlushAsync(ct);

        return Task.CompletedTask;
    }

    // =====================================================
    // Reporting
    // =====================================================

    /// <inheritdoc />
    public async Task<UpsellPerformanceDto?> GetPerformanceAsync(GetUpsellPerformanceParameters parameters, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var rule = await db.UpsellRules
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == parameters.UpsellRuleId, ct);

            if (rule == null)
                return null;

            var query = db.UpsellEvents
                .AsNoTracking()
                .Where(e => e.UpsellRuleId == parameters.UpsellRuleId);

            if (parameters.StartDate.HasValue)
                query = query.Where(e => e.DateCreated >= parameters.StartDate.Value);
            if (parameters.EndDate.HasValue)
                query = query.Where(e => e.DateCreated <= parameters.EndDate.Value);

            var events = await query.ToListAsync(ct);

            var impressions = events.Count(e => e.EventType == UpsellEventType.Impression);
            var clicks = events.Count(e => e.EventType == UpsellEventType.Click);
            var conversions = events.Count(e => e.EventType == UpsellEventType.Conversion);
            var revenue = events.Where(e => e.EventType == UpsellEventType.Conversion)
                .Sum(e => e.Amount ?? 0);

            var dto = new UpsellPerformanceDto
            {
                UpsellRuleId = rule.Id,
                Name = rule.Name,
                TotalImpressions = impressions,
                TotalClicks = clicks,
                TotalConversions = conversions,
                ClickThroughRate = impressions > 0 ? Math.Round((decimal)clicks / impressions * 100, 2) : 0,
                ConversionRate = clicks > 0 ? Math.Round((decimal)conversions / clicks * 100, 2) : 0,
                TotalRevenue = revenue,
                AverageOrderValue = conversions > 0 ? Math.Round(revenue / conversions, 2) : 0,
                UniqueCustomersCount = events
                    .Where(e => e.CustomerId.HasValue)
                    .Select(e => e.CustomerId!.Value)
                    .Distinct()
                    .Count(),
                FirstImpression = events
                    .Where(e => e.EventType == UpsellEventType.Impression)
                    .MinBy(e => e.DateCreated)?.DateCreated,
                LastConversion = events
                    .Where(e => e.EventType == UpsellEventType.Conversion)
                    .MaxBy(e => e.DateCreated)?.DateCreated,
                EventsByDate = events
                    .GroupBy(e => DateOnly.FromDateTime(e.DateCreated))
                    .OrderBy(g => g.Key)
                    .Select(g => new UpsellEventsByDateDto
                    {
                        Date = g.Key,
                        Impressions = g.Count(e => e.EventType == UpsellEventType.Impression),
                        Clicks = g.Count(e => e.EventType == UpsellEventType.Click),
                        Conversions = g.Count(e => e.EventType == UpsellEventType.Conversion),
                        Revenue = g.Where(e => e.EventType == UpsellEventType.Conversion)
                            .Sum(e => e.Amount ?? 0)
                    })
                    .ToList()
            };

            return dto;
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<UpsellSummaryDto>> GetSummaryAsync(UpsellReportParameters parameters, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.UpsellEvents.AsNoTracking().AsQueryable();

            if (parameters.StartDate.HasValue)
                query = query.Where(e => e.DateCreated >= parameters.StartDate.Value);
            if (parameters.EndDate.HasValue)
                query = query.Where(e => e.DateCreated <= parameters.EndDate.Value);

            // Count aggregations run in SQL; Sum on decimal fails in SQLite (ef_sum),
            // so revenue is computed in memory from the small conversion subset
            var countsByRule = await query
                .GroupBy(e => e.UpsellRuleId)
                .Select(g => new
                {
                    UpsellRuleId = g.Key,
                    Impressions = g.Count(e => e.EventType == UpsellEventType.Impression),
                    Clicks = g.Count(e => e.EventType == UpsellEventType.Click),
                    Conversions = g.Count(e => e.EventType == UpsellEventType.Conversion),
                })
                .ToListAsync(ct);

            var conversions = await query
                .Where(e => e.EventType == UpsellEventType.Conversion)
                .Select(e => new { e.UpsellRuleId, e.Amount })
                .ToListAsync(ct);

            var revenueLookup = conversions
                .GroupBy(e => e.UpsellRuleId)
                .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount ?? 0));

            var eventsByRule = countsByRule
                .Select(x => new
                {
                    x.UpsellRuleId,
                    x.Impressions,
                    x.Clicks,
                    x.Conversions,
                    Revenue = revenueLookup.GetValueOrDefault(x.UpsellRuleId, 0m)
                })
                .OrderByDescending(x => x.Revenue)
                .Take(parameters.TopN ?? 20)
                .ToList();

            var ruleIds = eventsByRule.Select(x => x.UpsellRuleId).ToList();
            var rules = await db.UpsellRules
                .AsNoTracking()
                .Where(r => ruleIds.Contains(r.Id))
                .ToDictionaryAsync(r => r.Id, ct);

            return eventsByRule.Select(x =>
            {
                rules.TryGetValue(x.UpsellRuleId, out var rule);
                return new UpsellSummaryDto
                {
                    Id = x.UpsellRuleId,
                    Name = rule?.Name ?? "Unknown",
                    Status = rule?.Status ?? UpsellStatus.Draft,
                    Impressions = x.Impressions,
                    Clicks = x.Clicks,
                    Conversions = x.Conversions,
                    Revenue = x.Revenue,
                    ClickThroughRate = x.Impressions > 0 ? Math.Round((decimal)x.Clicks / x.Impressions * 100, 2) : 0,
                    ConversionRate = x.Clicks > 0 ? Math.Round((decimal)x.Conversions / x.Clicks * 100, 2) : 0
                };
            }).ToList();
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<UpsellDashboardDto> GetDashboardAsync(UpsellDashboardParameters parameters, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var activeRuleCount = await db.UpsellRules
                .AsNoTracking()
                .CountAsync(r => r.Status == UpsellStatus.Active, ct);

            var query = db.UpsellEvents.AsNoTracking().AsQueryable();

            if (parameters.StartDate.HasValue)
                query = query.Where(e => e.DateCreated >= parameters.StartDate.Value);
            if (parameters.EndDate.HasValue)
                query = query.Where(e => e.DateCreated <= parameters.EndDate.Value);

            var events = await query.ToListAsync(ct);

            var totalImpressions = events.Count(e => e.EventType == UpsellEventType.Impression);
            var totalClicks = events.Count(e => e.EventType == UpsellEventType.Click);
            var totalConversions = events.Count(e => e.EventType == UpsellEventType.Conversion);
            var totalRevenue = events
                .Where(e => e.EventType == UpsellEventType.Conversion)
                .Sum(e => e.Amount ?? 0);

            // Top performers
            var topPerformers = await GetSummaryAsync(new UpsellReportParameters
            {
                StartDate = parameters.StartDate,
                EndDate = parameters.EndDate,
                TopN = 5
            }, ct);

            // Trend by date
            var trendByDate = events
                .GroupBy(e => DateOnly.FromDateTime(e.DateCreated))
                .OrderBy(g => g.Key)
                .Select(g => new UpsellEventsByDateDto
                {
                    Date = g.Key,
                    Impressions = g.Count(e => e.EventType == UpsellEventType.Impression),
                    Clicks = g.Count(e => e.EventType == UpsellEventType.Click),
                    Conversions = g.Count(e => e.EventType == UpsellEventType.Conversion),
                    Revenue = g.Where(e => e.EventType == UpsellEventType.Conversion)
                        .Sum(e => e.Amount ?? 0)
                })
                .ToList();

            return new UpsellDashboardDto
            {
                TotalActiveRules = activeRuleCount,
                TotalImpressions = totalImpressions,
                TotalClicks = totalClicks,
                TotalConversions = totalConversions,
                OverallClickThroughRate = totalImpressions > 0
                    ? Math.Round((decimal)totalClicks / totalImpressions * 100, 2)
                    : 0,
                OverallConversionRate = totalClicks > 0
                    ? Math.Round((decimal)totalConversions / totalClicks * 100, 2)
                    : 0,
                TotalRevenue = totalRevenue,
                TopPerformers = topPerformers,
                TrendByDate = trendByDate
            };
        });

        scope.Complete();
        return result;
    }

    // =====================================================
    // Buffer Management
    // =====================================================

    private static UpsellEvent CreateEvent(RecordUpsellEventParameters parameters, UpsellEventType eventType) =>
        new()
        {
            Id = GuidExtensions.NewSequentialGuid,
            UpsellRuleId = parameters.UpsellRuleId,
            EventType = eventType,
            ProductId = parameters.ProductId,
            BasketId = parameters.BasketId,
            CustomerId = parameters.CustomerId,
            DisplayLocation = parameters.DisplayLocation,
            DateCreated = DateTime.UtcNow
        };

    private async Task FlushAsync(CancellationToken ct)
        => await FlushCoreAsync(ct, waitForLock: true);

    private async Task TryFlushAsync(CancellationToken ct)
        => await FlushCoreAsync(ct, waitForLock: false);

    private async Task FlushRemainingAsync(CancellationToken ct)
        => await FlushCoreAsync(ct, waitForLock: true);

    private async Task FlushCoreAsync(CancellationToken ct, bool waitForLock)
    {
        var lockTaken = false;
        if (waitForLock)
        {
            await _flushLock.WaitAsync(ct);
            lockTaken = true;
        }
        else
        {
            lockTaken = await _flushLock.WaitAsync(0, ct);
        }

        if (!lockTaken)
            return;

        try
        {
            while (true)
            {
                var events = DequeueBatch();
                if (events.Count == 0)
                    return;

                try
                {
                    using var scope = efCoreScopeProvider.CreateScope();
                    await scope.ExecuteWithContextAsync<bool>(async db =>
                    {
                        db.UpsellEvents.AddRange(events);
                        await db.SaveChangesAsync(ct);
                        return true;
                    });
                    scope.Complete();
                }
                catch (Exception ex)
                {
                    Requeue(events);
                    logger.LogError(ex, "Failed to flush {Count} upsell analytics events", events.Count);
                    return;
                }
            }
        }
        finally
        {
            _flushLock.Release();
        }
    }

    private List<UpsellEvent> DequeueBatch()
    {
        List<UpsellEvent> events = [];
        while (_eventBuffer.TryDequeue(out var evt) && events.Count < MaxBufferSize)
        {
            Interlocked.Decrement(ref _bufferedCount);
            events.Add(evt);
        }

        return events;
    }

    private void Requeue(IEnumerable<UpsellEvent> events)
    {
        foreach (var evt in events)
        {
            _eventBuffer.Enqueue(evt);
            Interlocked.Increment(ref _bufferedCount);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _flushTimer?.Dispose();

        // Flush remaining events synchronously on shutdown
        if (!_eventBuffer.IsEmpty)
        {
            try
            {
                FlushRemainingAsync(CancellationToken.None).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to flush remaining upsell events on dispose");
            }
        }

        _flushLock.Dispose();
    }
}
