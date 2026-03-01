namespace Merchello.Core.Reporting.Services.Parameters;

/// <summary>
/// Determines how the analytics comparison period is calculated.
/// </summary>
public enum CompareMode
{
    /// <summary>
    /// Compare against the immediately preceding period of equal length (default).
    /// </summary>
    Previous,

    /// <summary>
    /// Compare against the same dates in the previous year.
    /// </summary>
    PreviousYear,

    /// <summary>
    /// Compare against a custom date range provided by the caller.
    /// </summary>
    Custom,

    /// <summary>
    /// Disable comparison entirely. All comparison fields return zero/null.
    /// </summary>
    None
}
