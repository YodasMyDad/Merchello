namespace Merchello.Core.Tax.Dtos;

/// <summary>
/// DTO for saving tax provider configuration.
/// </summary>
public class SaveTaxProviderSettingsDto
{
    public Dictionary<string, string> Configuration { get; set; } = [];
}
