namespace Merchello.Core.Customers.Models;

/// <summary>
/// Result of validating criteria rules.
/// </summary>
public class CriteriaValidationResult
{
    /// <summary>
    /// Whether the criteria are valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Validation error messages.
    /// </summary>
    public List<string> Errors { get; set; } = [];

    /// <summary>
    /// Validation warning messages.
    /// </summary>
    public List<string> Warnings { get; set; } = [];
}
