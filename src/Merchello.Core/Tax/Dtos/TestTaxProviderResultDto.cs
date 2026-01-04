namespace Merchello.Core.Tax.Dtos;

/// <summary>
/// DTO for tax provider test/validation result.
/// </summary>
public class TestTaxProviderResultDto
{
    public bool IsSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
    public Dictionary<string, string>? Details { get; set; }
}
