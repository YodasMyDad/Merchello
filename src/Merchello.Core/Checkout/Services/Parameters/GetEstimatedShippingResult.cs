namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Result of estimated shipping calculation.
/// Contains raw business data without formatting.
/// </summary>
public class GetEstimatedShippingResult
{
    /// <summary>
    /// Whether the estimation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Estimated shipping cost in store currency.
    /// </summary>
    public decimal EstimatedShipping { get; set; }

    /// <summary>
    /// Number of shipping groups.
    /// </summary>
    public int GroupCount { get; set; }

    /// <summary>
    /// Error message if estimation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Creates a failed result with an error message.
    /// </summary>
    public static GetEstimatedShippingResult Fail(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };

    /// <summary>
    /// Creates a successful result.
    /// </summary>
    public static GetEstimatedShippingResult Ok(decimal estimatedShipping, int groupCount) => new()
    {
        Success = true,
        EstimatedShipping = estimatedShipping,
        GroupCount = groupCount
    };
}
