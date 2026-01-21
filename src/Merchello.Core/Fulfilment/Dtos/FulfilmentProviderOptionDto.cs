namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Simple DTO for fulfilment provider dropdown options.
/// </summary>
public class FulfilmentProviderOptionDto
{
    public Guid ConfigurationId { get; set; }
    public required string DisplayName { get; set; }
    public required string ProviderKey { get; set; }
    public bool IsEnabled { get; set; }
}
