namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Result from validating tax provider configuration (e.g., testing API credentials).
/// </summary>
public class TaxProviderValidationResult
{
    /// <summary>
    /// Whether validation succeeded.
    /// </summary>
    public bool IsValid { get; init; }

    /// <summary>
    /// Error message if validation failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Additional details from the provider (e.g., account info, remaining quota).
    /// </summary>
    public Dictionary<string, string>? Details { get; init; }

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    public static TaxProviderValidationResult Valid(Dictionary<string, string>? details = null) => new()
    {
        IsValid = true,
        Details = details
    };

    /// <summary>
    /// Creates a failed validation result.
    /// </summary>
    public static TaxProviderValidationResult Invalid(string errorMessage) => new()
    {
        IsValid = false,
        ErrorMessage = errorMessage
    };
}
