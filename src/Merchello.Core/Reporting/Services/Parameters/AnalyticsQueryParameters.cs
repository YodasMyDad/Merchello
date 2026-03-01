namespace Merchello.Core.Reporting.Services.Parameters;

/// <summary>
/// Query parameters for analytics endpoints supporting optional comparison configuration.
/// </summary>
public class AnalyticsQueryParameters
{
    /// <summary>
    /// Start date of the primary period (inclusive).
    /// </summary>
    public required DateTime StartDate { get; init; }

    /// <summary>
    /// End date of the primary period (inclusive).
    /// </summary>
    public required DateTime EndDate { get; init; }

    /// <summary>
    /// How the comparison period is determined.
    /// Defaults to <see cref="CompareMode.Previous"/>.
    /// </summary>
    public CompareMode CompareMode { get; init; } = CompareMode.Previous;

    /// <summary>
    /// Start of custom comparison period. Required when <see cref="CompareMode"/> is <see cref="Parameters.CompareMode.Custom"/>.
    /// </summary>
    public DateTime? ComparisonStartDate { get; init; }

    /// <summary>
    /// End of custom comparison period. Required when <see cref="CompareMode"/> is <see cref="Parameters.CompareMode.Custom"/>.
    /// </summary>
    public DateTime? ComparisonEndDate { get; init; }
}
