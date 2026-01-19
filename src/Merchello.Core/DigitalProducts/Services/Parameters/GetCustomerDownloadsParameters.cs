namespace Merchello.Core.DigitalProducts.Services.Parameters;

/// <summary>
/// Parameters for retrieving a customer's download links.
/// </summary>
public class GetCustomerDownloadsParameters
{
    /// <summary>
    /// The customer ID to get downloads for.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// Whether to include expired links in the results.
    /// Default: false (only active links returned).
    /// </summary>
    public bool IncludeExpired { get; init; } = false;
}
