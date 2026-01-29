namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for querying aggregated upsell report data.
/// </summary>
public class UpsellReportParameters
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? TopN { get; set; }
}
