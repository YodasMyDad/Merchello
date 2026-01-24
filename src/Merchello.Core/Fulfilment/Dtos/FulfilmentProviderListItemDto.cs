using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;

namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Fulfilment provider list item for display in the backoffice.
/// </summary>
public class FulfilmentProviderListItemDto
{
    public required string Key { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? IconSvg { get; set; }
    public string? Description { get; set; }
    public bool IsEnabled { get; set; }
    public Guid? ConfigurationId { get; set; }
    public int SortOrder { get; set; }
    public InventorySyncMode InventorySyncMode { get; set; }
    public string InventorySyncModeLabel { get; set; } = string.Empty;
    public FulfilmentApiStyle ApiStyle { get; set; }
    public string ApiStyleLabel { get; set; } = string.Empty;

    // Capabilities summary
    public bool SupportsOrderSubmission { get; set; }
    public bool SupportsWebhooks { get; set; }
    public bool SupportsProductSync { get; set; }
    public bool SupportsInventorySync { get; set; }
}
