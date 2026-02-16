namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Result of fulfilment test order submission.
/// </summary>
public class TestFulfilmentOrderSubmissionResultDto
{
    /// <summary>
    /// Whether submission succeeded.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Provider reference returned by fulfilment provider.
    /// </summary>
    public string? ProviderReference { get; set; }

    /// <summary>
    /// Optional provider status value.
    /// </summary>
    public string? ProviderStatus { get; set; }

    /// <summary>
    /// Error message when submission fails.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
