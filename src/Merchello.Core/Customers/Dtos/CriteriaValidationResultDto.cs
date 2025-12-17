namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Result of criteria validation.
/// </summary>
public class CriteriaValidationResultDto
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = [];
    public List<string> Warnings { get; set; } = [];
}
