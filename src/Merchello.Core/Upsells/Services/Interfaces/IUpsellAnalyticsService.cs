using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Services.Parameters;

namespace Merchello.Core.Upsells.Services.Interfaces;

/// <summary>
/// Service for recording and querying upsell analytics events.
/// </summary>
public interface IUpsellAnalyticsService
{
    // Event Recording
    Task RecordImpressionAsync(RecordUpsellEventParameters parameters, CancellationToken ct = default);
    Task RecordClickAsync(RecordUpsellEventParameters parameters, CancellationToken ct = default);
    Task RecordConversionAsync(RecordUpsellConversionParameters parameters, CancellationToken ct = default);

    // Reporting
    Task<UpsellPerformanceDto?> GetPerformanceAsync(GetUpsellPerformanceParameters parameters, CancellationToken ct = default);
    Task<List<UpsellSummaryDto>> GetSummaryAsync(UpsellReportParameters parameters, CancellationToken ct = default);
    Task<UpsellDashboardDto> GetDashboardAsync(UpsellDashboardParameters parameters, CancellationToken ct = default);
}
