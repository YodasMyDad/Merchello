using Merchello.Core.Fulfilment.Models;

namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Persisted fulfilment provider configuration with current settings values.
/// </summary>
public class FulfilmentProviderConfigurationDto
{
    public Guid Id { get; set; }
    public required string ProviderKey { get; set; }
    public required string DisplayName { get; set; }
    public bool IsEnabled { get; set; }
    public InventorySyncMode InventorySyncMode { get; set; }
    public Dictionary<string, string>? Configuration { get; set; }
    public int SortOrder { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }

    /// <summary>
    /// Provider metadata
    /// </summary>
    public FulfilmentProviderDto? Provider { get; set; }
}
